// ════════════════════════════════════════════════════════════════════════════
// PHASE 8 · P8.4 — Missed-Lecture detector (pure, unit-tested).
//
// A lecture is "missed" when, past its start time + grace period, no faculty
// recorded presence for it AND no substitute is on record for that date. The
// grace window is the CF-1 setting `smart_campus.missed_lecture_grace_minutes`.
//
// ⚠️  NOT SCHEDULED YET. The cron that runs this is wired in P8.3, because it
// depends on faculty presence taps that only P8.3 records. Until those taps
// exist, EVERY past-grace lecture would look "missed" — so activating the cron
// before P8.3 would produce nothing but false positives. This file is the
// deterministic core; P8.3 adds the scheduled job that persists the rows.
// ════════════════════════════════════════════════════════════════════════════

import { nowParts } from "@/lib/smartAttendance";

export type LectureSchedule = {
  id: string;
  institution_id: string;
  day_of_week: string | null;
  start_time: string | null; // "HH:MM:SS"
};

export type FacultyEvent = {
  schedule_id: string;
  event_type: string;   // 'faculty_presence' | 'lecture_started'
  tapped_at: string;    // ISO timestamp
};

export type ActiveSub = { schedule_id: string; sub_date: string }; // sub_date "YYYY-MM-DD"

export type MissedRow = {
  institution_id: string;
  schedule_id: string;
  exception_type: "missed_lecture";
  exception_date: string; // "YYYY-MM-DD"
};

function toSeconds(hms: string): number {
  const [h, m, s] = hms.split(":").map((n) => parseInt(n, 10) || 0);
  return h * 3600 + m * 60 + s;
}

/** True once the current local time has passed the lecture start + grace window. */
export function isPastGrace(startTime: string, nowTime: string, graceMinutes: number): boolean {
  return toSeconds(nowTime) >= toSeconds(startTime) + graceMinutes * 60;
}

/**
 * Detect missed lectures for "now". Pure: the caller supplies the day's schedules,
 * the day's faculty presence events, and the day's substitutions; this decides
 * which slots are missed. Any presence event (faculty_presence OR lecture_started)
 * or an on-record substitute clears the slot.
 */
export function detectMissedLectures(
  schedules: LectureSchedule[],
  facultyEvents: FacultyEvent[],
  substitutions: ActiveSub[],
  opts: { graceMinutes: number; now: Date; tz: string },
): MissedRow[] {
  const { dayOfWeek, time, dateISO } = nowParts(opts.now, opts.tz);

  const present = new Set(
    facultyEvents
      .filter((e) => nowParts(new Date(e.tapped_at), opts.tz).dateISO === dateISO)
      .map((e) => e.schedule_id),
  );
  const substituted = new Set(
    substitutions.filter((s) => s.sub_date === dateISO).map((s) => s.schedule_id),
  );

  const out: MissedRow[] = [];
  for (const s of schedules) {
    if (s.day_of_week !== dayOfWeek || !s.start_time) continue;
    if (present.has(s.id) || substituted.has(s.id)) continue;
    if (!isPastGrace(s.start_time, time, opts.graceMinutes)) continue;
    out.push({ institution_id: s.institution_id, schedule_id: s.id, exception_type: "missed_lecture", exception_date: dateISO });
  }
  return out;
}
