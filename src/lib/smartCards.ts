// Phase 4F — Smart ID Card & NFC Card Registry domain model + pure helpers (unit-testable).

export type CardStatus = "active" | "lost" | "deactivated" | "replaced";
export type HolderType = "student" | "staff";

export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  active: "Active",
  lost: "Lost",
  deactivated: "Deactivated",
  replaced: "Replaced",
};

export const CARD_STATUS_COLORS: Record<CardStatus, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  lost: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  deactivated: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  replaced: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
};

export const HOLDER_TYPE_LABELS: Record<HolderType, string> = {
  student: "Student",
  staff: "Staff",
};

export type SmartCard = {
  id: string;
  institution_id: string;
  card_uid: string;
  holder_type: HolderType;
  student_id: string | null;
  staff_id: string | null;
  issued_date: string;
  status: CardStatus;
  replaced_by: string | null;
  notes: string | null;
  created_at: string;
  // resolved holder name (joined client/server-side)
  holder_name?: string | null;
  holder_sub?: string | null; // roll no / designation
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

/** A card may be used for NFC attendance only while active. */
export function isUsable(card: { status: CardStatus }): boolean {
  return card.status === "active";
}

/** Normalise a scanned/typed NFC UID: trim, uppercase, strip spaces and colons. */
export function normaliseUid(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s:]+/g, "");
}

/** A UID is valid if it is non-empty hex (allowing the normalised form). */
export function isValidUid(raw: string): boolean {
  const u = normaliseUid(raw);
  return u.length >= 4 && /^[0-9A-F]+$/.test(u);
}

export type CardStats = { total: number; active: number; lost: number; deactivated: number; replaced: number };

/** Roll a card list up into dashboard counters. */
export function cardStats(cards: { status: CardStatus }[]): CardStats {
  const s: CardStats = { total: cards.length, active: 0, lost: 0, deactivated: 0, replaced: 0 };
  for (const c of cards) s[c.status]++;
  return s;
}

/** A short masked view of a UID for display (keeps the last 4). */
export function maskUid(uid: string): string {
  if (uid.length <= 4) return uid;
  return `••••${uid.slice(-4)}`;
}
