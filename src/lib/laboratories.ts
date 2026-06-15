// Phase 4D — Laboratory Management domain model + pure helpers (unit-testable).

export type LabType =
  | "physics" | "chemistry" | "botany" | "zoology"
  | "biotech" | "computer_science" | "other";

export const LAB_TYPE_LABELS: Record<LabType, string> = {
  physics: "Physics",
  chemistry: "Chemistry",
  botany: "Botany",
  zoology: "Zoology",
  biotech: "Bio-Technology",
  computer_science: "Computer Science",
  other: "Other",
};

/** Tailwind chip classes per lab type (light + dark). */
export const LAB_TYPE_COLORS: Record<LabType, string> = {
  physics: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  chemistry: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  botany: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  zoology: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  biotech: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  computer_science: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  other: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export const LAB_TYPES: LabType[] = [
  "physics", "chemistry", "botany", "zoology", "biotech", "computer_science", "other",
];

export function labTypeLabel(t: string): string {
  return LAB_TYPE_LABELS[t as LabType] ?? "Other";
}

export type Laboratory = {
  id: string;
  institution_id: string;
  department_id: string | null;
  name: string;
  lab_type: LabType;
  capacity: number | null;
  lab_assistant_id: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  departments?: { name: string } | null;
  staff?: { full_name: string } | null;
};

export type LabBatch = {
  id: string;
  laboratory_id: string;
  name: string;
  year_semester: string;
  created_at: string;
};

export type LabExperiment = {
  id: string;
  laboratory_id: string;
  title: string;
  description: string | null;
  requirements: string[] | null;
  created_at: string;
};

export type LabSession = {
  id: string;
  laboratory_batch_id: string;
  experiment_id: string;
  session_date: string;
  remarks: string | null;
  created_at: string;
  laboratory_batches?: { name: string; year_semester: string } | null;
  laboratory_experiments?: { title: string } | null;
};

export type LabAttendance = {
  id: string;
  session_id: string;
  student_id: string;
  is_present: boolean;
  marks_secured: number | null;
  remarks: string | null;
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

/** Normalise a free-text / JSON requirements value into a clean string array. */
export function parseRequirements(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  if (typeof raw === "string") {
    return raw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/** Attendance percentage (present / total), rounded to a whole number. 0 when no records. */
export function attendanceRate(records: { is_present: boolean }[]): number {
  if (records.length === 0) return 0;
  const present = records.filter((r) => r.is_present).length;
  return Math.round((present / records.length) * 100);
}

/** Average of the marks that are actually recorded (ignores null/absent-with-no-mark).
 *  Returns null when no marks exist. Rounded to 2 decimals. */
export function averageMarks(records: { marks_secured: number | null }[]): number | null {
  const marks = records.map((r) => r.marks_secured).filter((m): m is number => m != null);
  if (marks.length === 0) return null;
  const sum = marks.reduce((a, b) => a + b, 0);
  return Math.round((sum / marks.length) * 100) / 100;
}

export type SessionTally = { present: number; absent: number; total: number; rate: number };

/** Present/absent tally for one session's attendance rows. */
export function sessionTally(records: { is_present: boolean }[]): SessionTally {
  const present = records.filter((r) => r.is_present).length;
  const total = records.length;
  return { present, absent: total - present, total, rate: attendanceRate(records) };
}

/** Clamp a marks entry to [0, max]; returns null for blank input. */
export function normaliseMarks(value: string | number | null, max: number = 100): number | null {
  if (value === "" || value == null) return null;
  const n = typeof value === "number" ? value : parseFloat(value);
  if (Number.isNaN(n)) return null;
  return Math.min(Math.max(n, 0), max);
}
