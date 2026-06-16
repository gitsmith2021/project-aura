// ─────────────────────────────────────────────────────────────────────────────
// Staff type helpers — pure functions, no Supabase imports (Dev Rule 18)
// ─────────────────────────────────────────────────────────────────────────────

export type StaffType =
  | "teaching"
  | "non-teaching_office"
  | "non-teaching_warden"
  | "non-teaching_mess"
  | "non-teaching_support";

export const STAFF_TYPES: StaffType[] = [
  "teaching",
  "non-teaching_office",
  "non-teaching_warden",
  "non-teaching_mess",
  "non-teaching_support",
];

export const STAFF_TYPE_LABELS: Record<StaffType, string> = {
  teaching: "Teaching Staff",
  "non-teaching_office": "Office / Admin Staff",
  "non-teaching_warden": "Hostel Warden",
  "non-teaching_mess": "Mess / Canteen Staff",
  "non-teaching_support": "Support / Daily Wage",
};

export const STAFF_TYPE_COLORS: Record<StaffType, string> = {
  teaching: "bg-violet-100 text-violet-700 border-violet-200",
  "non-teaching_office": "bg-blue-100 text-blue-700 border-blue-200",
  "non-teaching_warden": "bg-amber-100 text-amber-700 border-amber-200",
  "non-teaching_mess": "bg-orange-100 text-orange-700 border-orange-200",
  "non-teaching_support": "bg-slate-100 text-slate-700 border-slate-200",
};

export function staffTypeLabel(type: StaffType): string {
  return STAFF_TYPE_LABELS[type] ?? type;
}

export function staffTypeColor(type: StaffType): string {
  return STAFF_TYPE_COLORS[type] ?? STAFF_TYPE_COLORS.teaching;
}

/** Returns true for any non-teaching subtype. */
export function isNonTeaching(type: StaffType): boolean {
  return type !== "teaching";
}

/** Returns true only for support staff paid a daily wage (not a monthly salary). */
export function isDailyWage(type: StaffType): boolean {
  return type === "non-teaching_support";
}

/** Returns true for wardens (shown on the hostel link widget). */
export function isWarden(type: StaffType): boolean {
  return type === "non-teaching_warden";
}

/**
 * Compute total daily-wage amount for a given month.
 * @param dailyWageRate  Rate per working day (NUMERIC from DB)
 * @param workingDays    Number of days the institution was open that month
 * @param daysPresent    Days the staff member actually attended (≤ workingDays)
 */
export function computeDailyWageAmount(
  dailyWageRate: number,
  workingDays: number,
  daysPresent: number,
): number {
  if (dailyWageRate <= 0 || workingDays <= 0) return 0;
  const effectiveDays = Math.min(Math.max(0, daysPresent), workingDays);
  return parseFloat((dailyWageRate * effectiveDays).toFixed(2));
}

/** Format a StaffType into a human-readable group label for display. */
export function staffTypeGroup(type: StaffType): "teaching" | "non-teaching" {
  return type === "teaching" ? "teaching" : "non-teaching";
}
