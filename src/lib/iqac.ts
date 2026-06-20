// ─────────────────────────────────────────────────────────────
// IQAC & Compliance — pure domain helpers (Phase 7F)
// Meeting/action-item status metadata, NAAC 6.1 compliance maths and
// criterion-completeness banding. No I/O — unit-tested.
// ─────────────────────────────────────────────────────────────

export type MeetingStatus = "scheduled" | "completed" | "minutes_pending";

export const MEETING_STATUSES: MeetingStatus[] = ["scheduled", "completed", "minutes_pending"];

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  scheduled: "Scheduled", completed: "Completed", minutes_pending: "Minutes pending",
};

export const MEETING_STATUS_STYLES: Record<MeetingStatus, string> = {
  scheduled: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  minutes_pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
};

export type ActionStatus = "open" | "in_progress" | "completed" | "deferred";

export const ACTION_STATUSES: ActionStatus[] = ["open", "in_progress", "completed", "deferred"];

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  open: "Open", in_progress: "In progress", completed: "Completed", deferred: "Deferred",
};

export const ACTION_STATUS_STYLES: Record<ActionStatus, string> = {
  open: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  in_progress: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  deferred: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
};

/** NAAC Criterion 6.1 expects at least this many IQAC meetings per academic year. */
export const NAAC_MIN_MEETINGS_PER_YEAR = 2;

// ── Meeting stats ─────────────────────────────────────────────────────────────

export type MeetingStats = {
  total: number; completed: number; minutesPending: number; scheduled: number; compliant: boolean;
};

export function meetingStats(meetings: { status: MeetingStatus }[]): MeetingStats {
  let completed = 0, minutesPending = 0, scheduled = 0;
  for (const m of meetings) {
    if (m.status === "completed") completed++;
    else if (m.status === "minutes_pending") minutesPending++;
    else scheduled++;
  }
  return { total: meetings.length, completed, minutesPending, scheduled, compliant: meetings.length >= NAAC_MIN_MEETINGS_PER_YEAR };
}

// ── Action-item stats ─────────────────────────────────────────────────────────

export type ActionStats = {
  total: number; open: number; inProgress: number; completed: number; deferred: number; resolvedPct: number;
};

export function actionStats(items: { status: ActionStatus }[]): ActionStats {
  let open = 0, inProgress = 0, completed = 0, deferred = 0;
  for (const i of items) {
    if (i.status === "open") open++;
    else if (i.status === "in_progress") inProgress++;
    else if (i.status === "completed") completed++;
    else deferred++;
  }
  const total = items.length;
  return { total, open, inProgress, completed, deferred, resolvedPct: total ? Math.round((completed / total) * 1000) / 10 : 0 };
}

/** An action item is overdue when past its due date and not completed/deferred. */
export function isActionOverdue(dueDate: string | null | undefined, status: ActionStatus, today: Date = new Date()): boolean {
  if (!dueDate || status === "completed" || status === "deferred") return false;
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return new Date(`${dueDate}T00:00:00`).getTime() < base.getTime();
}

// ── Criterion completeness banding ────────────────────────────────────────────

export type CompletenessBand = "strong" | "partial" | "low" | "empty";

export function completenessBand(pct: number): CompletenessBand {
  if (pct <= 0) return "empty";
  if (pct >= 80) return "strong";
  if (pct >= 40) return "partial";
  return "low";
}

export const BAND_COLOR: Record<CompletenessBand, string> = {
  strong: "rgb(16 185 129)",  // emerald
  partial: "rgb(245 158 11)", // amber
  low: "rgb(244 63 94)",      // rose
  empty: "rgb(148 163 184)",  // slate
};
