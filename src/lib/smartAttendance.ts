// ════════════════════════════════════════════════════════════════════════════
// PHASE 8 · P8.4 — Smart Attendance validation (pure, unit-tested).
//
// The deterministic core shared by the P8.2 student-card ingest (now) and the
// P8.3 staff NFC tap (later). No I/O — callers fetch the rows and pass them in,
// so it's testable like src/lib/dataExplorer.ts. A tap is NEVER recorded silently:
// every rejection carries a reason code with a human message.
// ════════════════════════════════════════════════════════════════════════════

export type SchedRow = {
  id: string;
  staff_id: string | null;
  classroom_id: string | null;
  department_id: string | null;
  start_time: string | null;   // "HH:MM:SS"
  end_time: string | null;
  day_of_week: string | null;  // "Monday"…
  status?: string | null;
  subject_id?: string | null;
};

export type Substitution = { substitute_staff_id: string; original_staff_id: string | null };

export type MatchReason = "no_class" | "ambiguous";
export type FacultyReason = "no_lecture" | "not_assigned_classroom" | "wrong_faculty" | "already_completed";

export const REASON_MESSAGE: Record<MatchReason | FacultyReason, string> = {
  no_class: "No scheduled lecture is running in this room right now.",
  ambiguous: "Multiple classes match this room/time — assign rooms to the timetable to disambiguate.",
  no_lecture: "No scheduled lecture exists for this room and time.",
  not_assigned_classroom: "You are not assigned to this classroom.",
  wrong_faculty: "This class belongs to another faculty member.",
  already_completed: "This lecture has already been completed.",
};

/** Local day-of-week + time + date for the institution's timezone (reused by the
 *  webhooks so period matching is consistent across NFC and card readers). */
export function nowParts(now: Date, tz: string): { dayOfWeek: string; time: string; dateISO: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "long", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  const pad = (s: string) => (s.length === 1 ? `0${s}` : s);
  const hour = get("hour") === "24" ? "00" : get("hour"); // Intl can emit "24" at midnight
  const time = `${pad(hour)}:${pad(get("minute"))}:${pad(get("second"))}`;
  return { dayOfWeek: get("weekday"), time, dateISO: `${get("year")}-${get("month")}-${get("day")}` };
}

/** Schedules whose day matches and whose [start,end) window contains `time`. */
export function activeAt(schedules: SchedRow[], day: string, time: string): SchedRow[] {
  return schedules.filter((s) => s.day_of_week === day && !!s.start_time && !!s.end_time && s.start_time! <= time && time < s.end_time!);
}

export type MatchResult = { ok: true; schedule: SchedRow } | { ok: false; reason: MatchReason };

/**
 * Match a fixed in-room reader tap to the class it belongs to. Prefers an exact
 * `classroom_id` match; while a slot has no room assigned, falls back to the
 * classroom's department (only among un-roomed slots, so a room-assigned class
 * elsewhere is never stolen).
 */
export function matchScheduleForRoom(
  schedules: SchedRow[],
  args: { classroomId: string; departmentId: string | null; day: string; time: string },
): MatchResult {
  const active = activeAt(schedules, args.day, args.time);
  if (active.length === 0) return { ok: false, reason: "no_class" };

  const roomed = active.filter((s) => s.classroom_id === args.classroomId);
  if (roomed.length === 1) return { ok: true, schedule: roomed[0] };
  if (roomed.length > 1) return { ok: false, reason: "ambiguous" };

  const deptFallback = active.filter((s) => !s.classroom_id && s.department_id === args.departmentId);
  if (deptFallback.length === 1) return { ok: true, schedule: deptFallback[0] };
  if (deptFallback.length > 1) return { ok: false, reason: "ambiguous" };

  return { ok: false, reason: "no_class" };
}

export type FacultyValidation = { ok: true } | { ok: false; reason: FacultyReason };

/**
 * Validate a FACULTY tap (P8.3) against the timetable: assigned classroom, the
 * right teacher (honouring an active substitution — substitute allowed, original
 * blocked), and not already completed. Built now as the P8.4 deliverable.
 */
export function validateFacultyTap(args: {
  schedule: SchedRow | null;
  staffId: string;
  classroomId: string | null;
  substitution: Substitution | null;
}): FacultyValidation {
  const { schedule, staffId, classroomId, substitution } = args;
  if (!schedule) return { ok: false, reason: "no_lecture" };
  if (schedule.status === "completed") return { ok: false, reason: "already_completed" };
  if (schedule.classroom_id && classroomId && schedule.classroom_id !== classroomId) {
    return { ok: false, reason: "not_assigned_classroom" };
  }
  if (substitution) {
    // An active substitution overrides the original assignment for this date.
    return staffId === substitution.substitute_staff_id ? { ok: true } : { ok: false, reason: "wrong_faculty" };
  }
  if (schedule.staff_id && staffId !== schedule.staff_id) return { ok: false, reason: "wrong_faculty" };
  return { ok: true };
}
