// ─────────────────────────────────────────────────────────────
// Industry Connect & MOU Management — pure domain helpers (Phase 6H)
// Partner/interaction typing, MOU expiry maths, stats and the
// NAAC Criterion 7.1 export. No I/O — unit-tested.
// ─────────────────────────────────────────────────────────────

export type PartnerType = "industry" | "university" | "government" | "ngo" | "research_institute";

export const PARTNER_TYPES: PartnerType[] = ["industry", "university", "government", "ngo", "research_institute"];

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  industry: "Industry",
  university: "University",
  government: "Government",
  ngo: "NGO",
  research_institute: "Research Institute",
};

export type InteractionType =
  | "internship" | "guest_lecture" | "workshop" | "project" | "training" | "placement_drive" | "other";

export const INTERACTION_TYPES: InteractionType[] = [
  "internship", "guest_lecture", "workshop", "project", "training", "placement_drive", "other",
];

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  internship: "Internship",
  guest_lecture: "Guest Lecture",
  workshop: "Workshop",
  project: "Project",
  training: "Training",
  placement_drive: "Placement Drive",
  other: "Other",
};

// ── Expiry ────────────────────────────────────────────────────────────────────

/** Alerts fire from 60 days before expiry (critical band at 30). */
export const EXPIRY_WARN_DAYS = 60;
export const EXPIRY_CRITICAL_DAYS = 30;

export function daysUntil(date: string | null | undefined, today: Date = new Date()): number | null {
  if (!date) return null;
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d.getTime() - base.getTime()) / 86_400_000);
}

export type ExpiryUrgency = "expired" | "critical" | "warning" | "ok";

/** Classify an MOU's expiry date into an alert band. */
export function expiryUrgency(expiryDate: string, today: Date = new Date()): ExpiryUrgency {
  const days = daysUntil(expiryDate, today);
  if (days === null) return "ok";
  if (days < 0) return "expired";
  if (days <= EXPIRY_CRITICAL_DAYS) return "critical";
  if (days <= EXPIRY_WARN_DAYS) return "warning";
  return "ok";
}

/** expiry = mou_date + validity_years (returns an ISO yyyy-mm-dd string). */
export function computeExpiry(mouDate: string, validityYears: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(mouDate);
  if (!m) return mouDate;
  // Compute in UTC so the calendar day never drifts across timezones.
  const d = new Date(Date.UTC(Number(m[1]) + Math.max(1, Math.floor(validityYears)), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10);
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export type PartnerLike = { partner_type: PartnerType; expiry_date: string; is_active: boolean };

export type MouStats = {
  total: number;
  active: number;
  expiringSoon: number; // active + within the warn window (not yet expired)
  expired: number;
  byType: Record<PartnerType, number>;
};

export function mouStats(partners: PartnerLike[], today: Date = new Date()): MouStats {
  const byType = Object.fromEntries(PARTNER_TYPES.map((t) => [t, 0])) as Record<PartnerType, number>;
  let active = 0, expiringSoon = 0, expired = 0;
  for (const p of partners) {
    byType[p.partner_type] = (byType[p.partner_type] ?? 0) + 1;
    const u = expiryUrgency(p.expiry_date, today);
    if (u === "expired") expired += 1;
    if (p.is_active) {
      active += 1;
      if (u === "critical" || u === "warning") expiringSoon += 1;
    }
  }
  return { total: partners.length, active, expiringSoon, expired, byType };
}

// ── Interaction rollup ────────────────────────────────────────────────────────

export type InteractionLike = { mou_partner_id: string | null; students_benefited: number | null };

/** Per-partner activity count and total students benefited. */
export function interactionRollup(interactions: InteractionLike[]): Map<string, { count: number; students: number }> {
  const map = new Map<string, { count: number; students: number }>();
  for (const i of interactions) {
    if (!i.mou_partner_id) continue;
    const cur = map.get(i.mou_partner_id) ?? { count: 0, students: 0 };
    cur.count += 1;
    cur.students += i.students_benefited ?? 0;
    map.set(i.mou_partner_id, cur);
  }
  return map;
}

// ── NAAC Criterion 7.1 export ─────────────────────────────────────────────────

function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export type NaacMouRow = {
  partner_name: string; partner_type: PartnerType; mou_date: string; expiry_date: string;
  purpose: string; activityCount: number; studentsBenefited: number; status: string;
};

/** CSV for NAAC Criterion 7.1 — MOUs with activity counts and students benefited. */
export function naacMouCsv(rows: NaacMouRow[]): string {
  const header = ["S.No", "Partner", "Type", "MOU Date", "Expiry", "Purpose", "Activities", "Students Benefited", "Status"].join(",");
  const lines = rows.map((r, i) =>
    [
      i + 1,
      r.partner_name,
      PARTNER_TYPE_LABELS[r.partner_type],
      r.mou_date,
      r.expiry_date,
      r.purpose,
      r.activityCount,
      r.studentsBenefited,
      r.status,
    ].map(csvCell).join(",")
  );
  return [header, ...lines].join("\n");
}
