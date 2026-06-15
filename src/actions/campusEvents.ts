"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";
import { toAcademicEventType, parseCommittee, type CampusEventType, type ParticipantRole } from "@/lib/campusEvents";

type Result<T> = { success: true; data: T } | { success: false; error: string };

// ── Types ─────────────────────────────────────────────────────────────────────

export type CampusEvent = {
  id: string;
  institution_id: string;
  academic_year_id: string | null;
  title: string;
  event_type: CampusEventType;
  event_date: string;
  venue: string | null;
  organizing_committee: Array<{ staff_id: string; name: string; role: string }>;
  budget_allocated: number | null;
  actual_spend: number;
  attendees_count: number | null;
  photo_urls: string[];
  description: string | null;
  created_at: string;
  participant_count?: number;
};

export type EventParticipant = {
  id: string;
  event_id: string;
  student_id: string;
  role: ParticipantRole;
  created_at: string;
  student?: { id: string; full_name: string; roll_no: string | null; department?: { name: string } | null } | null;
};

export type StaffOption = {
  id: string;
  full_name: string;
  title: string | null;
  department?: { name: string } | null;
};

export type StudentSearchResult = {
  id: string;
  full_name: string;
  roll_no: string | null;
};

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getCampusEvents(institutionId: string): Promise<Result<CampusEvent[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("campus_events")
      .select("*")
      .eq("institution_id", institutionId)
      .order("event_date", { ascending: false });

    if (error) return { success: false, error: error.message };

    const events = (data ?? []) as CampusEvent[];

    // Enrich with participant counts
    const ids = events.map((e) => e.id);
    if (ids.length === 0) return { success: true, data: [] };

    const { data: participants } = await supabase
      .from("event_participants")
      .select("event_id")
      .in("event_id", ids);

    const countMap: Record<string, number> = {};
    for (const p of participants ?? []) {
      countMap[p.event_id] = (countMap[p.event_id] ?? 0) + 1;
    }

    return {
      success: true,
      data: events.map((e) => ({
        ...e,
        organizing_committee: parseCommittee(e.organizing_committee),
        photo_urls: Array.isArray(e.photo_urls) ? e.photo_urls : [],
        participant_count: countMap[e.id] ?? 0,
      })),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load events." };
  }
}

export async function getCampusEvent(
  eventId: string,
  institutionId: string
): Promise<Result<CampusEvent | null>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("campus_events")
      .select("*")
      .eq("id", eventId)
      .eq("institution_id", institutionId)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!data) return { success: true, data: null };

    const { data: participants } = await supabase
      .from("event_participants")
      .select("event_id")
      .eq("event_id", eventId);

    return {
      success: true,
      data: {
        ...(data as CampusEvent),
        organizing_committee: parseCommittee(data.organizing_committee),
        photo_urls: Array.isArray(data.photo_urls) ? data.photo_urls : [],
        participant_count: participants?.length ?? 0,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load event." };
  }
}

export async function getEventParticipants(
  eventId: string
): Promise<Result<EventParticipant[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("event_participants")
      .select("*, student:students(id, full_name, roll_no, department:departments(name))")
      .eq("event_id", eventId)
      .order("created_at");

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as EventParticipant[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load participants." };
  }
}

export async function getStaffOptions(
  institutionId: string
): Promise<Result<StaffOption[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("staff")
      .select("id, full_name, title, department:departments(name)")
      .eq("institution_id", institutionId)
      .order("full_name");

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as StaffOption[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load staff." };
  }
}

export async function getAcademicYearOptions(
  institutionId: string
): Promise<Result<Array<{ id: string; label: string }>>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("academic_years")
      .select("id, label")
      .eq("institution_id", institutionId)
      .order("start_date", { ascending: false })
      .limit(5);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load years." };
  }
}

export async function searchStudentsForEvent(
  institutionId: string,
  query: string
): Promise<Result<StudentSearchResult[]>> {
  try {
    if (!query.trim()) return { success: true, data: [] };
    const supabase = createClient(await cookies());
    const q = `%${query.trim()}%`;
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, roll_no")
      .eq("institution_id", institutionId)
      .or(`full_name.ilike.${q},roll_no.ilike.${q}`)
      .limit(10);

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as StudentSearchResult[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Search failed." };
  }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createCampusEvent(payload: {
  institutionId: string;
  title: string;
  eventType: CampusEventType;
  eventDate: string;
  venue?: string;
  academicYearId?: string;
  budgetAllocated?: number;
  description?: string;
  organizingCommittee?: Array<{ staff_id: string; name: string; role: string }>;
}): Promise<Result<{ id: string }>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data, error } = await supabase
      .from("campus_events")
      .insert({
        institution_id: payload.institutionId,
        title: payload.title.trim(),
        event_type: payload.eventType,
        event_date: payload.eventDate,
        venue: payload.venue?.trim() || null,
        academic_year_id: payload.academicYearId || null,
        budget_allocated: payload.budgetAllocated || null,
        description: payload.description?.trim() || null,
        organizing_committee: payload.organizingCommittee ?? [],
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    // Auto-sync to academic_events calendar
    const academicType = toAcademicEventType(payload.eventType);
    await supabase.from("academic_events").insert({
      institution_id: payload.institutionId,
      academic_year_id: payload.academicYearId || null,
      title: payload.title.trim(),
      event_type: academicType,
      start_date: payload.eventDate,
      end_date: payload.eventDate,
      description: payload.description?.trim() || null,
      is_public: true,
    });

    await logAudit({
      institutionId: payload.institutionId,
      performedBy: user.id,
      tableName: "campus_events",
      recordId: data.id,
      action: "INSERT",
    });

    revalidatePath(`/institutions/${payload.institutionId}/events`);
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create event." };
  }
}

export async function updateCampusEvent(
  id: string,
  institutionId: string,
  payload: Partial<{
    title: string;
    eventType: CampusEventType;
    eventDate: string;
    venue: string;
    budgetAllocated: number | null;
    actualSpend: number;
    attendeesCount: number | null;
    description: string;
    organizingCommittee: Array<{ staff_id: string; name: string; role: string }>;
    photoUrls: string[];
  }>
): Promise<Result<void>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const update: Record<string, unknown> = {};
    if (payload.title !== undefined)               update.title = payload.title.trim();
    if (payload.eventType !== undefined)           update.event_type = payload.eventType;
    if (payload.eventDate !== undefined)           update.event_date = payload.eventDate;
    if (payload.venue !== undefined)               update.venue = payload.venue.trim() || null;
    if (payload.budgetAllocated !== undefined)     update.budget_allocated = payload.budgetAllocated;
    if (payload.actualSpend !== undefined)         update.actual_spend = payload.actualSpend;
    if (payload.attendeesCount !== undefined)      update.attendees_count = payload.attendeesCount;
    if (payload.description !== undefined)         update.description = payload.description.trim() || null;
    if (payload.organizingCommittee !== undefined) update.organizing_committee = payload.organizingCommittee;
    if (payload.photoUrls !== undefined)           update.photo_urls = payload.photoUrls;

    const { error } = await supabase
      .from("campus_events")
      .update(update)
      .eq("id", id)
      .eq("institution_id", institutionId);

    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId,
      performedBy: user.id,
      tableName: "campus_events",
      recordId: id,
      action: "UPDATE",
    });

    revalidatePath(`/institutions/${institutionId}/events`);
    revalidatePath(`/institutions/${institutionId}/events/${id}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update event." };
  }
}

export async function addParticipant(
  eventId: string,
  studentId: string,
  role: ParticipantRole,
  institutionId: string
): Promise<Result<{ id: string }>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("event_participants")
      .insert({ event_id: eventId, student_id: studentId, role })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/events/${eventId}`);
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to add participant." };
  }
}

export async function bulkAddParticipants(
  eventId: string,
  studentIds: string[],
  role: ParticipantRole,
  institutionId: string
): Promise<Result<{ added: number; skipped: number }>> {
  try {
    const supabase = createClient(await cookies());
    const rows = studentIds.map((sid) => ({ event_id: eventId, student_id: sid, role }));
    const { data, error } = await supabase
      .from("event_participants")
      .upsert(rows, { onConflict: "event_id,student_id", ignoreDuplicates: true })
      .select("id");

    if (error) return { success: false, error: error.message };
    const added = data?.length ?? 0;
    const skipped = studentIds.length - added;
    revalidatePath(`/institutions/${institutionId}/events/${eventId}`);
    return { success: true, data: { added, skipped } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Bulk import failed." };
  }
}

export async function removeParticipant(id: string, institutionId: string, eventId: string): Promise<Result<void>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("event_participants").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/events/${eventId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to remove participant." };
  }
}

// ── Student Portal ────────────────────────────────────────────────────────────

/** Upcoming events at the student's institution + their own registrations. */
export async function getMyEvents(): Promise<Result<{
  upcoming: CampusEvent[];
  myRegistrations: Array<{ event: CampusEvent; role: ParticipantRole }>;
}>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data: student } = await supabase
      .from("students")
      .select("id, institution_id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!student) return { success: true, data: { upcoming: [], myRegistrations: [] } };

    const today = new Date().toISOString().slice(0, 10);

    const [eventsRes, regsRes] = await Promise.all([
      supabase
        .from("campus_events")
        .select("*")
        .eq("institution_id", student.institution_id)
        .gte("event_date", today)
        .order("event_date"),
      supabase
        .from("event_participants")
        .select("role, event:campus_events(*)")
        .eq("student_id", student.id),
    ]);

    if (eventsRes.error) return { success: false, error: eventsRes.error.message };

    const upcoming = (eventsRes.data ?? []).map((e) => ({
      ...(e as CampusEvent),
      organizing_committee: [],
      photo_urls: [],
    }));

    const myRegistrations = (regsRes.data ?? [])
      .filter((r) => r.event)
      .map((r) => {
        const rawEvent = Array.isArray(r.event) ? r.event[0] : r.event;
        return {
          event: { ...(rawEvent as CampusEvent), organizing_committee: [], photo_urls: [] },
          role: r.role as ParticipantRole,
        };
      });

    return { success: true, data: { upcoming, myRegistrations } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load events." };
  }
}

/** Student self-registers for an event as 'participant'. */
export async function registerForEvent(eventId: string): Promise<Result<void>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!student) return { success: false, error: "Student record not found." };

    const { error } = await supabase
      .from("event_participants")
      .insert({ event_id: eventId, student_id: student.id, role: "participant" });

    if (error) {
      if (error.code === "23505") return { success: false, error: "Already registered." };
      return { success: false, error: error.message };
    }
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Registration failed." };
  }
}
