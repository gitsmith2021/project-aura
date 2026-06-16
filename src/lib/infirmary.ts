// Pure helpers for the Infirmary module (Phase 4I).
// No Supabase imports — all functions are unit-testable without mocking.

export type MedicineEntry = {
  name: string;
  dosage: string;
  quantity: string;
};

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export type FollowUpStatus = "none" | "today" | "upcoming" | "overdue";

export type InfirmaryStats = {
  todayVisits: number;
  pendingFollowUps: number;
  referralsThisMonth: number;
  totalThisMonth: number;
};

/** Parse the JSONB medicines_dispensed column into typed entries. */
export function parseMedicines(raw: unknown): MedicineEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is MedicineEntry =>
      typeof m === "object" && m !== null && typeof (m as Record<string, unknown>).name === "string"
  );
}

/** True when a follow-up date is in the past (before today's midnight).
 *  `now` is injectable so the logic is deterministically unit-testable. */
export function isOverdueFollowUp(followUpDate: string | null | undefined, now: Date = new Date()): boolean {
  if (!followUpDate) return false;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const fup = new Date(followUpDate);
  fup.setHours(0, 0, 0, 0);
  return fup < today;
}

/** Classify a follow-up date relative to today. */
export function followUpStatus(followUpDate: string | null | undefined, now: Date = new Date()): FollowUpStatus {
  if (!followUpDate) return "none";
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const fup = new Date(followUpDate);
  fup.setHours(0, 0, 0, 0);
  if (fup.getTime() === today.getTime()) return "today";
  if (fup < today) return "overdue";
  return "upcoming";
}

/** Aggregate stats for the infirmary dashboard header. */
export function computeInfirmaryStats(
  visits: Array<{
    visit_date: string;
    follow_up_date: string | null;
    referred_to: string | null;
  }>,
  now: Date = new Date()
): InfirmaryStats {
  const todayStr = new Date(now).toDateString();
  const thisMonth = new Date(now).toISOString().slice(0, 7);
  return {
    todayVisits: visits.filter(
      (v) => new Date(v.visit_date).toDateString() === todayStr
    ).length,
    pendingFollowUps: visits.filter((v) => {
      const s = followUpStatus(v.follow_up_date, now);
      return s === "today" || s === "overdue";
    }).length,
    referralsThisMonth: visits.filter(
      (v) => v.referred_to && v.visit_date.slice(0, 7) === thisMonth
    ).length,
    totalThisMonth: visits.filter(
      (v) => v.visit_date.slice(0, 7) === thisMonth
    ).length,
  };
}

/** Short display label for a single medicine entry. */
export function medicineLabel(m: MedicineEntry): string {
  const parts: string[] = [m.name];
  if (m.dosage) parts.push(m.dosage);
  if (m.quantity) parts.push(`× ${m.quantity}`);
  return parts.join(" — ");
}

/** Colour token for the follow-up badge. */
export function followUpBadgeClass(status: FollowUpStatus): string {
  switch (status) {
    case "overdue":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    case "today":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    case "upcoming":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    default:
      return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  }
}
