// Phase 5A — Student Admissions domain model + pure helpers (unit-testable).

export type AdmissionStatus =
  | "applied" | "shortlisted" | "interview" | "admitted" | "rejected" | "enrolled";

export const ADMISSION_STATUS_LABELS: Record<AdmissionStatus, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  interview: "Interview",
  admitted: "Admitted",
  rejected: "Rejected",
  enrolled: "Enrolled",
};

export const ADMISSION_STATUS_COLORS: Record<AdmissionStatus, string> = {
  applied: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  shortlisted: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  interview: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  admitted: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  enrolled: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

/** The kanban pipeline columns (terminal `rejected` is shown separately/inline). */
export const ADMISSION_PIPELINE: AdmissionStatus[] = ["applied", "shortlisted", "interview", "admitted", "enrolled"];

export type Admission = {
  id: string;
  institution_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  program_applied: "UG" | "PG";
  department_id: string | null;
  dob: string | null;
  address: string | null;
  previous_school: string | null;
  marks_percentage: number | null;
  documents_url: { name: string; url: string }[] | null;
  status: AdmissionStatus;
  admin_notes: string | null;
  applied_at: string;
  updated_at: string;
  departments?: { name: string } | null;
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

/** The next pipeline status, or null at the end / for terminal states. */
export function nextAdmissionStatus(status: AdmissionStatus): AdmissionStatus | null {
  if (status === "rejected" || status === "enrolled") return null;
  const i = ADMISSION_PIPELINE.indexOf(status);
  return i >= 0 && i < ADMISSION_PIPELINE.length - 1 ? ADMISSION_PIPELINE[i + 1] : null;
}

/** A student can be enrolled only once admitted (not before, not after). */
export function canEnroll(status: AdmissionStatus): boolean {
  return status === "admitted";
}

/** Rejection is allowed until the applicant is enrolled. */
export function canReject(status: AdmissionStatus): boolean {
  return status !== "enrolled" && status !== "rejected";
}

export type AdmissionStats = { total: number; inPipeline: number; admitted: number; enrolled: number; rejected: number };

export function admissionStats(rows: { status: AdmissionStatus }[]): AdmissionStats {
  const s: AdmissionStats = { total: rows.length, inPipeline: 0, admitted: 0, enrolled: 0, rejected: 0 };
  for (const r of rows) {
    if (r.status === "enrolled") s.enrolled++;
    else if (r.status === "rejected") s.rejected++;
    else {
      s.inPipeline++;
      if (r.status === "admitted") s.admitted++;
    }
  }
  return s;
}

/** Group applications into pipeline columns for the kanban (excludes rejected). */
export function groupByPipeline<T extends { status: AdmissionStatus }>(rows: T[]): Record<AdmissionStatus, T[]> {
  const out = {} as Record<AdmissionStatus, T[]>;
  for (const s of ADMISSION_PIPELINE) out[s] = [];
  out.rejected = [];
  for (const r of rows) (out[r.status] ??= []).push(r);
  return out;
}

/** Generate a provisional roll number at enrollment: PROG/YYYY/NNNN. */
export function generateRollNo(program: "UG" | "PG", year: number, seq: number): string {
  return `${program}/${year}/${String(seq).padStart(4, "0")}`;
}

/** Basic email shape check for the public form. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
