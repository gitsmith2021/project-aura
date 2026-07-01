import { describe, it, expect } from "vitest";
import { isPastGrace, detectMissedLectures, type LectureSchedule, type FacultyEvent, type ActiveSub } from "@/lib/missedLecture";

// Monday 2026-07-06, 10:30:00 UTC — 30 min past a 10:00 start.
const MON_1030 = new Date("2026-07-06T10:30:00Z");

function lecture(over: Partial<LectureSchedule>): LectureSchedule {
  return { id: "s1", institution_id: "i1", day_of_week: "Monday", start_time: "10:00:00", ...over };
}

describe("isPastGrace", () => {
  it("is false inside the grace window", () => {
    expect(isPastGrace("10:00:00", "10:10:00", 15)).toBe(false);
  });
  it("is true at exactly start + grace", () => {
    expect(isPastGrace("10:00:00", "10:15:00", 15)).toBe(true);
  });
  it("is true well past grace", () => {
    expect(isPastGrace("10:00:00", "11:00:00", 15)).toBe(true);
  });
});

describe("detectMissedLectures", () => {
  const opts = { graceMinutes: 15, now: MON_1030, tz: "UTC" };

  it("flags a past-grace lecture with no presence and no substitute", () => {
    const out = detectMissedLectures([lecture({})], [], [], opts);
    expect(out).toEqual([
      { institution_id: "i1", schedule_id: "s1", exception_type: "missed_lecture", exception_date: "2026-07-06" },
    ]);
  });

  it("does not flag a lecture still inside the grace window", () => {
    const out = detectMissedLectures([lecture({ start_time: "10:20:00" })], [], [], opts);
    expect(out).toHaveLength(0);
  });

  it("clears a slot with a faculty presence event today", () => {
    const events: FacultyEvent[] = [{ schedule_id: "s1", event_type: "faculty_presence", tapped_at: "2026-07-06T10:05:00Z" }];
    expect(detectMissedLectures([lecture({})], events, [], opts)).toHaveLength(0);
  });

  it("ignores a presence event from a different day", () => {
    const events: FacultyEvent[] = [{ schedule_id: "s1", event_type: "faculty_presence", tapped_at: "2026-07-05T10:05:00Z" }];
    expect(detectMissedLectures([lecture({})], events, [], opts)).toHaveLength(1);
  });

  it("clears a slot covered by a substitute on that date", () => {
    const subs: ActiveSub[] = [{ schedule_id: "s1", sub_date: "2026-07-06" }];
    expect(detectMissedLectures([lecture({})], [], subs, opts)).toHaveLength(0);
  });

  it("ignores lectures scheduled on another day", () => {
    expect(detectMissedLectures([lecture({ day_of_week: "Tuesday" })], [], [], opts)).toHaveLength(0);
  });
});
