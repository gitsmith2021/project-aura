// Phase 5B — Staff Recruitment domain model + pure helpers (unit-testable).

// ── Types ─────────────────────────────────────────────────────────────────────

export type JobStatus = "open" | "closed" | "on_hold";
export type EmploymentType = "full_time" | "part_time" | "contract" | "visiting";
export type ApplicationStatus =
  | "applied" | "screened" | "interview" | "offer" | "joined" | "rejected";

export type JobPosting = {
  id: string;
  institution_id: string;
  title: string;
  department_id: string | null;
  employment_type: EmploymentType;
  experience_years: number | null;
  qualifications: string | null;
  description: string | null;
  deadline: string | null;
  vacancies: number;
  status: JobStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  departments?: { name: string } | null;
  application_count?: number;
};

export type JobApplication = {
  id: string;
  institution_id: string;
  job_posting_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  current_employer: string | null;
  experience_years: number | null;
  qualifications: string | null;
  cv_url: string | null;
  status: ApplicationStatus;
  interview_date: string | null;
  interview_notes: string | null;
  offer_date: string | null;
  offer_details: string | null;
  admin_notes: string | null;
  converted_staff_id: string | null;
  applied_at: string;
  updated_at: string;
  job_postings?: { title: string; employment_type: EmploymentType; department_id: string | null; departments?: { name: string } | null } | null;
};

// ── Labels & Colors ───────────────────────────────────────────────────────────

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  open: "Open",
  closed: "Closed",
  on_hold: "On Hold",
};

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  open: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  closed: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-Time",
  part_time: "Part-Time",
  contract: "Contract",
  visiting: "Visiting",
};

export const EMPLOYMENT_TYPE_COLORS: Record<EmploymentType, string> = {
  full_time: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  part_time: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  contract: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  visiting: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: "Applied",
  screened: "Screened",
  interview: "Interview",
  offer: "Offer",
  joined: "Joined",
  rejected: "Rejected",
};

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  applied: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  screened: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  interview: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  offer: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  joined: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

// ── Pipeline ──────────────────────────────────────────────────────────────────

/** Ordered active funnel (terminal states excluded). */
export const RECRUITMENT_PIPELINE: ApplicationStatus[] = [
  "applied", "screened", "interview", "offer", "joined",
];

export const RECRUITMENT_TERMINAL: ApplicationStatus[] = ["rejected"];

/** Advance to next pipeline status, or null at end / terminal. */
export function nextApplicationStatus(status: ApplicationStatus): ApplicationStatus | null {
  if (RECRUITMENT_TERMINAL.includes(status)) return null;
  const i = RECRUITMENT_PIPELINE.indexOf(status);
  return i >= 0 && i < RECRUITMENT_PIPELINE.length - 1 ? RECRUITMENT_PIPELINE[i + 1] : null;
}

/** Hiring (joined) is only available at the offer stage. */
export function canHire(status: ApplicationStatus): boolean {
  return status === "offer";
}

/** Rejection is allowed until the candidate has joined or is already rejected. */
export function canReject(status: ApplicationStatus): boolean {
  return status !== "joined" && status !== "rejected";
}

/** Whether a candidate can be moved back one step (not used in initial UI, exposed for tests). */
export function isActiveApplication(status: ApplicationStatus): boolean {
  return !RECRUITMENT_TERMINAL.includes(status) && status !== "joined";
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export type RecruitmentStats = {
  total: number;
  active: number;
  inInterview: number;
  offered: number;
  joined: number;
  rejected: number;
};

export function recruitmentStats(rows: { status: ApplicationStatus }[]): RecruitmentStats {
  const s: RecruitmentStats = { total: 0, active: 0, inInterview: 0, offered: 0, joined: 0, rejected: 0 };
  for (const r of rows) {
    s.total++;
    if (r.status === "joined") s.joined++;
    else if (r.status === "rejected") s.rejected++;
    else {
      s.active++;
      if (r.status === "interview") s.inInterview++;
      if (r.status === "offer") s.offered++;
    }
  }
  return s;
}

export type JobPostingStats = {
  open: number;
  on_hold: number;
  closed: number;
  totalVacancies: number;
};

export function jobPostingStats(rows: { status: JobStatus; vacancies: number }[]): JobPostingStats {
  const s: JobPostingStats = { open: 0, on_hold: 0, closed: 0, totalVacancies: 0 };
  for (const r of rows) {
    s[r.status]++;
    if (r.status === "open") s.totalVacancies += r.vacancies;
  }
  return s;
}

/** Group applications by status for a kanban board. */
export function pipelineGroups<T extends { status: ApplicationStatus }>(
  rows: T[]
): Record<ApplicationStatus, T[]> {
  const out = {} as Record<ApplicationStatus, T[]>;
  for (const s of [...RECRUITMENT_PIPELINE, ...RECRUITMENT_TERMINAL]) out[s] = [];
  for (const r of rows) (out[r.status] ??= []).push(r);
  return out;
}

// ── Deadline helpers ──────────────────────────────────────────────────────────

/** Days until a deadline from a given today string (YYYY-MM-DD). Negative = overdue. */
export function daysUntilDeadline(deadline: string | null, today: string): number | null {
  if (!deadline) return null;
  const d = new Date(deadline).getTime();
  const t = new Date(today).getTime();
  return Math.round((d - t) / 86_400_000);
}

export function isDeadlinePassed(deadline: string | null, today: string): boolean {
  const diff = daysUntilDeadline(deadline, today);
  return diff !== null && diff < 0;
}

/** Human-readable deadline label: "2d left", "Expires today", "3d overdue", null. */
export function deadlineLabel(deadline: string | null, today: string): string | null {
  const diff = daysUntilDeadline(deadline, today);
  if (diff === null) return null;
  if (diff === 0) return "Expires today";
  if (diff > 0) return `${diff}d left`;
  return `${Math.abs(diff)}d overdue`;
}

// ── Employee ID generator ─────────────────────────────────────────────────────

/** Generate a staff employee ID from a sequential count: EMP0042. */
export function employeeIdFromSeq(seq: number): string {
  return `EMP${String(seq).padStart(4, "0")}`;
}

// ── Institutional email generator ─────────────────────────────────────────────

/**
 * Derives an institutional email from a full name and institution email domain.
 * "Shalini Immanuel" + "bhc.edu.in" → "shalini.immanuel@bhc.edu.in"
 * Single-word names use the same word for both parts: "Rajan" → "rajan.rajan@domain"
 */
export function generateStaffEmail(fullName: string, emailDomain: string): string {
  const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const parts    = fullName.trim().split(/\s+/);
  const first    = sanitize(parts[0] ?? "staff");
  const last     = sanitize(parts.slice(1).join("")) || first;
  return `${first}.${last}@${emailDomain}`;
}
