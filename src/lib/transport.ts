// ─────────────────────────────────────────────────────────────
// Transport Management — pure domain helpers (Phase 6B)
// Vehicle/route typing, compliance-expiry logic and stop helpers.
// No I/O here so these stay unit-testable.
// ─────────────────────────────────────────────────────────────

export type VehicleType = "bus" | "van" | "mini_bus";

export const VEHICLE_TYPES: VehicleType[] = ["bus", "van", "mini_bus"];

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  bus: "Bus",
  van: "Van",
  mini_bus: "Mini Bus",
};

/** A single stop on a route. lat/lng optional (used by the VRP solver later). */
export type RouteStop = {
  name: string;
  pickup_time: string | null; // "HH:MM"
  lat?: number | null;
  lng?: number | null;
};

/** Days remaining before `date` (negative if already past). Null if no date. */
export function daysUntil(date: string | null | undefined, today: Date = new Date()): number | null {
  if (!date) return null;
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d.getTime() - base.getTime()) / 86_400_000);
}

/** Vehicles with a certificate expiring within this many days are flagged. */
export const EXPIRY_WARN_DAYS = 30;

export type ExpiryState = "expired" | "expiring" | "ok" | "none";

/** Classify a single certificate date. */
export function expiryState(date: string | null | undefined, today: Date = new Date()): ExpiryState {
  const days = daysUntil(date, today);
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= EXPIRY_WARN_DAYS) return "expiring";
  return "ok";
}

export type VehicleLike = {
  vehicle_number: string;
  insurance_expiry: string | null;
  fitness_expiry: string | null;
  is_active?: boolean;
};

export type ComplianceAlert = {
  vehicleNumber: string;
  kind: "insurance" | "fitness";
  state: Extract<ExpiryState, "expired" | "expiring">;
  date: string;
  days: number;
};

/** Build the list of insurance/fitness alerts for one vehicle (expired or expiring). */
export function vehicleAlerts(v: VehicleLike, today: Date = new Date()): ComplianceAlert[] {
  const out: ComplianceAlert[] = [];
  const checks: { kind: "insurance" | "fitness"; date: string | null }[] = [
    { kind: "insurance", date: v.insurance_expiry },
    { kind: "fitness", date: v.fitness_expiry },
  ];
  for (const c of checks) {
    const state = expiryState(c.date, today);
    if ((state === "expired" || state === "expiring") && c.date) {
      out.push({ vehicleNumber: v.vehicle_number, kind: c.kind, state, date: c.date, days: daysUntil(c.date, today)! });
    }
  }
  return out;
}

/** All compliance alerts across a fleet, expired first then soonest-expiring. */
export function fleetAlerts(vehicles: VehicleLike[], today: Date = new Date()): ComplianceAlert[] {
  return vehicles
    .flatMap((v) => vehicleAlerts(v, today))
    .sort((a, b) => a.days - b.days);
}

/** Parse the `stops` JSONB into a typed array, tolerating malformed rows. */
export function parseStops(raw: unknown): RouteStop[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => ({
      name: typeof s.name === "string" ? s.name : "",
      pickup_time: typeof s.pickup_time === "string" ? s.pickup_time : null,
      lat: typeof s.lat === "number" ? s.lat : null,
      lng: typeof s.lng === "number" ? s.lng : null,
    }))
    .filter((s) => s.name.length > 0);
}

/** Pickup time for a named boarding stop on a route, if known. */
export function pickupTimeFor(stops: RouteStop[], boardingStop: string | null): string | null {
  if (!boardingStop) return null;
  const hit = stops.find((s) => s.name.toLowerCase() === boardingStop.toLowerCase());
  return hit?.pickup_time ?? null;
}

/** "07:30" → "7:30 AM"; passthrough on anything unparseable. */
export function formatTime(t: string | null | undefined): string {
  if (!t) return "—";
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  let h = Number(m[1]);
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${min} ${ampm}`;
}
