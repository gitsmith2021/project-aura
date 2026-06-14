// Phase 4B — Venue booking domain model + pure helpers (unit-testable).

export const VENUE_TYPES = ["auditorium", "seminar_hall", "lab", "conference_room", "ground", "other"] as const;
export type VenueType = (typeof VENUE_TYPES)[number];

export const BOOKING_STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuses that occupy a slot — a new/approved booking conflicts with these. */
export const BLOCKING_STATUSES: BookingStatus[] = ["pending", "approved"];

export type Venue = {
  id: string;
  institution_id: string;
  name: string;
  venue_type: VenueType;
  capacity: number | null;
  amenities: string[] | null;
  is_active: boolean;
  created_at: string;
};

export type VenueBooking = {
  id: string;
  institution_id: string;
  venue_id: string;
  booked_by: string;
  event_title: string;
  purpose: string | null;
  start_datetime: string;
  end_datetime: string;
  attendees_count: number | null;
  status: BookingStatus;
  admin_notes: string | null;
  created_at: string;
  venues?: { name: string; venue_type: VenueType } | null;
};

export const VENUE_TYPE_META: Record<
  VenueType,
  { label: string; tone: "violet" | "emerald" | "amber" | "rose" | "blue" | "slate" }
> = {
  auditorium:      { label: "Auditorium",      tone: "violet" },
  seminar_hall:    { label: "Seminar Hall",    tone: "blue" },
  lab:             { label: "Lab",             tone: "emerald" },
  conference_room: { label: "Conference Room", tone: "amber" },
  ground:          { label: "Ground",          tone: "rose" },
  other:           { label: "Other",           tone: "slate" },
};

export function venueTypeMeta(type: string): { label: string; tone: string } {
  return VENUE_TYPE_META[type as VenueType] ?? VENUE_TYPE_META.other;
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pending", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled",
};

/** Two datetime ranges overlap (half-open: touching edges do NOT conflict). */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = new Date(aStart).getTime();
  const ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  const be = new Date(bEnd).getTime();
  return as < be && bs < ae;
}

/** Does [start,end) clash with any blocking booking for the same venue?
 *  `existing` should already be the venue's bookings. `ignoreId` skips self
 *  (used when re-checking on approval). */
export function hasConflict(
  start: string,
  end: string,
  existing: { id: string; start_datetime: string; end_datetime: string; status: BookingStatus }[],
  opts?: { ignoreId?: string; statuses?: BookingStatus[] }
): boolean {
  const blocking = opts?.statuses ?? BLOCKING_STATUSES;
  return existing.some(
    (b) =>
      b.id !== opts?.ignoreId &&
      blocking.includes(b.status) &&
      overlaps(start, end, b.start_datetime, b.end_datetime)
  );
}

/** end must be strictly after start. */
export function isValidRange(start: string, end: string): boolean {
  return new Date(end).getTime() > new Date(start).getTime();
}

/** Deterministic colour index (0..count-1) for a venue, for calendar tinting. */
export function venueColorIndex(venueId: string, count = 6): number {
  let h = 0;
  for (let i = 0; i < venueId.length; i++) h = (h * 31 + venueId.charCodeAt(i)) >>> 0;
  return h % count;
}

/** Local YYYY-MM-DD for grouping bookings by day in the calendar. */
export function dayKey(datetime: string): string {
  const d = new Date(datetime);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
