// Fee Demand & Collection domain model + pure helpers (unit-testable).

export type DemandStoredStatus = "pending" | "partial" | "paid" | "waived" | "cancelled";
/** What we actually display: pending/partial/paid are derived from balance. */
export type DemandLiveStatus = "pending" | "partial" | "paid" | "waived" | "cancelled" | "overdue";

export const DEMAND_STATUS_LABELS: Record<DemandLiveStatus, string> = {
  pending: "Pending",
  partial: "Part-paid",
  paid: "Paid",
  waived: "Waived",
  cancelled: "Cancelled",
  overdue: "Overdue",
};

export const DEMAND_STATUS_COLORS: Record<DemandLiveStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  partial: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  waived: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  cancelled: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  overdue: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

export type FeeDemand = {
  id: string;
  institution_id: string;
  student_id: string;
  fee_structure_id: string;
  academic_year_id: string | null;
  title: string;
  amount_due: number;
  concession_amount: number;
  net_due: number;
  due_date: string;
  status: DemandStoredStatus;
  created_at: string;
  // joined / derived
  amount_paid?: number;
  students?: { full_name: string; roll_no: string | null } | null;
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

/** Outstanding balance = net_due − paid, never negative. */
export function balance(netDue: number, paid: number): number {
  return Math.max(0, Math.round((netDue - paid) * 100) / 100);
}

/** Live status: waived/cancelled are sticky; otherwise derive from paid vs due,
 *  upgrading an unpaid past-due demand to "overdue". */
export function demandStatus(
  d: { net_due: number; status: DemandStoredStatus; due_date: string },
  paid: number,
  asOf: Date = new Date()
): DemandLiveStatus {
  if (d.status === "waived" || d.status === "cancelled") return d.status;
  const bal = balance(d.net_due, paid);
  if (bal <= 0) return "paid";
  // unpaid or part-paid
  const due = new Date(`${d.due_date}T23:59:59`);
  if (due.getTime() < asOf.getTime()) return "overdue";
  return paid > 0 ? "partial" : "pending";
}

export function isOverdue(
  d: { net_due: number; status: DemandStoredStatus; due_date: string },
  paid: number,
  asOf: Date = new Date()
): boolean {
  return demandStatus(d, paid, asOf) === "overdue";
}

export function daysOverdue(dueDate: string, asOf: Date = new Date()): number {
  const due = new Date(`${dueDate}T23:59:59`).getTime();
  if (asOf.getTime() <= due) return 0;
  return Math.floor((asOf.getTime() - due) / 86_400_000);
}

/** Concession from a fixed amount and/or a percentage of the gross, capped at gross. */
export function concessionFor(amountDue: number, fixed = 0, percentage = 0): number {
  const pct = (percentage / 100) * amountDue;
  return Math.min(amountDue, Math.round((fixed + pct) * 100) / 100);
}

export type DemandTally = {
  count: number;
  demanded: number;   // total net_due
  collected: number;  // total paid (capped at net per demand)
  outstanding: number;
  overdue: number;    // count of overdue demands
};

export function demandTally(
  rows: { net_due: number; status: DemandStoredStatus; due_date: string; amount_paid?: number }[],
  asOf: Date = new Date()
): DemandTally {
  let demanded = 0, collected = 0, outstanding = 0, overdue = 0;
  for (const r of rows) {
    if (r.status === "cancelled") continue;
    const paid = r.amount_paid ?? 0;
    const live = demandStatus(r, paid, asOf);
    if (r.status === "waived") { demanded += 0; continue; }
    demanded += r.net_due;
    collected += Math.min(paid, r.net_due);
    outstanding += balance(r.net_due, paid);
    if (live === "overdue") overdue++;
  }
  return { count: rows.length, demanded, collected, outstanding, overdue };
}

export function inr(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
