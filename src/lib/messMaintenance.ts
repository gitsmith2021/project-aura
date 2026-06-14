// Phase 4C (pass 2) — mess + maintenance domain model + pure helpers.

export const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const MEAL_TYPES = ["breakfast", "lunch", "snacks", "dinner"] as const;
export type MealType = (typeof MEAL_TYPES)[number];
export const MEAL_LABEL: Record<MealType, string> = { breakfast: "Breakfast", lunch: "Lunch", snacks: "Snacks", dinner: "Dinner" };

export const MESS_PLANS = ["full", "veg_only", "non_veg", "custom"] as const;
export type MessPlan = (typeof MESS_PLANS)[number];
export const MESS_PLAN_LABEL: Record<MessPlan, string> = { full: "Full plan", veg_only: "Veg only", non_veg: "Non-veg", custom: "Custom" };
const PLAN_DEFAULT: Record<MessPlan, number> = { full: 3000, veg_only: 2500, non_veg: 3200, custom: 0 };
export function messPlanDefaultAmount(plan: MessPlan): number {
  return PLAN_DEFAULT[plan] ?? 0;
}

export const MAINTENANCE_CATEGORIES = ["electrical", "plumbing", "furniture", "cleaning", "ac_fan", "pest_control", "other"] as const;
export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number];
export const CATEGORY_LABEL: Record<MaintenanceCategory, string> = {
  electrical: "Electrical", plumbing: "Plumbing", furniture: "Furniture", cleaning: "Cleaning",
  ac_fan: "AC / Fan", pest_control: "Pest control", other: "Other",
};

export const MAINTENANCE_PRIORITIES = ["urgent", "normal", "low"] as const;
export type MaintenancePriority = (typeof MAINTENANCE_PRIORITIES)[number];

export const MAINTENANCE_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export type MaintenanceRequest = {
  id: string;
  hostel_id: string;
  room_id: string | null;
  raised_by: string;
  category: MaintenanceCategory;
  description: string;
  photo_url: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assigned_to: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type MessBill = {
  id: string;
  institution_id: string;
  student_id: string;
  hostel_id: string;
  month: string;
  plan_type: MessPlan;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
};

export function priorityRank(p: MaintenancePriority): number {
  return p === "urgent" ? 0 : p === "normal" ? 1 : 2;
}

/** Open/in-progress first, then by priority (urgent first), then newest. */
export function sortMaintenance<T extends { status: MaintenanceStatus; priority: MaintenancePriority; created_at: string }>(list: T[]): T[] {
  const openRank = (s: MaintenanceStatus) => (s === "open" ? 0 : s === "in_progress" ? 1 : s === "resolved" ? 2 : 3);
  return [...list].sort((a, b) => {
    if (openRank(a.status) !== openRank(b.status)) return openRank(a.status) - openRank(b.status);
    if (priorityRank(a.priority) !== priorityRank(b.priority)) return priorityRank(a.priority) - priorityRank(b.priority);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/** Current month as 'YYYY-MM' (local). */
export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** 'YYYY-MM' → 'June 2026'. */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
