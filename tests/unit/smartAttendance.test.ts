import { describe, it, expect } from "vitest";
import {
  nowParts,
  activeAt,
  matchScheduleForRoom,
  validateFacultyTap,
  REASON_MESSAGE,
  type SchedRow,
} from "@/lib/smartAttendance";

// Monday 2026-07-06, 10:30:00 UTC
const MON_1030 = new Date("2026-07-06T10:30:00Z");

function sched(over: Partial<SchedRow>): SchedRow {
  return {
    id: "s1", staff_id: "t1", classroom_id: null, department_id: "d1",
    start_time: "10:00:00", end_time: "11:00:00", day_of_week: "Monday", status: null,
    ...over,
  };
}

describe("nowParts", () => {
  it("extracts day/time/date in the given timezone", () => {
    const p = nowParts(MON_1030, "UTC");
    expect(p.dayOfWeek).toBe("Monday");
    expect(p.time).toBe("10:30:00");
    expect(p.dateISO).toBe("2026-07-06");
  });
  it("shifts across a timezone boundary", () => {
    // 23:30 UTC Sunday is Monday 05:00 in +05:30
    const p = nowParts(new Date("2026-07-05T23:30:00Z"), "Asia/Kolkata");
    expect(p.dayOfWeek).toBe("Monday");
    expect(p.time).toBe("05:00:00");
    expect(p.dateISO).toBe("2026-07-06");
  });
});

describe("activeAt", () => {
  it("includes a slot whose window contains the time (start inclusive, end exclusive)", () => {
    const rows = [sched({}), sched({ id: "s2", start_time: "11:00:00", end_time: "12:00:00" })];
    const active = activeAt(rows, "Monday", "10:30:00");
    expect(active.map((r) => r.id)).toEqual(["s1"]);
  });
  it("excludes the exact end boundary", () => {
    expect(activeAt([sched({})], "Monday", "11:00:00")).toHaveLength(0);
  });
  it("excludes other days", () => {
    expect(activeAt([sched({})], "Tuesday", "10:30:00")).toHaveLength(0);
  });
});

describe("matchScheduleForRoom", () => {
  it("prefers an exact classroom match", () => {
    const rows = [
      sched({ id: "roomed", classroom_id: "room-1" }),
      sched({ id: "other", classroom_id: "room-2" }),
    ];
    const r = matchScheduleForRoom(rows, { classroomId: "room-1", departmentId: "d1", day: "Monday", time: "10:30:00" });
    expect(r.ok && r.schedule.id).toBe("roomed");
  });

  it("falls back to department when no slot is room-assigned", () => {
    const rows = [sched({ id: "deptonly", classroom_id: null, department_id: "d1" })];
    const r = matchScheduleForRoom(rows, { classroomId: "room-1", departmentId: "d1", day: "Monday", time: "10:30:00" });
    expect(r.ok && r.schedule.id).toBe("deptonly");
  });

  it("does not steal a room-assigned class in another room via dept fallback", () => {
    const rows = [sched({ id: "elsewhere", classroom_id: "room-9", department_id: "d1" })];
    const r = matchScheduleForRoom(rows, { classroomId: "room-1", departmentId: "d1", day: "Monday", time: "10:30:00" });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBe("no_class");
  });

  it("returns no_class when nothing is running", () => {
    const r = matchScheduleForRoom([], { classroomId: "room-1", departmentId: "d1", day: "Monday", time: "10:30:00" });
    expect(!r.ok && r.reason).toBe("no_class");
  });

  it("returns ambiguous when two rooms match the same reader", () => {
    const rows = [
      sched({ id: "a", classroom_id: "room-1" }),
      sched({ id: "b", classroom_id: "room-1" }),
    ];
    const r = matchScheduleForRoom(rows, { classroomId: "room-1", departmentId: "d1", day: "Monday", time: "10:30:00" });
    expect(!r.ok && r.reason).toBe("ambiguous");
  });

  it("returns ambiguous on multiple un-roomed dept matches", () => {
    const rows = [
      sched({ id: "a", classroom_id: null, department_id: "d1" }),
      sched({ id: "b", classroom_id: null, department_id: "d1" }),
    ];
    const r = matchScheduleForRoom(rows, { classroomId: "room-1", departmentId: "d1", day: "Monday", time: "10:30:00" });
    expect(!r.ok && r.reason).toBe("ambiguous");
  });
});

describe("validateFacultyTap", () => {
  const base = sched({ classroom_id: "room-1" });

  it("accepts the assigned teacher in the assigned room", () => {
    expect(validateFacultyTap({ schedule: base, staffId: "t1", classroomId: "room-1", substitution: null })).toEqual({ ok: true });
  });

  it("rejects a tap with no lecture", () => {
    const r = validateFacultyTap({ schedule: null, staffId: "t1", classroomId: "room-1", substitution: null });
    expect(!r.ok && r.reason).toBe("no_lecture");
  });

  it("rejects the wrong classroom", () => {
    const r = validateFacultyTap({ schedule: base, staffId: "t1", classroomId: "room-2", substitution: null });
    expect(!r.ok && r.reason).toBe("not_assigned_classroom");
  });

  it("rejects a different teacher", () => {
    const r = validateFacultyTap({ schedule: base, staffId: "t2", classroomId: "room-1", substitution: null });
    expect(!r.ok && r.reason).toBe("wrong_faculty");
  });

  it("rejects an already-completed lecture", () => {
    const r = validateFacultyTap({ schedule: sched({ status: "completed", classroom_id: "room-1" }), staffId: "t1", classroomId: "room-1", substitution: null });
    expect(!r.ok && r.reason).toBe("already_completed");
  });

  it("lets the substitute tap and blocks the original", () => {
    const substitution = { substitute_staff_id: "t2", original_staff_id: "t1" };
    expect(validateFacultyTap({ schedule: base, staffId: "t2", classroomId: "room-1", substitution })).toEqual({ ok: true });
    const blocked = validateFacultyTap({ schedule: base, staffId: "t1", classroomId: "room-1", substitution });
    expect(!blocked.ok && blocked.reason).toBe("wrong_faculty");
  });
});

describe("REASON_MESSAGE", () => {
  it("has a human message for every reason code", () => {
    for (const key of ["no_class", "ambiguous", "no_lecture", "not_assigned_classroom", "wrong_faculty", "already_completed"] as const) {
      expect(REASON_MESSAGE[key]).toBeTruthy();
    }
  });
});
