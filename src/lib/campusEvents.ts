// Pure helpers for Campus Events module (Phase 4K).
// No Supabase imports — all functions are unit-testable without mocking.

export const EVENT_TYPES = [
  "annual_day", "sports_day", "cultural_fest", "tech_fest",
  "convocation", "orientation", "open_day", "seminar_day", "other",
] as const;
export type CampusEventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABEL: Record<CampusEventType, string> = {
  annual_day:    "Annual Day",
  sports_day:    "Sports Day",
  cultural_fest: "Cultural Fest",
  tech_fest:     "Tech Fest",
  convocation:   "Convocation",
  orientation:   "Orientation",
  open_day:      "Open Day",
  seminar_day:   "Seminar Day",
  other:         "Other",
};

export const PARTICIPANT_ROLES = ["participant", "organizer", "performer", "volunteer"] as const;
export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number];

export const PARTICIPANT_ROLE_LABEL: Record<ParticipantRole, string> = {
  participant: "Participant",
  organizer:   "Organizer",
  performer:   "Performer",
  volunteer:   "Volunteer",
};

/** Maps a campus event type to the nearest academic_events type. */
export function toAcademicEventType(
  type: CampusEventType
): "annual_day" | "sports_day" | "cultural" | "expo" | "other" {
  switch (type) {
    case "annual_day":    return "annual_day";
    case "sports_day":    return "sports_day";
    case "cultural_fest": return "cultural";
    case "tech_fest":     return "expo";
    default:              return "other";
  }
}

/** Tailwind colour classes for event type badge. */
export function eventTypeBadgeClass(type: CampusEventType): string {
  switch (type) {
    case "annual_day":    return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300";
    case "sports_day":    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "cultural_fest": return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300";
    case "tech_fest":     return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "convocation":   return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    case "orientation":   return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300";
    case "open_day":      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
    case "seminar_day":   return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
    case "other":         return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
}

export type BudgetStatus = "no_budget" | "under" | "on_track" | "over";

/** Budget health status based on allocated vs actual spend. */
export function budgetStatus(
  allocated: number | null | undefined,
  actual: number
): BudgetStatus {
  if (!allocated) return "no_budget";
  const utilisation = actual / allocated;
  if (utilisation > 1) return "over";
  if (utilisation >= 0.9) return "on_track";
  return "under";
}

/** Percentage of budget consumed (0–∞, can exceed 100 if over budget). */
export function budgetUtilisation(
  allocated: number | null | undefined,
  actual: number
): number {
  if (!allocated || allocated === 0) return 0;
  return Math.round((actual / allocated) * 100);
}

/** Tailwind classes for budget status indicator. */
export function budgetStatusClass(status: BudgetStatus): string {
  switch (status) {
    case "over":      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    case "on_track":  return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    case "under":     return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "no_budget": return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  }
}

/** Budget bar fill width (capped at 100% for display). */
export function budgetBarWidth(allocated: number | null | undefined, actual: number): number {
  return Math.min(budgetUtilisation(allocated, actual), 100);
}

export type EventStats = {
  total: number;
  upcoming: number;
  past: number;
  totalBudgetAllocated: number;
  totalActualSpend: number;
  overBudgetCount: number;
};

export function computeEventStats(
  events: Array<{
    event_date: string;
    budget_allocated: number | null;
    actual_spend: number;
  }>,
  today = new Date().toISOString().slice(0, 10)
): EventStats {
  return {
    total:   events.length,
    upcoming: events.filter((e) => e.event_date >= today).length,
    past:     events.filter((e) => e.event_date < today).length,
    totalBudgetAllocated: events.reduce((s, e) => s + (e.budget_allocated ?? 0), 0),
    totalActualSpend:     events.reduce((s, e) => s + e.actual_spend, 0),
    overBudgetCount: events.filter(
      (e) => e.budget_allocated && e.actual_spend > e.budget_allocated
    ).length,
  };
}

/** Sort: upcoming first (asc by date), then past (desc by date). */
export function sortEvents<T extends { event_date: string }>(events: T[]): T[] {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.event_date >= today).sort(
    (a, b) => a.event_date.localeCompare(b.event_date)
  );
  const past = events.filter((e) => e.event_date < today).sort(
    (a, b) => b.event_date.localeCompare(a.event_date)
  );
  return [...upcoming, ...past];
}

export type NaacEventRow = {
  eventType: CampusEventType;
  label: string;
  count: number;
  totalParticipants: number;
};

/** NAAC Criterion 5.3 — event-type breakdown for export. */
export function computeNaacEventsReport(
  events: Array<{ event_type: CampusEventType; participantCount: number }>
): NaacEventRow[] {
  return EVENT_TYPES.map((type) => {
    const subset = events.filter((e) => e.event_type === type);
    return {
      eventType: type,
      label: EVENT_TYPE_LABEL[type],
      count: subset.length,
      totalParticipants: subset.reduce((s, e) => s + e.participantCount, 0),
    };
  }).filter((r) => r.count > 0);
}

/** Parse photo_urls JSONB safely. */
export function parsePhotoUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((u): u is string => typeof u === "string" && u.trim() !== "");
}

/** Parse organizing_committee JSONB safely. */
export type CommitteeMember = { staff_id: string; name: string; role: string };
export function parseCommittee(raw: unknown): CommitteeMember[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is CommitteeMember =>
      typeof m === "object" && m !== null &&
      "staff_id" in m && "name" in m && "role" in m
  );
}

/** Format amount in Indian locale (₹). */
export function formatBudget(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** Is the event today? */
export function isToday(dateStr: string, today = new Date().toISOString().slice(0, 10)): boolean {
  return dateStr === today;
}

/** Is the event upcoming (today or future)? */
export function isUpcoming(dateStr: string, today = new Date().toISOString().slice(0, 10)): boolean {
  return dateStr >= today;
}
