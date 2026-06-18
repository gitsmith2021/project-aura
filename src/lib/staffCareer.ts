// Phase 5K — Staff Career Lifecycle domain model + pure helpers.
// No Supabase imports — unit-testable without mocking.

export type CareerEventType =
  | "joining" | "confirmation" | "promotion" | "increment"
  | "transfer" | "resignation" | "retirement" | "termination" | "other";

export type StaffCareerEvent = {
  id: string;
  institution_id: string;
  staff_id: string;
  event_type: CareerEventType;
  effective_date: string;
  previous_value: string | null;
  new_value: string | null;
  order_number: string | null;
  document_url: string | null;
  remarks: string | null;
  recorded_by: string | null;
  created_at: string;
  staff?: {
    full_name: string;
    designation: string | null;
    department_id: string | null;
    departments?: { name: string } | null;
  } | null;
};

export const CAREER_EVENT_TYPES: CareerEventType[] = [
  "joining", "confirmation", "promotion", "increment",
  "transfer", "resignation", "retirement", "termination", "other",
];

export const CAREER_EVENT_LABELS: Record<CareerEventType, string> = {
  joining: "Joining",
  confirmation: "Confirmation",
  promotion: "Promotion",
  increment: "Increment",
  transfer: "Transfer",
  resignation: "Resignation",
  retirement: "Retirement",
  termination: "Termination",
  other: "Other",
};

export const CAREER_EVENT_COLORS: Record<CareerEventType, string> = {
  joining:      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  confirmation: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  promotion:    "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  increment:    "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  transfer:     "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  resignation:  "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  retirement:   "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  termination:  "bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
  other:        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

/** Offboarding events deactivate the staff record (staff.is_active = false). */
export const OFFBOARDING_EVENT_TYPES: CareerEventType[] = ["resignation", "retirement", "termination"];

export function isOffboardingEvent(type: CareerEventType): boolean {
  return OFFBOARDING_EVENT_TYPES.includes(type);
}

/** Years of continuous service from a joining date, to one decimal place. */
export function serviceYears(
  joiningDate: string | null | undefined,
  asOf: Date = new Date()
): number | null {
  if (!joiningDate) return null;
  const start = new Date(joiningDate);
  if (Number.isNaN(start.getTime())) return null;
  const ms = asOf.getTime() - start.getTime();
  if (ms < 0) return 0;
  return Math.round((ms / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10;
}

/** Human label, e.g. "5.3 years" / "< 1 year". */
export function formatServiceYears(years: number | null): string {
  if (years === null) return "—";
  if (years < 1) return "< 1 year";
  return `${years} ${years === 1 ? "year" : "years"}`;
}

/** Chronological order (oldest first) — the natural reading order for a timeline. */
export function sortEventsByDate(events: StaffCareerEvent[]): StaffCareerEvent[] {
  return [...events].sort((a, b) => a.effective_date.localeCompare(b.effective_date));
}

export type CareerStats = {
  total: number;
  byType: Record<CareerEventType, number>;
  promotions: number;
  increments: number;
  offboarded: number;
};

export function careerStats(events: StaffCareerEvent[]): CareerStats {
  const byType = CAREER_EVENT_TYPES.reduce((acc, t) => {
    acc[t] = 0;
    return acc;
  }, {} as Record<CareerEventType, number>);
  for (const e of events) byType[e.event_type] += 1;
  return {
    total: events.length,
    byType,
    promotions: byType.promotion,
    increments: byType.increment,
    offboarded: byType.resignation + byType.retirement + byType.termination,
  };
}

export function filterCareerEvents(
  events: StaffCareerEvent[],
  filters: { eventType?: CareerEventType | "all"; search?: string }
): StaffCareerEvent[] {
  let rows = events;
  if (filters.eventType && filters.eventType !== "all") {
    rows = rows.filter((e) => e.event_type === filters.eventType);
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    rows = rows.filter(
      (e) =>
        (e.staff?.full_name ?? "").toLowerCase().includes(q) ||
        (e.order_number ?? "").toLowerCase().includes(q) ||
        (e.new_value ?? "").toLowerCase().includes(q)
    );
  }
  return rows;
}

export function careerEventsCSV(events: StaffCareerEvent[]): string {
  const header = [
    "Staff", "Department", "Event Type", "Effective Date",
    "Previous Value", "New Value", "Order Number", "Remarks",
  ];
  const rows = events.map((e) => [
    e.staff?.full_name ?? "",
    e.staff?.departments?.name ?? "",
    CAREER_EVENT_LABELS[e.event_type],
    e.effective_date,
    e.previous_value ?? "",
    e.new_value ?? "",
    e.order_number ?? "",
    e.remarks ?? "",
  ]);
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [header, ...rows].map((r) => r.map((c) => esc(String(c))).join(",")).join("\n");
}
