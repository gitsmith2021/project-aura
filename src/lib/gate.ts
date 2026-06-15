// Phase 4G — Gate Pass & Visitor Management domain model + pure helpers (unit-testable).

export type VisitorStatus = "checked_in" | "checked_out";
export type OutpassStatus = "pending" | "approved" | "rejected" | "returned" | "overdue";

export const VISITOR_STATUS_LABELS: Record<VisitorStatus, string> = {
  checked_in: "On Campus",
  checked_out: "Left",
};

export const OUTPASS_STATUS_LABELS: Record<OutpassStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  returned: "Returned",
  overdue: "Overdue",
};

export const OUTPASS_STATUS_COLORS: Record<OutpassStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  returned: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  overdue: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

export const ID_PROOF_TYPES = ["Aadhaar", "PAN", "Driving License", "Voter ID", "Passport", "Other"];

export type VisitorLog = {
  id: string;
  institution_id: string;
  visitor_name: string;
  visitor_phone: string | null;
  id_proof_type: string | null;
  id_proof_number: string | null;
  purpose: string;
  meeting_with: string | null;
  vehicle_number: string | null;
  check_in_time: string;
  check_out_time: string | null;
  status: VisitorStatus;
  created_at: string;
};

export type StudentOutpass = {
  id: string;
  institution_id: string;
  student_id: string;
  hostel_id: string | null;
  reason: string;
  destination: string;
  out_time: string;
  expected_return: string;
  actual_return: string | null;
  approved_by: string | null;
  status: OutpassStatus;
  created_at: string;
  students?: { full_name: string; roll_no: string | null } | null;
  hostels?: { name: string } | null;
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

/** An approved outpass is overdue once `expected_return` has passed without a
 *  recorded `actual_return`. Stored 'overdue' is also overdue. */
export function isOutpassOverdue(
  o: { status: OutpassStatus; expected_return: string; actual_return: string | null },
  asOf: Date = new Date()
): boolean {
  if (o.status === "overdue") return true;
  if (o.status !== "approved") return false;
  if (o.actual_return) return false;
  return new Date(o.expected_return).getTime() < asOf.getTime();
}

/** Live status of an outpass: an approved-but-late one displays as overdue. */
export function liveOutpassStatus(
  o: { status: OutpassStatus; expected_return: string; actual_return: string | null },
  asOf: Date = new Date()
): OutpassStatus {
  if (o.status === "approved" && isOutpassOverdue(o, asOf)) return "overdue";
  return o.status;
}

/** Whole minutes between two ISO timestamps (b defaults to now). Never negative. */
export function minutesBetween(aIso: string, bIso?: string, asOf: Date = new Date()): number {
  const a = new Date(aIso).getTime();
  const b = bIso ? new Date(bIso).getTime() : asOf.getTime();
  return Math.max(0, Math.round((b - a) / 60000));
}

/** Human duration label, e.g. "2h 15m" or "45m". */
export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export type VisitorTally = { onCampus: number; total: number };
export function visitorTally(rows: { status: VisitorStatus }[]): VisitorTally {
  return { onCampus: rows.filter((r) => r.status === "checked_in").length, total: rows.length };
}

export type OutpassTally = { pending: number; out: number; overdue: number; total: number };
/** Counters for the security dashboard. `out` = approved & not yet returned. */
export function outpassTally(
  rows: { status: OutpassStatus; expected_return: string; actual_return: string | null }[],
  asOf: Date = new Date()
): OutpassTally {
  let pending = 0, out = 0, overdue = 0;
  for (const r of rows) {
    if (r.status === "pending") pending++;
    if (r.status === "approved" && !r.actual_return) {
      out++;
      if (isOutpassOverdue(r, asOf)) overdue++;
    }
    if (r.status === "overdue") overdue++;
  }
  return { pending, out, overdue, total: rows.length };
}
