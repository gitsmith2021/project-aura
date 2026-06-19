// ─────────────────────────────────────────────────────────────
// SaaS Subscriptions & Billing — pure domain helpers (Phase 7E)
// Plan/feature catalog, MRR/ARR maths, trial countdown and limit
// checks. No I/O — unit-tested. Razorpay recurring is deferred; the
// money maths here is the source of truth for the operator dashboard.
// ─────────────────────────────────────────────────────────────

export type FeatureKey =
  | "core" | "parent_portal" | "transport" | "certificates" | "online_exams"
  | "feedback" | "grievances" | "lms" | "industry_connect" | "cctv";

export type FeatureMeta = { key: FeatureKey; label: string; premium: boolean };

/** The module catalog plans gate on. `core` is always included. */
export const FEATURES: FeatureMeta[] = [
  { key: "core", label: "Core ERP (academics, finance, attendance)", premium: false },
  { key: "parent_portal", label: "Parent Portal", premium: false },
  { key: "certificates", label: "Certificates & Documents", premium: false },
  { key: "feedback", label: "Student Feedback", premium: false },
  { key: "grievances", label: "Grievance Redressal", premium: false },
  { key: "transport", label: "Transport Management", premium: true },
  { key: "online_exams", label: "Online Examinations", premium: true },
  { key: "lms", label: "E-Learning (LMS)", premium: true },
  { key: "industry_connect", label: "Industry Connect & MOUs", premium: true },
  { key: "cctv", label: "CCTV / Surveillance", premium: true },
];

export const FEATURE_LABELS: Record<FeatureKey, string> = Object.fromEntries(
  FEATURES.map((f) => [f.key, f.label])
) as Record<FeatureKey, string>;

export function planHasFeature(features: string[] | null | undefined, key: FeatureKey): boolean {
  return Array.isArray(features) && features.includes(key);
}

// ── Status ────────────────────────────────────────────────────────────────────

export type BillingCycle = "monthly" | "annual";
export type SubStatus = "active" | "trial" | "expired" | "cancelled";

export const STATUS_LABELS: Record<SubStatus, string> = {
  active: "Active", trial: "Trial", expired: "Expired", cancelled: "Cancelled",
};

export const STATUS_STYLES: Record<SubStatus, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  trial: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  expired: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  cancelled: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

/** Whole days until expiry (negative if past). Null when there's no expiry date. */
export function daysLeft(expiresAt: string | null | undefined, now: Date = new Date()): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - now.getTime();
  return Math.ceil(ms / 86_400_000);
}

/** Effective status: an active/trial sub past its expiry reads as expired. */
export function effectiveStatus(status: SubStatus, expiresAt: string | null | undefined, now: Date = new Date()): SubStatus {
  if (status === "cancelled" || status === "expired") return status;
  const d = daysLeft(expiresAt, now);
  if (d !== null && d < 0) return "expired";
  return status;
}

// ── Money ─────────────────────────────────────────────────────────────────────

export type PlanLike = { price_monthly: number; price_annual: number | null };

/** Monthly-equivalent revenue for a plan on a given cycle. */
export function planMonthlyEquivalent(plan: PlanLike, cycle: BillingCycle): number {
  if (cycle === "annual") {
    const annual = plan.price_annual ?? plan.price_monthly * 12;
    return Math.round((annual / 12) * 100) / 100;
  }
  return plan.price_monthly;
}

export type SubLike = { status: SubStatus; billing_cycle: BillingCycle; expires_at: string | null; plan: PlanLike | null };

/** Monthly Recurring Revenue: paying (effective-active) subscriptions only. */
export function mrr(subs: SubLike[], now: Date = new Date()): number {
  let total = 0;
  for (const s of subs) {
    if (!s.plan) continue;
    if (effectiveStatus(s.status, s.expires_at, now) !== "active") continue;
    total += planMonthlyEquivalent(s.plan, s.billing_cycle);
  }
  return Math.round(total * 100) / 100;
}

export function arr(subs: SubLike[], now: Date = new Date()): number {
  return Math.round(mrr(subs, now) * 12 * 100) / 100;
}

// ── Limits ────────────────────────────────────────────────────────────────────

export type LimitCheck = { studentsOver: boolean; staffOver: boolean; studentPct: number | null; staffPct: number | null };

/** Whether an institution's usage exceeds its plan caps (null cap = unlimited). */
export function withinLimits(plan: { max_students: number | null; max_staff: number | null }, students: number, staff: number): LimitCheck {
  const studentPct = plan.max_students ? Math.round((students / plan.max_students) * 100) : null;
  const staffPct = plan.max_staff ? Math.round((staff / plan.max_staff) * 100) : null;
  return {
    studentsOver: plan.max_students !== null && students > plan.max_students,
    staffOver: plan.max_staff !== null && staff > plan.max_staff,
    studentPct,
    staffPct,
  };
}

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return `₹${amount.toLocaleString("en-IN")}`;
}

/** ("2026", 7) → "INV/2026/0007". */
export function invoiceNumber(year: number, seq: number): string {
  return `INV/${year}/${String(seq).padStart(4, "0")}`;
}
