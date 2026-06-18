// Phase 5H — Disciplinary Records & Anti-Ragging domain model + pure helpers.

export type IncidentType =
  | "misconduct" | "ragging" | "attendance_violation"
  | "exam_malpractice" | "property_damage" | "other";

export type IncidentStatus = "reported" | "under_review" | "resolved" | "escalated";

export type ActionType =
  | "verbal_warning" | "written_warning" | "suspension"
  | "fine" | "expulsion" | "counseling" | "other";

export type DisciplinaryIncident = {
  id: string;
  institution_id: string;
  reported_by: string | null;
  student_id: string | null;
  incident_type: IncidentType;
  incident_date: string;
  location: string | null;
  description: string;
  is_anonymous: boolean;
  status: IncidentStatus;
  committee_remarks: string | null;
  action_taken: string | null;
  resolved_at: string | null;
  created_at: string;
  students?: { full_name: string; roll_no: string | null } | null;
  action_count?: number;
};

export type DisciplinaryAction = {
  id: string;
  incident_id: string;
  action_type: ActionType;
  effective_date: string;
  duration_days: number | null;
  fine_amount: number | null;
  remarks: string | null;
  issued_by: string | null;
  document_url: string | null;
  created_at: string;
  staff?: { full_name: string } | null;
};

// ── Labels & colours ──────────────────────────────────────────────────────────

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  misconduct: "Misconduct",
  ragging: "Ragging",
  attendance_violation: "Attendance Violation",
  exam_malpractice: "Exam Malpractice",
  property_damage: "Property Damage",
  other: "Other",
};

export const INCIDENT_TYPE_COLORS: Record<IncidentType, string> = {
  misconduct:           "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  ragging:              "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  attendance_violation: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  exam_malpractice:     "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300",
  property_damage:      "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  other:                "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export const INCIDENT_TYPES = Object.keys(INCIDENT_TYPE_LABELS) as IncidentType[];

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: "Reported",
  under_review: "Under Review",
  resolved: "Resolved",
  escalated: "Escalated",
};

export const INCIDENT_STATUS_COLORS: Record<IncidentStatus, string> = {
  reported:     "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  under_review: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  resolved:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  escalated:    "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

export const INCIDENT_STATUSES = Object.keys(INCIDENT_STATUS_LABELS) as IncidentStatus[];

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  verbal_warning: "Verbal Warning",
  written_warning: "Written Warning",
  suspension: "Suspension",
  fine: "Fine",
  expulsion: "Expulsion",
  counseling: "Counseling",
  other: "Other",
};

export const ACTION_TYPE_COLORS: Record<ActionType, string> = {
  verbal_warning:  "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  written_warning: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  suspension:      "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  fine:            "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  expulsion:       "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  counseling:      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  other:           "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export const ACTION_TYPES = Object.keys(ACTION_TYPE_LABELS) as ActionType[];

export function isOpenStatus(s: IncidentStatus): boolean {
  return s === "reported" || s === "under_review";
}

// ── Filtering ─────────────────────────────────────────────────────────────────

export type IncidentFilter = {
  type?: IncidentType | "all";
  status?: IncidentStatus | "all";
  search?: string;
};

export function filterIncidents(rows: DisciplinaryIncident[], f: IncidentFilter): DisciplinaryIncident[] {
  const q = f.search?.trim().toLowerCase() ?? "";
  return rows.filter((r) => {
    if (f.type && f.type !== "all" && r.incident_type !== f.type) return false;
    if (f.status && f.status !== "all" && r.status !== f.status) return false;
    if (q) {
      const hay = `${r.description} ${r.students?.full_name ?? ""} ${r.students?.roll_no ?? ""} ${r.location ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// ── Stats (NAAC 6.2 evidence) ─────────────────────────────────────────────────

export type DisciplinaryStats = {
  total: number;
  open: number;            // reported + under_review
  resolved: number;
  escalated: number;
  raggingCases: number;
  resolutionRate: number;  // % resolved of all
};

export function disciplinaryStats(rows: Pick<DisciplinaryIncident, "status" | "incident_type">[]): DisciplinaryStats {
  const s: DisciplinaryStats = { total: 0, open: 0, resolved: 0, escalated: 0, raggingCases: 0, resolutionRate: 0 };
  for (const r of rows) {
    s.total++;
    if (r.status === "reported" || r.status === "under_review") s.open++;
    else if (r.status === "resolved") s.resolved++;
    else if (r.status === "escalated") s.escalated++;
    if (r.incident_type === "ragging") s.raggingCases++;
  }
  s.resolutionRate = s.total ? Math.round((s.resolved / s.total) * 100) : 0;
  return s;
}

export function byTypeBreakdown(rows: Pick<DisciplinaryIncident, "incident_type">[]): { type: IncidentType; count: number }[] {
  const map = new Map<IncidentType, number>();
  for (const r of rows) map.set(r.incident_type, (map.get(r.incident_type) ?? 0) + 1);
  return [...map.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
}

// ── CSV export ────────────────────────────────────────────────────────────────

function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** NAAC Criterion 6.2 — disciplinary mechanism evidence. */
export function incidentsCSV(rows: DisciplinaryIncident[]): string {
  const header = ["Date", "Type", "Student", "Status", "Action Taken", "Anonymous"].join(",");
  const lines = rows.map((r) =>
    [
      r.incident_date,
      INCIDENT_TYPE_LABELS[r.incident_type],
      r.is_anonymous ? "—" : (r.students?.full_name ?? "—"),
      INCIDENT_STATUS_LABELS[r.status],
      r.action_taken ?? "",
      r.is_anonymous ? "Yes" : "No",
    ].map(csvCell).join(",")
  );
  return [header, ...lines].join("\n");
}
