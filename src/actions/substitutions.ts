"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";

// ════════════════════════════════════════════════════════════════════════════
// PHASE 8 · P8.4 — Substitute Faculty.
//
// Reassign a timetable slot (public.class_schedules — the attendance-linked
// timetable, NOT the planner's `schedules` table) to another staff member for a
// single date. The card/NFC validation (src/lib/smartAttendance.ts) honours the
// active substitution: the substitute may tap, the original is blocked.
//
// Authorization is enforced by RLS (SUPER_ADMIN / INST_ADMIN anywhere in their
// institution; HOD / DEPARTMENT_HEAD limited to their own department's schedules).
// Every write is audited (Dev Rule 13).
// ════════════════════════════════════════════════════════════════════════════

type Result<T> = { success: true; data: T } | { success: false; error: string };

export type SchedulePeriod = {
  id: string;
  department_id: string | null;
  subject_name: string | null;
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
  staff_id: string | null;
  staff_name: string | null;
  classroom_label: string | null;
};

export type SubstitutionRow = {
  id: string;
  schedule_id: string;
  sub_date: string;
  substitute_staff_id: string;
  substitute_name: string | null;
  original_staff_id: string | null;
  original_name: string | null;
  reason: string | null;
  subject_name: string | null;
  day_of_week: string | null;
  start_time: string | null;
};

export type StaffOption = { id: string; full_name: string; department_id: string | null };

async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Everything the Substitute-Faculty drawer needs in one round trip. */
export async function getSubstitutionContext(
  institutionId: string,
  date?: string,
): Promise<Result<{ periods: SchedulePeriod[]; staff: StaffOption[]; substitutions: SubstitutionRow[] }>> {
  try {
    const supabase = createClient(await cookies());

    const [{ data: sched, error: schedErr }, { data: staff, error: staffErr }] = await Promise.all([
      supabase
        .from("class_schedules")
        .select("id, department_id, subject_name, day_of_week, start_time, end_time, staff_id, classroom_id, staff:staff_id(full_name), classroom:classroom_id(building, room_number)")
        .eq("institution_id", institutionId)
        .order("day_of_week")
        .order("start_time"),
      supabase
        .from("staff")
        .select("id, full_name, department_id")
        .eq("institution_id", institutionId)
        .eq("is_active", true)
        .order("full_name"),
    ]);
    if (schedErr) return { success: false, error: schedErr.message };
    if (staffErr) return { success: false, error: staffErr.message };

    const periods: SchedulePeriod[] = (sched ?? []).map((s) => {
      const st = s.staff as { full_name?: string } | null;
      const room = s.classroom as { building?: string; room_number?: string } | null;
      return {
        id: s.id as string,
        department_id: (s.department_id as string | null) ?? null,
        subject_name: (s.subject_name as string | null) ?? null,
        day_of_week: (s.day_of_week as string | null) ?? null,
        start_time: (s.start_time as string | null) ?? null,
        end_time: (s.end_time as string | null) ?? null,
        staff_id: (s.staff_id as string | null) ?? null,
        staff_name: st?.full_name ?? null,
        classroom_label: room ? `${room.building ?? ""} ${room.room_number ?? ""}`.trim() : null,
      };
    });

    let subQuery = supabase
      .from("class_substitutions")
      .select("id, schedule_id, sub_date, substitute_staff_id, original_staff_id, reason, substitute:substitute_staff_id(full_name), original:original_staff_id(full_name), class_schedules:schedule_id(subject_name, day_of_week, start_time)")
      .eq("institution_id", institutionId)
      .order("sub_date", { ascending: false });
    if (date) subQuery = subQuery.eq("sub_date", date);

    const { data: subs, error: subErr } = await subQuery;
    if (subErr) return { success: false, error: subErr.message };

    const substitutions: SubstitutionRow[] = (subs ?? []).map((r) => {
      const sub = r.substitute as { full_name?: string } | null;
      const orig = r.original as { full_name?: string } | null;
      const cs = r.class_schedules as { subject_name?: string; day_of_week?: string; start_time?: string } | null;
      return {
        id: r.id as string,
        schedule_id: r.schedule_id as string,
        sub_date: r.sub_date as string,
        substitute_staff_id: r.substitute_staff_id as string,
        substitute_name: sub?.full_name ?? null,
        original_staff_id: (r.original_staff_id as string | null) ?? null,
        original_name: orig?.full_name ?? null,
        reason: (r.reason as string | null) ?? null,
        subject_name: cs?.subject_name ?? null,
        day_of_week: cs?.day_of_week ?? null,
        start_time: cs?.start_time ?? null,
      };
    });

    return { success: true, data: { periods, staff: (staff ?? []) as StaffOption[], substitutions } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function assignSubstitute(input: {
  institutionId: string;
  scheduleId: string;
  subDate: string;
  substituteStaffId: string;
  reason?: string | null;
}): Promise<Result<SubstitutionRow>> {
  try {
    if (!input.scheduleId || !input.subDate || !input.substituteStaffId) {
      return { success: false, error: "Schedule, date and substitute are required." };
    }
    const supabase = createClient(await cookies());

    // Capture the original teacher so the audit trail and the "blocked original"
    // rule are anchored to who held the slot at assignment time.
    const { data: schedule, error: schedErr } = await supabase
      .from("class_schedules")
      .select("id, staff_id, institution_id")
      .eq("id", input.scheduleId)
      .maybeSingle();
    if (schedErr) return { success: false, error: schedErr.message };
    if (!schedule || schedule.institution_id !== input.institutionId) {
      return { success: false, error: "Schedule not found." };
    }
    if (schedule.staff_id && schedule.staff_id === input.substituteStaffId) {
      return { success: false, error: "That teacher already holds this class." };
    }

    // Upsert so re-assigning the same slot/date replaces the substitute (RLS gates who may).
    const { data, error } = await supabase
      .from("class_substitutions")
      .upsert(
        {
          institution_id: input.institutionId,
          schedule_id: input.scheduleId,
          sub_date: input.subDate,
          substitute_staff_id: input.substituteStaffId,
          original_staff_id: schedule.staff_id ?? null,
          reason: input.reason?.trim() || null,
          assigned_by: await currentUserId(supabase),
        },
        { onConflict: "schedule_id,sub_date" },
      )
      .select("id, schedule_id, sub_date, substitute_staff_id, original_staff_id, reason")
      .single();
    if (error) {
      if (error.code === "42501") return { success: false, error: "You are not allowed to assign substitutes for this class." };
      return { success: false, error: error.message };
    }

    await logAudit({
      institutionId: input.institutionId,
      performedBy: await currentUserId(supabase),
      tableName: "class_substitutions",
      recordId: data.id,
      action: "INSERT",
      afterData: data,
      notes: `Substitute assigned for schedule ${input.scheduleId} on ${input.subDate}`,
    });
    revalidatePath("/schedules");
    return {
      success: true,
      data: { ...(data as unknown as SubstitutionRow), substitute_name: null, original_name: null, subject_name: null, day_of_week: null, start_time: null },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function removeSubstitute(institutionId: string, id: string): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { data: before } = await supabase
      .from("class_substitutions")
      .select("id, schedule_id, sub_date, substitute_staff_id, original_staff_id")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("class_substitutions").delete().eq("id", id);
    if (error) {
      if (error.code === "42501") return { success: false, error: "You are not allowed to remove this substitution." };
      return { success: false, error: error.message };
    }

    await logAudit({
      institutionId,
      performedBy: await currentUserId(supabase),
      tableName: "class_substitutions",
      recordId: id,
      action: "DELETE",
      beforeData: before ?? null,
      notes: "Substitute removed",
    });
    revalidatePath("/schedules");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
