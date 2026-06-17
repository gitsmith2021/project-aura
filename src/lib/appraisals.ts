// Phase 5E — Staff Appraisal & NAAC Workload domain model + pure helpers.

// ── Types ─────────────────────────────────────────────────────────────────────

export type AppraisalStatus = "pending" | "submitted" | "reviewed" | "completed";

export type ActivityType =
  | "paper_published" | "conference" | "fdp" | "workshop"
  | "award" | "project" | "patent" | "other";

export type StaffAppraisal = {
  id: string;
  institution_id: string;
  staff_id: string;
  academic_year_id: string | null;
  appraisal_period: string;
  teaching_score: number | null;
  research_score: number | null;
  admin_score: number | null;
  overall_score: number | null;
  self_remarks: string | null;
  feedback: string | null;
  appraised_by: string | null;
  status: AppraisalStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  staff?: { full_name: string; designation: string | null; department_id: string | null; departments?: { name: string } | null } | null;
};

export type AppraisalActivity = {
  id: string;
  appraisal_id: string;
  activity_type: ActivityType;
  title: string;
  description: string | null;
  date_of_activity: string | null;
  document_url: string | null;
  created_at: string;
};

export type WorkloadRow = {
  staffId: string;
  staffName: string;
  department: string | null;
  slots: number;                 // weekly recurring schedule slots
  plannedHoursPerWeek: number;   // sum of slot durations
  sessionsConducted: number;     // distinct sessions actually held (from attendance)
  actualHours: number;           // duration × sessions conducted, summed over slots
};

// ── Labels & colours ──────────────────────────────────────────────────────────

export const APPRAISAL_PIPELINE: AppraisalStatus[] = ["pending", "submitted", "reviewed", "completed"];

export const APPRAISAL_STATUS_LABELS: Record<AppraisalStatus, string> = {
  pending: "Pending",
  submitted: "Submitted",
  reviewed: "Reviewed",
  completed: "Completed",
};

export const APPRAISAL_STATUS_COLORS: Record<AppraisalStatus, string> = {
  pending:   "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  reviewed:  "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  paper_published: "Paper Published",
  conference: "Conference",
  fdp: "FDP",
  workshop: "Workshop",
  award: "Award",
  project: "Funded Project",
  patent: "Patent",
  other: "Other",
};

export const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  paper_published: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  conference: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  fdp: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  workshop: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  award: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  project: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
  patent: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  other: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

// ── Status flow ─────────────────────────────────────────────────────────────

export function nextAppraisalStatus(s: AppraisalStatus): AppraisalStatus | null {
  const i = APPRAISAL_PIPELINE.indexOf(s);
  return i >= 0 && i < APPRAISAL_PIPELINE.length - 1 ? APPRAISAL_PIPELINE[i + 1] : null;
}

/** Staff may still edit their self-assessment while pending or submitted. */
export function isStaffEditable(s: AppraisalStatus): boolean {
  return s === "pending" || s === "submitted";
}

/** A reviewer may assign scores once the staff has submitted (or while reviewed). */
export function canReview(s: AppraisalStatus): boolean {
  return s === "submitted" || s === "reviewed";
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export type ScoreWeights = { teaching: number; research: number; admin: number };
export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = { teaching: 0.5, research: 0.3, admin: 0.2 };

/**
 * Weighted overall score out of 100. Missing components count as 0.
 * Returns null only when all three components are null (nothing scored yet).
 */
export function computeOverallScore(
  teaching: number | null,
  research: number | null,
  admin: number | null,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS
): number | null {
  if (teaching === null && research === null && admin === null) return null;
  const t = teaching ?? 0, r = research ?? 0, a = admin ?? 0;
  const raw = t * weights.teaching + r * weights.research + a * weights.admin;
  return Math.round(raw * 100) / 100;
}

export function scoreGrade(overall: number | null): string {
  if (overall === null) return "—";
  if (overall >= 85) return "Outstanding";
  if (overall >= 70) return "Good";
  if (overall >= 50) return "Satisfactory";
  return "Needs Improvement";
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export type AppraisalStats = {
  total: number;
  pending: number;
  submitted: number;
  reviewed: number;
  completed: number;
  avgOverall: number | null;
};

export function appraisalStats(rows: Pick<StaffAppraisal, "status" | "overall_score">[]): AppraisalStats {
  const s: AppraisalStats = { total: 0, pending: 0, submitted: 0, reviewed: 0, completed: 0, avgOverall: null };
  let sum = 0, scored = 0;
  for (const r of rows) {
    s.total++;
    s[r.status]++;
    if (r.overall_score !== null && r.overall_score !== undefined) { sum += r.overall_score; scored++; }
  }
  s.avgOverall = scored > 0 ? Math.round((sum / scored) * 100) / 100 : null;
  return s;
}

/** Completion percentage (reviewed + completed) of a cycle. */
export function cycleCompletion(rows: Pick<StaffAppraisal, "status">[]): number {
  if (rows.length === 0) return 0;
  const done = rows.filter((r) => r.status === "reviewed" || r.status === "completed").length;
  return Math.round((done / rows.length) * 100);
}

// ── Workload ──────────────────────────────────────────────────────────────────

/** "HH:MM" or "HH:MM:SS" → decimal hours. Invalid → 0. */
export function timeToHours(t: string | null | undefined): number {
  if (!t) return 0;
  const [h, m] = t.split(":");
  const hh = Number(h), mm = Number(m ?? 0);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 0;
  return hh + mm / 60;
}

/** Duration of a schedule slot in hours (0 if end ≤ start). */
export function scheduleDurationHours(start: string | null, end: string | null): number {
  const d = timeToHours(end) - timeToHours(start);
  return d > 0 ? Math.round(d * 100) / 100 : 0;
}

export type WorkloadSlot = {
  staffId: string;
  staffName: string;
  department: string | null;
  durationHours: number;
  sessionsConducted: number;
};

/** Aggregate per-slot workload into per-staff rows, sorted by staff name. */
export function summarizeWorkload(slots: WorkloadSlot[]): WorkloadRow[] {
  const map = new Map<string, WorkloadRow>();
  for (const s of slots) {
    let row = map.get(s.staffId);
    if (!row) {
      row = { staffId: s.staffId, staffName: s.staffName, department: s.department, slots: 0, plannedHoursPerWeek: 0, sessionsConducted: 0, actualHours: 0 };
      map.set(s.staffId, row);
    }
    row.slots++;
    row.plannedHoursPerWeek = Math.round((row.plannedHoursPerWeek + s.durationHours) * 100) / 100;
    row.sessionsConducted += s.sessionsConducted;
    row.actualHours = Math.round((row.actualHours + s.durationHours * s.sessionsConducted) * 100) / 100;
  }
  return [...map.values()].sort((a, b) => a.staffName.localeCompare(b.staffName));
}

// ── CSV exports ────────────────────────────────────────────────────────────────

function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** NAAC faculty performance export. */
export function appraisalCSV(rows: StaffAppraisal[]): string {
  const header = ["Staff", "Designation", "Department", "Period", "Teaching", "Research", "Admin", "Overall", "Grade", "Status"].join(",");
  const lines = rows.map((r) =>
    [
      r.staff?.full_name ?? "",
      r.staff?.designation ?? "",
      r.staff?.departments?.name ?? "",
      r.appraisal_period,
      r.teaching_score, r.research_score, r.admin_score, r.overall_score,
      scoreGrade(r.overall_score),
      APPRAISAL_STATUS_LABELS[r.status],
    ].map(csvCell).join(",")
  );
  return [header, ...lines].join("\n");
}

export function workloadCSV(rows: WorkloadRow[]): string {
  const header = ["Staff", "Department", "Weekly Slots", "Planned Hrs/Week", "Sessions Conducted", "Actual Hours"].join(",");
  const lines = rows.map((r) =>
    [r.staffName, r.department ?? "", r.slots, r.plannedHoursPerWeek, r.sessionsConducted, r.actualHours].map(csvCell).join(",")
  );
  return [header, ...lines].join("\n");
}
