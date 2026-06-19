// Phase 6F — Grievance Redressal System (NAAC 6.2) domain model + pure helpers.
// No Supabase / React imports so the SLA / stats / pipeline logic stays
// unit-testable. Server actions (src/actions/grievances.ts) build on these.

export type ComplainantType = "student" | "staff" | "anonymous";

export type GrievanceCategory =
  | "academic" | "financial" | "infrastructure" | "staff_conduct"
  | "harassment" | "ragging" | "other";

export type GrievanceStatus =
  | "submitted" | "acknowledged" | "under_review" | "resolved" | "escalated" | "closed";

export type Grievance = {
  id: string;
  institution_id: string;
  submitted_by: string | null;
  complainant_type: ComplainantType;
  category: GrievanceCategory;
  subject: string;
  description: string;
  evidence_url: unknown | null;
  status: GrievanceStatus;
  assigned_to: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  deadline: string | null;
  created_at: string;
  staff?: { full_name: string } | null;
};

// ── Labels & colours ──────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<GrievanceCategory, string> = {
  academic: "Academic",
  financial: "Financial",
  infrastructure: "Infrastructure",
  staff_conduct: "Staff Conduct",
  harassment: "Harassment",
  ragging: "Ragging",
  other: "Other",
};

export const CATEGORY_COLORS: Record<GrievanceCategory, string> = {
  academic:       "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  financial:      "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  infrastructure: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  staff_conduct:  "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  harassment:     "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  ragging:        "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  other:          "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export const GRIEVANCE_CATEGORIES = Object.keys(CATEGORY_LABELS) as GrievanceCategory[];

/** Sensitive categories default to the anonymous option being pre-selected. */
export const SENSITIVE_CATEGORIES: GrievanceCategory[] = ["harassment", "ragging", "staff_conduct"];

export function isSensitiveCategory(c: GrievanceCategory): boolean {
  return SENSITIVE_CATEGORIES.includes(c);
}

export const STATUS_LABELS: Record<GrievanceStatus, string> = {
  submitted: "Submitted",
  acknowledged: "Acknowledged",
  under_review: "Under Review",
  resolved: "Resolved",
  escalated: "Escalated",
  closed: "Closed",
};

export const STATUS_COLORS: Record<GrievanceStatus, string> = {
  submitted:    "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  acknowledged: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  under_review: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  resolved:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  escalated:    "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  closed:       "bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
};

export const GRIEVANCE_STATUSES = Object.keys(STATUS_LABELS) as GrievanceStatus[];

/** Pipeline columns (kanban), in workflow order. Resolved/closed/escalated are
 *  terminal-ish and shown in the resolved column group, not the active board. */
export const PIPELINE_STAGES: GrievanceStatus[] = [
  "submitted", "acknowledged", "under_review", "resolved",
];

const OPEN_STATUSES: GrievanceStatus[] = ["submitted", "acknowledged", "under_review", "escalated"];

export function isOpenStatus(s: GrievanceStatus): boolean {
  return OPEN_STATUSES.includes(s);
}

/** A grievance counts as resolved-for-SLA once it is resolved or closed. */
export function isResolvedStatus(s: GrievanceStatus): boolean {
  return s === "resolved" || s === "closed";
}

// ── SLA / deadline ────────────────────────────────────────────────────────────

/** NAAC 6.2 best-practice target: grievances resolved within 30 days. */
export const SLA_DAYS = 30;

export function daysBetween(fromISO: string, toISO: string): number {
  const ms = new Date(toISO).getTime() - new Date(fromISO).getTime();
  return Math.floor(ms / 86_400_000);
}

/** Whole days until the deadline (negative = overdue). null when no deadline. */
export function daysToDeadline(deadline: string | null, now: Date = new Date()): number | null {
  if (!deadline) return null;
  const end = new Date(`${deadline}T23:59:59`);
  return Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
}

/** An open grievance past its deadline is overdue. Resolved/closed never are. */
export function isOverdue(g: Pick<Grievance, "status" | "deadline">, now: Date = new Date()): boolean {
  if (!g.deadline || isResolvedStatus(g.status)) return false;
  const d = daysToDeadline(g.deadline, now);
  return d !== null && d < 0;
}

/** Default deadline = filed date + SLA_DAYS, as a yyyy-mm-dd string. */
export function defaultDeadline(createdAtISO: string): string {
  const d = new Date(createdAtISO);
  d.setDate(d.getDate() + SLA_DAYS);
  return d.toISOString().slice(0, 10);
}

// ── Filtering ─────────────────────────────────────────────────────────────────

export type GrievanceFilter = {
  category?: GrievanceCategory | "all";
  status?: GrievanceStatus | "all";
  search?: string;
};

export function filterGrievances(rows: Grievance[], f: GrievanceFilter): Grievance[] {
  const q = f.search?.trim().toLowerCase() ?? "";
  return rows.filter((r) => {
    if (f.category && f.category !== "all" && r.category !== f.category) return false;
    if (f.status && f.status !== "all" && r.status !== f.status) return false;
    if (q) {
      const hay = `${r.subject} ${r.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// ── Stats (NAAC 6.2 evidence) ─────────────────────────────────────────────────

export type GrievanceStats = {
  total: number;
  open: number;
  resolved: number;
  escalated: number;
  overdue: number;
  anonymous: number;
  resolutionRate: number;       // % resolved (resolved+closed) of all
  withinSlaRate: number;        // % of resolved cases closed within SLA_DAYS
  avgDaysToResolve: number | null;
};

export function grievanceStats(rows: Grievance[], now: Date = new Date()): GrievanceStats {
  const s: GrievanceStats = {
    total: 0, open: 0, resolved: 0, escalated: 0, overdue: 0, anonymous: 0,
    resolutionRate: 0, withinSlaRate: 0, avgDaysToResolve: null,
  };
  let resolveDaysSum = 0;
  let resolvedWithTimestamp = 0;
  let withinSla = 0;

  for (const r of rows) {
    s.total++;
    if (isResolvedStatus(r.status)) s.resolved++;
    else s.open++;
    if (r.status === "escalated") s.escalated++;
    if (r.complainant_type === "anonymous") s.anonymous++;
    if (isOverdue(r, now)) s.overdue++;

    if (isResolvedStatus(r.status) && r.resolved_at) {
      const d = daysBetween(r.created_at, r.resolved_at);
      resolveDaysSum += d;
      resolvedWithTimestamp++;
      if (d <= SLA_DAYS) withinSla++;
    }
  }

  s.resolutionRate = s.total ? Math.round((s.resolved / s.total) * 100) : 0;
  s.withinSlaRate = resolvedWithTimestamp ? Math.round((withinSla / resolvedWithTimestamp) * 100) : 0;
  s.avgDaysToResolve = resolvedWithTimestamp ? Math.round(resolveDaysSum / resolvedWithTimestamp) : null;
  return s;
}

export function byCategoryBreakdown(rows: Pick<Grievance, "category">[]): { category: GrievanceCategory; count: number }[] {
  const map = new Map<GrievanceCategory, number>();
  for (const r of rows) map.set(r.category, (map.get(r.category) ?? 0) + 1);
  return [...map.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
}

// ── CSV export ────────────────────────────────────────────────────────────────

function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** NAAC Criterion 6.2 — grievance redressal mechanism evidence. */
export function grievancesCSV(rows: Grievance[]): string {
  const header = ["Filed", "Category", "Subject", "Complainant", "Status", "Assigned To", "Deadline", "Resolved", "Days to Resolve"].join(",");
  const lines = rows.map((r) =>
    [
      r.created_at.slice(0, 10),
      CATEGORY_LABELS[r.category],
      r.subject,
      r.complainant_type === "anonymous" ? "Anonymous" : r.complainant_type,
      STATUS_LABELS[r.status],
      r.staff?.full_name ?? "",
      r.deadline ?? "",
      r.resolved_at ? r.resolved_at.slice(0, 10) : "",
      isResolvedStatus(r.status) && r.resolved_at ? daysBetween(r.created_at, r.resolved_at) : "",
    ].map(csvCell).join(",")
  );
  return [header, ...lines].join("\n");
}
