"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { meetingStats, actionStats, type MeetingStatus, type ActionStatus, type MeetingStats, type ActionStats } from "@/lib/iqac";

type Result<T> = { success: true; data: T } | { success: false; error: string };

async function db() {
  return createClient(await cookies());
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type MeetingRow = {
  id: string; meetingNumber: number; meetingDate: string; status: MeetingStatus;
  agenda: string; chairedByName: string | null; academicYear: string | null;
  actionTotal: number; actionOpen: number;
};

export type ActionItem = {
  id: string; description: string; assignedToId: string | null; assignedToName: string | null;
  dueDate: string | null; status: ActionStatus; remarks: string | null;
};

export type MeetingDetail = {
  id: string; meetingNumber: number; meetingDate: string; status: MeetingStatus;
  agenda: string; minutes: string | null; chairedById: string | null; chairedByName: string | null;
  academicYearId: string | null; items: ActionItem[];
};

// ── Meetings ──────────────────────────────────────────────────────────────────

export async function getMeetings(institutionId: string): Promise<Result<{ rows: MeetingRow[]; stats: MeetingStats }>> {
  try {
    const supabase = await db();
    const { data, error } = await supabase
      .from("iqac_meetings")
      .select("id, meeting_number, meeting_date, status, agenda, staff(full_name), academic_years(label), iqac_action_items(status)")
      .eq("institution_id", institutionId)
      .order("meeting_date", { ascending: false });
    if (error) return { success: false, error: error.message };
    const rows: MeetingRow[] = (data ?? []).map((m) => {
      const items = (m.iqac_action_items as unknown as { status: string }[] | null) ?? [];
      return {
        id: m.id as string,
        meetingNumber: m.meeting_number as number,
        meetingDate: m.meeting_date as string,
        status: m.status as MeetingStatus,
        agenda: m.agenda as string,
        chairedByName: (m.staff as unknown as { full_name: string } | null)?.full_name ?? null,
        academicYear: (m.academic_years as unknown as { label: string } | null)?.label ?? null,
        actionTotal: items.length,
        actionOpen: items.filter((i) => i.status === "open" || i.status === "in_progress").length,
      };
    });
    return { success: true, data: { rows, stats: meetingStats(rows.map((r) => ({ status: r.status }))) } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function createMeeting(input: {
  institutionId: string; academicYearId?: string | null; meetingDate: string; meetingNumber: number;
  agenda: string; chairedBy?: string | null; status: MeetingStatus;
}): Promise<Result<{ id: string }>> {
  try {
    if (!input.agenda.trim()) return { success: false, error: "Agenda is required." };
    if (!input.meetingDate) return { success: false, error: "Meeting date is required." };
    const supabase = await db();
    const { data, error } = await supabase.from("iqac_meetings").insert({
      institution_id: input.institutionId,
      academic_year_id: input.academicYearId || null,
      meeting_date: input.meetingDate,
      meeting_number: input.meetingNumber,
      agenda: input.agenda.trim(),
      chaired_by: input.chairedBy || null,
      status: input.status,
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/iqac/meetings`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateMeeting(input: {
  institutionId: string; id: string; meetingDate: string; meetingNumber: number; agenda: string;
  minutes?: string | null; chairedBy?: string | null; status: MeetingStatus; academicYearId?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("iqac_meetings").update({
      meeting_date: input.meetingDate,
      meeting_number: input.meetingNumber,
      agenda: input.agenda.trim(),
      minutes: input.minutes?.trim() || null,
      chaired_by: input.chairedBy || null,
      status: input.status,
      academic_year_id: input.academicYearId || null,
    }).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/iqac/meetings/${input.id}`);
    revalidatePath(`/institutions/${input.institutionId}/iqac/meetings`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteMeeting(input: { institutionId: string; id: string }): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("iqac_meetings").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/iqac/meetings`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getMeeting(meetingId: string): Promise<Result<MeetingDetail>> {
  try {
    const supabase = await db();
    const { data, error } = await supabase
      .from("iqac_meetings")
      .select("id, meeting_number, meeting_date, status, agenda, minutes, chaired_by, academic_year_id, staff(full_name), iqac_action_items(id, description, assigned_to, due_date, status, remarks, staff(full_name))")
      .eq("id", meetingId)
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Meeting not found." };
    const items: ActionItem[] = (Array.isArray(data.iqac_action_items) ? data.iqac_action_items : []).map((i) => ({
      id: i.id as string,
      description: i.description as string,
      assignedToId: (i.assigned_to as string | null) ?? null,
      assignedToName: (i.staff as unknown as { full_name: string } | null)?.full_name ?? null,
      dueDate: (i.due_date as string | null) ?? null,
      status: i.status as ActionStatus,
      remarks: (i.remarks as string | null) ?? null,
    })).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
    return {
      success: true,
      data: {
        id: data.id as string,
        meetingNumber: data.meeting_number as number,
        meetingDate: data.meeting_date as string,
        status: data.status as MeetingStatus,
        agenda: data.agenda as string,
        minutes: (data.minutes as string | null) ?? null,
        chairedById: (data.chaired_by as string | null) ?? null,
        chairedByName: (data.staff as unknown as { full_name: string } | null)?.full_name ?? null,
        academicYearId: (data.academic_year_id as string | null) ?? null,
        items,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Action items ──────────────────────────────────────────────────────────────

export async function addActionItem(input: {
  institutionId: string; meetingId: string; description: string; assignedTo?: string | null; dueDate?: string | null;
}): Promise<Result<null>> {
  try {
    if (!input.description.trim()) return { success: false, error: "Description is required." };
    const supabase = await db();
    const { error } = await supabase.from("iqac_action_items").insert({
      meeting_id: input.meetingId, description: input.description.trim(),
      assigned_to: input.assignedTo || null, due_date: input.dueDate || null, status: "open",
    });
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/iqac/meetings/${input.meetingId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateActionStatus(input: {
  institutionId: string; meetingId: string; id: string; status: ActionStatus; remarks?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("iqac_action_items").update({
      status: input.status,
      resolved_at: input.status === "completed" ? new Date().toISOString() : null,
      ...(input.remarks !== undefined ? { remarks: input.remarks?.trim() || null } : {}),
    }).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/iqac/meetings/${input.meetingId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteActionItem(input: { institutionId: string; meetingId: string; id: string }): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("iqac_action_items").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/iqac/meetings/${input.meetingId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Aggregate meeting + action stats for the dashboard / AQAR. */
export async function getIqacStats(institutionId: string): Promise<Result<{ meetings: MeetingStats; actions: ActionStats }>> {
  try {
    const supabase = await db();
    const [{ data: meetings }, { data: actions }] = await Promise.all([
      supabase.from("iqac_meetings").select("status").eq("institution_id", institutionId),
      supabase.from("iqac_action_items").select("status, iqac_meetings!inner(institution_id)").eq("iqac_meetings.institution_id", institutionId),
    ]);
    return {
      success: true,
      data: {
        meetings: meetingStats((meetings ?? []).map((m) => ({ status: m.status as MeetingStatus }))),
        actions: actionStats((actions ?? []).map((a) => ({ status: a.status as ActionStatus }))),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
