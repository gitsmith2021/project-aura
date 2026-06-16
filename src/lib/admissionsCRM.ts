// Phase 5A-sub — Admissions CRM + Merit List domain model + pure helpers
// (unit-testable; no Supabase imports).

import type { Admission } from "@/lib/admissions";

// ── Enquiry status ──────────────────────────────────────────────────────────────

export type EnquiryStatus = "new" | "contacted" | "interested" | "applied" | "not_interested" | "lost";

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  applied: "Applied",
  not_interested: "Not Interested",
  lost: "Lost",
};

export const ENQUIRY_STATUS_COLORS: Record<EnquiryStatus, string> = {
  new: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  contacted: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  interested: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  applied: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  not_interested: "bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400",
  lost: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

/** The active nurture funnel (terminal `not_interested`/`lost` shown separately). */
export const ENQUIRY_PIPELINE: EnquiryStatus[] = ["new", "contacted", "interested", "applied"];

/** Statuses that close an enquiry without conversion. */
export const ENQUIRY_TERMINAL: EnquiryStatus[] = ["not_interested", "lost"];

// ── Enquiry source ──────────────────────────────────────────────────────────────

export type EnquirySource = "website" | "walk_in" | "phone" | "referral" | "social_media" | "fair" | "other";

export const ENQUIRY_SOURCE_LABELS: Record<EnquirySource, string> = {
  website: "Website",
  walk_in: "Walk-in",
  phone: "Phone",
  referral: "Referral",
  social_media: "Social Media",
  fair: "Education Fair",
  other: "Other",
};

export const ENQUIRY_SOURCES: EnquirySource[] = [
  "website", "walk_in", "phone", "referral", "social_media", "fair", "other",
];

export type ProgramInterest = "UG" | "PG" | "Diploma" | "Certificate";
export const PROGRAM_INTERESTS: ProgramInterest[] = ["UG", "PG", "Diploma", "Certificate"];

// ── Model ───────────────────────────────────────────────────────────────────────

export type Enquiry = {
  id: string;
  institution_id: string;
  name: string;
  phone: string;
  email: string | null;
  program_interest: ProgramInterest;
  department_id: string | null;
  source: EnquirySource;
  enquiry_date: string;
  follow_up_date: string | null;
  status: EnquiryStatus;
  notes: string | null;
  converted_admission_id: string | null;
  created_at: string;
  updated_at: string;
  departments?: { name: string } | null;
};

// ── Pure helpers ────────────────────────────────────────────────────────────────

/** The next nurture status, or null at the end / for terminal states. */
export function nextEnquiryStatus(status: EnquiryStatus): EnquiryStatus | null {
  if (ENQUIRY_TERMINAL.includes(status)) return null;
  const i = ENQUIRY_PIPELINE.indexOf(status);
  return i >= 0 && i < ENQUIRY_PIPELINE.length - 1 ? ENQUIRY_PIPELINE[i + 1] : null;
}

/** An enquiry can be converted to an application until it is already applied/closed. */
export function canConvertEnquiry(status: EnquiryStatus): boolean {
  return status !== "applied" && !ENQUIRY_TERMINAL.includes(status);
}

/** Closing (not_interested/lost) is allowed while still in the active funnel. */
export function canCloseEnquiry(status: EnquiryStatus): boolean {
  return status !== "applied" && !ENQUIRY_TERMINAL.includes(status);
}

export type EnquiryStats = { total: number; active: number; interested: number; applied: number; lost: number };

export function enquiryStats(rows: { status: EnquiryStatus }[]): EnquiryStats {
  const s: EnquiryStats = { total: rows.length, active: 0, interested: 0, applied: 0, lost: 0 };
  for (const r of rows) {
    if (r.status === "applied") s.applied++;
    else if (ENQUIRY_TERMINAL.includes(r.status)) s.lost++;
    else {
      s.active++;
      if (r.status === "interested") s.interested++;
    }
  }
  return s;
}

/** Count enquiries per source, ordered for a breakdown chart (desc by count). */
export function sourceBreakdown(rows: { source: EnquirySource }[]): { source: EnquirySource; label: string; count: number }[] {
  const counts = {} as Record<EnquirySource, number>;
  for (const s of ENQUIRY_SOURCES) counts[s] = 0;
  for (const r of rows) counts[r.source] = (counts[r.source] ?? 0) + 1;
  return ENQUIRY_SOURCES
    .map((source) => ({ source, label: ENQUIRY_SOURCE_LABELS[source], count: counts[source] }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
}

/**
 * Days until a follow-up is due relative to `today` (both YYYY-MM-DD).
 * Negative = overdue, 0 = due today, positive = upcoming. null if no date.
 */
export function followUpDaysLeft(followUpDate: string | null, today: string): number | null {
  if (!followUpDate) return null;
  const a = Date.parse(`${followUpDate}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((a - b) / 86_400_000);
}

/** A follow-up is overdue if its date is strictly before today and not yet closed/applied. */
export function isFollowUpOverdue(enq: { follow_up_date: string | null; status: EnquiryStatus }, today: string): boolean {
  if (enq.status === "applied" || ENQUIRY_TERMINAL.includes(enq.status)) return false;
  const d = followUpDaysLeft(enq.follow_up_date, today);
  return d !== null && d < 0;
}

/** Human label for a follow-up countdown (e.g. "Due today", "3d overdue", "in 5d"). */
export function followUpLabel(followUpDate: string | null, today: string): string | null {
  const d = followUpDaysLeft(followUpDate, today);
  if (d === null) return null;
  if (d === 0) return "Due today";
  if (d < 0) return `${Math.abs(d)}d overdue`;
  return `in ${d}d`;
}

// ── Merit list ──────────────────────────────────────────────────────────────────

export type MeritRow = {
  rank: number;
  id: string;
  applicant_name: string;
  program_applied: "UG" | "PG";
  department: string | null;
  marks_percentage: number | null;
  status: Admission["status"];
};

/**
 * Rank admitted/applied candidates by qualifying marks (desc). Applicants with
 * no marks sink to the bottom. Ties share marks but get sequential ranks (1,2,3…)
 * — standard for a statutory noticeboard merit list.
 */
export function rankApplicants(rows: Admission[]): MeritRow[] {
  const sorted = [...rows].sort((a, b) => {
    const am = a.marks_percentage ?? -1;
    const bm = b.marks_percentage ?? -1;
    if (bm !== am) return bm - am;
    return a.applicant_name.localeCompare(b.applicant_name);
  });
  return sorted.map((a, i) => ({
    rank: i + 1,
    id: a.id,
    applicant_name: a.applicant_name,
    program_applied: a.program_applied,
    department: a.departments?.name ?? null,
    marks_percentage: a.marks_percentage,
    status: a.status,
  }));
}

/** Filter applicants for the merit list by program and/or department. */
export function filterForMerit(
  rows: Admission[],
  filters: { program?: "UG" | "PG" | "all"; departmentId?: string | "all" },
): Admission[] {
  return rows.filter((r) => {
    if (filters.program && filters.program !== "all" && r.program_applied !== filters.program) return false;
    if (filters.departmentId && filters.departmentId !== "all" && r.department_id !== filters.departmentId) return false;
    return true;
  });
}

/** Serialise a ranked merit list to CSV for statutory posting. */
export function meritListToCSV(rows: MeritRow[]): string {
  const header = ["Rank", "Applicant Name", "Programme", "Department", "Qualifying Marks (%)", "Status"];
  const esc = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [r.rank, r.applicant_name, r.program_applied, r.department ?? "", r.marks_percentage ?? "", r.status].map(esc).join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
