import { describe, it, expect } from "vitest";
import {
  eachDateInRange, parseMonth, daysInMonth, summarizeMonth, lopDaysFromRecords,
  lopDeduction, avgAttendance, monthlyReportCSV, STAFF_ATT_STATUSES, MARKABLE_STATUSES,
  type StaffAttStatus, type ReportRow,
} from "@/lib/staffAttendance";

const rec = (status: StaffAttStatus) => ({ status });

describe("enum coverage", () => {
  it("counts", () => {
    expect(STAFF_ATT_STATUSES).toHaveLength(7);
    expect(MARKABLE_STATUSES).toEqual(["present", "absent", "half_day", "late", "on_duty"]);
  });
});

describe("eachDateInRange", () => {
  it("is inclusive and TZ-safe", () => {
    expect(eachDateInRange("2026-06-01", "2026-06-03")).toEqual(["2026-06-01", "2026-06-02", "2026-06-03"]);
    expect(eachDateInRange("2026-06-30", "2026-07-02")).toEqual(["2026-06-30", "2026-07-01", "2026-07-02"]);
  });
  it("single day and invalid ranges", () => {
    expect(eachDateInRange("2026-06-05", "2026-06-05")).toEqual(["2026-06-05"]);
    expect(eachDateInRange("2026-06-05", "2026-06-01")).toEqual([]);
  });
});

describe("parseMonth / daysInMonth", () => {
  it("parses YYYY-MM and YYYY-MM-DD", () => {
    expect(parseMonth("2026-06")).toEqual({ year: 2026, month: 6 });
    expect(parseMonth("2026-02-15")).toEqual({ year: 2026, month: 2 });
  });
  it("days in month incl. leap Feb", () => {
    expect(daysInMonth(2026, 6)).toBe(30);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
  });
});

describe("summarizeMonth", () => {
  it("buckets, computes LOP and attendance %", () => {
    const s = summarizeMonth([
      rec("present"), rec("present"), rec("present"),
      rec("absent"), rec("half_day"), rec("late"), rec("on_duty"),
      rec("on_leave"), rec("holiday"),
    ]);
    expect(s.present).toBe(3);
    expect(s.absent).toBe(1);
    expect(s.halfDay).toBe(1);
    expect(s.late).toBe(1);
    expect(s.onDuty).toBe(1);
    expect(s.onLeave).toBe(1);
    expect(s.holiday).toBe(1);
    expect(s.lopDays).toBe(1.5);            // 1 absent + 0.5 half
    expect(s.workingDays).toBe(7);          // present+absent+half+late+onDuty
    // presentEquivalent = 3 + 1 late + 1 onDuty + 0.5 half = 5.5 over 7 = 79%
    expect(s.attendancePct).toBe(79);
  });
  it("empty → zeros", () => {
    const s = summarizeMonth([]);
    expect(s.attendancePct).toBe(0);
    expect(s.lopDays).toBe(0);
  });
});

describe("lopDaysFromRecords", () => {
  it("counts absent + half/2", () => {
    expect(lopDaysFromRecords([rec("absent"), rec("absent"), rec("half_day"), rec("present"), rec("on_leave")])).toBe(2.5);
    expect(lopDaysFromRecords([rec("present")])).toBe(0);
  });
});

describe("lopDeduction", () => {
  it("per-day × LOP days, rounded", () => {
    expect(lopDeduction(30000, 3, 30)).toBe(3000);   // 1000/day × 3
    expect(lopDeduction(31000, 2, 31)).toBe(2000);
    expect(lopDeduction(30000, 0, 30)).toBe(0);
    expect(lopDeduction(30000, 2, 0)).toBe(0);
  });
});

describe("avgAttendance", () => {
  it("averages only staff with working days", () => {
    expect(avgAttendance([
      { attendancePct: 90, workingDays: 20 },
      { attendancePct: 80, workingDays: 20 },
      { attendancePct: 0, workingDays: 0 },   // ignored
    ])).toBe(85);
    expect(avgAttendance([])).toBe(0);
  });
});

describe("monthlyReportCSV", () => {
  it("emits header + per-staff rows", () => {
    const rows: ReportRow[] = [{
      name: "Dr. Rao", department: "CSE",
      summary: summarizeMonth([rec("present"), rec("present"), rec("absent")]),
    }];
    const csv = monthlyReportCSV(rows);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Staff,Department,Present,Absent,Half Day,Late,On Duty,On Leave,LOP Days,Attendance %");
    expect(lines[1]).toContain("Dr. Rao");
    expect(lines[1]).toContain("CSE");
  });
});
