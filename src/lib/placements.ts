// Phase 5F — Placement Cell & Career Services domain model + pure helpers.

// ── Types ─────────────────────────────────────────────────────────────────────

export type DriveStatus = "scheduled" | "ongoing" | "completed" | "cancelled";
export type StageStatus = "registered" | "shortlisted" | "interviewed" | "offered" | "rejected" | "placed";

export type EligibilityCriteria = {
  min_cgpa?: number | null;
  no_backlogs?: boolean | null;
  departments?: string[] | null;   // department ids; empty/absent = all
};

export type Company = {
  id: string;
  institution_id: string;
  name: string;
  industry: string | null;
  website: string | null;
  hr_contact_name: string | null;
  hr_contact_email: string | null;
  hr_contact_phone: string | null;
  created_at: string;
};

export type PlacementDrive = {
  id: string;
  institution_id: string;
  company_id: string;
  academic_year_id: string | null;
  drive_date: string;
  job_role: string;
  ctc_offered: number | null;
  eligibility_criteria: EligibilityCriteria | null;
  process_stages: string[] | null;
  is_exclusive: boolean;
  status: DriveStatus;
  created_at: string;
  companies?: { name: string; industry: string | null } | null;
  registration_count?: number;
};

export type PlacementRegistration = {
  id: string;
  drive_id: string;
  student_id: string;
  stage_status: StageStatus;
  offer_ctc: number | null;
  notes: string | null;
  registered_at: string;
  placed_at: string | null;
  students?: { full_name: string; roll_no: string | null; department_id: string | null } | null;
};

// ── Labels & colours ──────────────────────────────────────────────────────────

export const DRIVE_STATUS_LABELS: Record<DriveStatus, string> = {
  scheduled: "Scheduled", ongoing: "Ongoing", completed: "Completed", cancelled: "Cancelled",
};
export const DRIVE_STATUS_COLORS: Record<DriveStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  ongoing:   "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  cancelled: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export const STAGE_LABELS: Record<StageStatus, string> = {
  registered: "Registered", shortlisted: "Shortlisted", interviewed: "Interviewed",
  offered: "Offered", rejected: "Rejected", placed: "Placed",
};
export const STAGE_COLORS: Record<StageStatus, string> = {
  registered:  "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  shortlisted: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  interviewed: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  offered:     "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  rejected:    "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  placed:      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

/** Ordered non-terminal funnel (rejected is terminal and excluded). */
export const STAGE_PIPELINE: StageStatus[] = ["registered", "shortlisted", "interviewed", "offered", "placed"];

export function nextStage(s: StageStatus): StageStatus | null {
  if (s === "rejected" || s === "placed") return null;
  const i = STAGE_PIPELINE.indexOf(s);
  return i >= 0 && i < STAGE_PIPELINE.length - 1 ? STAGE_PIPELINE[i + 1] : null;
}

export function isTerminalStage(s: StageStatus): boolean {
  return s === "placed" || s === "rejected";
}

// ── Eligibility ───────────────────────────────────────────────────────────────

export type StudentEligibilityContext = {
  departmentId: string | null;
  cgpa?: number | null;       // null/undefined = unknown (not verifiable → not a blocker)
  backlogs?: number | null;
};

export type EligibilityResult = { eligible: boolean; reasons: string[] };

/**
 * Check a student against a drive's criteria. Department is enforced strictly
 * (we have that data); CGPA / backlog rules only block when the value is known.
 */
export function checkEligibility(
  criteria: EligibilityCriteria | null | undefined,
  ctx: StudentEligibilityContext
): EligibilityResult {
  const reasons: string[] = [];
  if (criteria) {
    const depts = criteria.departments ?? [];
    if (depts.length > 0 && (!ctx.departmentId || !depts.includes(ctx.departmentId))) {
      reasons.push("Department not eligible for this drive");
    }
    if (criteria.min_cgpa != null && ctx.cgpa != null && ctx.cgpa < criteria.min_cgpa) {
      reasons.push(`CGPA below minimum (${criteria.min_cgpa})`);
    }
    if (criteria.no_backlogs && ctx.backlogs != null && ctx.backlogs > 0) {
      reasons.push("Active backlogs not allowed");
    }
  }
  return { eligible: reasons.length === 0, reasons };
}

// ── CTC formatting ──────────────────────────────────────────────────────────

/** Format a LPA figure: 12 → "₹12.00 LPA", null → "—". */
export function formatLPA(ctc: number | null | undefined): string {
  if (ctc == null) return "—";
  return `₹${ctc.toFixed(2)} LPA`;
}

// ── Drive-level stage counts ──────────────────────────────────────────────────

export function driveStageCounts(regs: Pick<PlacementRegistration, "stage_status">[]): Record<StageStatus, number> {
  const out: Record<StageStatus, number> = {
    registered: 0, shortlisted: 0, interviewed: 0, offered: 0, rejected: 0, placed: 0,
  };
  for (const r of regs) out[r.stage_status]++;
  return out;
}

// ── Placement statistics (institution-wide, NIRF 5.2) ─────────────────────────

export type PlacementStatRow = {
  studentId: string;
  stageStatus: StageStatus;
  offerCTC: number | null;
  department: string | null;
};

export type PlacementStats = {
  registeredStudents: number;   // distinct students who registered
  placedStudents: number;       // distinct students placed
  placementRate: number;        // %
  offers: number;               // registrations at offered or placed
  avgCTC: number | null;        // mean offer_ctc of placed rows
  highestCTC: number | null;
};

export function placementStats(rows: PlacementStatRow[]): PlacementStats {
  const registered = new Set<string>();
  const placed = new Set<string>();
  let offers = 0;
  const placedCTCs: number[] = [];
  for (const r of rows) {
    registered.add(r.studentId);
    if (r.stageStatus === "offered" || r.stageStatus === "placed") offers++;
    if (r.stageStatus === "placed") {
      placed.add(r.studentId);
      if (r.offerCTC != null) placedCTCs.push(r.offerCTC);
    }
  }
  const avg = placedCTCs.length ? placedCTCs.reduce((a, b) => a + b, 0) / placedCTCs.length : null;
  return {
    registeredStudents: registered.size,
    placedStudents: placed.size,
    placementRate: registered.size ? Math.round((placed.size / registered.size) * 100) : 0,
    offers,
    avgCTC: avg == null ? null : Math.round(avg * 100) / 100,
    highestCTC: placedCTCs.length ? Math.max(...placedCTCs) : null,
  };
}

export type DeptPlacement = { department: string; registered: number; placed: number; avgCTC: number | null };

export function deptWiseBreakdown(rows: PlacementStatRow[]): DeptPlacement[] {
  const map = new Map<string, { reg: Set<string>; placed: Set<string>; ctcs: number[] }>();
  for (const r of rows) {
    const key = r.department ?? "Unassigned";
    let e = map.get(key);
    if (!e) { e = { reg: new Set(), placed: new Set(), ctcs: [] }; map.set(key, e); }
    e.reg.add(r.studentId);
    if (r.stageStatus === "placed") {
      e.placed.add(r.studentId);
      if (r.offerCTC != null) e.ctcs.push(r.offerCTC);
    }
  }
  return [...map.entries()]
    .map(([department, e]) => ({
      department,
      registered: e.reg.size,
      placed: e.placed.size,
      avgCTC: e.ctcs.length ? Math.round((e.ctcs.reduce((a, b) => a + b, 0) / e.ctcs.length) * 100) / 100 : null,
    }))
    .sort((a, b) => b.placed - a.placed || a.department.localeCompare(b.department));
}

// ── CSV exports ────────────────────────────────────────────────────────────────

function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** NIRF Criterion 5.2 — department-wise placement summary. */
export function nirfPlacementCSV(rows: DeptPlacement[]): string {
  const header = ["Department", "Registered", "Placed", "Placement %", "Avg CTC (LPA)"].join(",");
  const lines = rows.map((r) =>
    [r.department, r.registered, r.placed, r.registered ? Math.round((r.placed / r.registered) * 100) : 0, r.avgCTC ?? ""].map(csvCell).join(",")
  );
  return [header, ...lines].join("\n");
}
