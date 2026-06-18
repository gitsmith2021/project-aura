// Phase 5J — Staff Daily Attendance & LOP domain model + pure helpers.

export type StaffAttStatus = "present" | "absent" | "half_day" | "late" | "on_duty" | "on_leave" | "holiday";

export type StaffAttendance = {
  id: string;
  institution_id: string;
  staff_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: StaffAttStatus;
  late_reason: string | null;
  remarks: string | null;
  logged_by: string | null;
  created_at: string;
};

// ── Labels & colours ──────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<StaffAttStatus, string> = {
  present: "Present", absent: "Absent", half_day: "Half Day", late: "Late",
  on_duty: "On Duty", on_leave: "On Leave", holiday: "Holiday",
};

/** Short codes for the dense daily register (P / A / HD / L / OD / LV / H). */
export const STATUS_CODES: Record<StaffAttStatus, string> = {
  present: "P", absent: "A", half_day: "HD", late: "L", on_duty: "OD", on_leave: "LV", holiday: "H",
};

export const STATUS_COLORS: Record<StaffAttStatus, string> = {
  present:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  absent:   "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  half_day: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  late:     "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  on_duty:  "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  on_leave: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  holiday:  "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export const STAFF_ATT_STATUSES = Object.keys(STATUS_LABELS) as StaffAttStatus[];

/** Statuses an admin can set from the daily register (holiday/on_leave are derived). */
export const MARKABLE_STATUSES: StaffAttStatus[] = ["present", "absent", "half_day", "late", "on_duty"];

// ── Dates ─────────────────────────────────────────────────────────────────────

/** Inclusive list of YYYY-MM-DD strings between two dates (UTC, TZ-safe). */
export function eachDateInRange(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return out;
  for (let d = start; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** "YYYY-MM" or "YYYY-MM-DD" → { year, month (1-12) }. */
export function parseMonth(month: string): { year: number; month: number } {
  const [y, m] = month.slice(0, 7).split("-");
  return { year: Number(y), month: Number(m) };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// ── Monthly summary ────────────────────────────────────────────────────────────

export type MonthlySummary = {
  present: number;
  absent: number;
  halfDay: number;
  late: number;
  onDuty: number;
  onLeave: number;
  holiday: number;
  lopDays: number;        // absent + 0.5 × half-day (no approved leave)
  workingDays: number;    // days that count toward physical presence
  attendancePct: number;  // physical-presence rate over working days
};

export function summarizeMonth(records: Pick<StaffAttendance, "status">[]): MonthlySummary {
  const s: MonthlySummary = {
    present: 0, absent: 0, halfDay: 0, late: 0, onDuty: 0, onLeave: 0, holiday: 0,
    lopDays: 0, workingDays: 0, attendancePct: 0,
  };
  for (const r of records) {
    switch (r.status) {
      case "present": s.present++; break;
      case "absent": s.absent++; break;
      case "half_day": s.halfDay++; break;
      case "late": s.late++; break;
      case "on_duty": s.onDuty++; break;
      case "on_leave": s.onLeave++; break;
      case "holiday": s.holiday++; break;
    }
  }
  s.lopDays = s.absent + 0.5 * s.halfDay;
  // Working days = everything except holidays and approved leave.
  s.workingDays = s.present + s.absent + s.halfDay + s.late + s.onDuty;
  const presentEquivalent = s.present + s.late + s.onDuty + 0.5 * s.halfDay;
  s.attendancePct = s.workingDays > 0 ? Math.round((presentEquivalent / s.workingDays) * 100) : 0;
  s.lopDays = Math.round(s.lopDays * 100) / 100;
  return s;
}

/** LOP days for a set of records (used by the payroll run). */
export function lopDaysFromRecords(records: Pick<StaffAttendance, "status">[]): number {
  let absent = 0, half = 0;
  for (const r of records) {
    if (r.status === "absent") absent++;
    else if (r.status === "half_day") half++;
  }
  return Math.round((absent + 0.5 * half) * 100) / 100;
}

/** LOP deduction amount: per-day = net / days-in-month, × LOP days. */
export function lopDeduction(netSalary: number, lopDays: number, daysInMo: number): number {
  if (lopDays <= 0 || daysInMo <= 0) return 0;
  return Math.round((netSalary / daysInMo) * lopDays * 100) / 100;
}

/** NAAC 2.4 — institution-wide average teacher attendance %. */
export function avgAttendance(summaries: Pick<MonthlySummary, "attendancePct" | "workingDays">[]): number {
  const active = summaries.filter((s) => s.workingDays > 0);
  if (active.length === 0) return 0;
  return Math.round(active.reduce((a, b) => a + b.attendancePct, 0) / active.length);
}

// ── CSV ─────────────────────────────────────────────────────────────────────

function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export type ReportRow = { name: string; department: string | null; summary: MonthlySummary };

export function monthlyReportCSV(rows: ReportRow[]): string {
  const header = ["Staff", "Department", "Present", "Absent", "Half Day", "Late", "On Duty", "On Leave", "LOP Days", "Attendance %"].join(",");
  const lines = rows.map((r) =>
    [
      r.name, r.department ?? "", r.summary.present, r.summary.absent, r.summary.halfDay,
      r.summary.late, r.summary.onDuty, r.summary.onLeave, r.summary.lopDays, `${r.summary.attendancePct}%`,
    ].map(csvCell).join(",")
  );
  return [header, ...lines].join("\n");
}
