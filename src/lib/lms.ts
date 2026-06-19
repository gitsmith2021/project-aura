// ─────────────────────────────────────────────────────────────
// E-Learning / LMS — pure domain helpers (Phase 6G)
// Material typing, assignment deadline/late logic, gradebook
// aggregation and YouTube embed parsing. No I/O — unit-tested.
// ─────────────────────────────────────────────────────────────

export type MaterialType =
  | "notes" | "slides" | "video_link" | "scorm_package" | "question_paper" | "reference";

export const MATERIAL_TYPES: MaterialType[] = [
  "notes", "slides", "video_link", "scorm_package", "question_paper", "reference",
];

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  notes: "Notes",
  slides: "Slides",
  video_link: "Video",
  scorm_package: "SCORM Package",
  question_paper: "Question Paper",
  reference: "Reference",
};

/** Types that are typically a link/upload rather than a file in our bucket. */
export function isLinkMaterial(type: MaterialType): boolean {
  return type === "video_link" || type === "reference";
}

// ── Assignment deadlines ──────────────────────────────────────────────────────

export type DueStatus = "open" | "due_soon" | "overdue";

/** Hours within which an open assignment is flagged "due soon". */
export const DUE_SOON_HOURS = 48;

export function dueStatus(dueDate: string, now: Date = new Date()): DueStatus {
  const due = new Date(dueDate).getTime();
  const t = now.getTime();
  if (t > due) return "overdue";
  if (due - t <= DUE_SOON_HOURS * 3_600_000) return "due_soon";
  return "open";
}

/** Whole hours/days remaining (or overdue), for a compact countdown label. */
export function dueLabel(dueDate: string, now: Date = new Date()): string {
  const diffMs = new Date(dueDate).getTime() - now.getTime();
  const overdue = diffMs < 0;
  const mins = Math.floor(Math.abs(diffMs) / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const core = days >= 1 ? `${days}d` : hours >= 1 ? `${hours}h` : `${mins}m`;
  return overdue ? `${core} overdue` : `${core} left`;
}

/** A submission is late if it lands after the due date. */
export function isLate(submittedAt: string, dueDate: string): boolean {
  return new Date(submittedAt).getTime() > new Date(dueDate).getTime();
}

// ── Submission / grade state ──────────────────────────────────────────────────

export type SubmissionState = "not_submitted" | "submitted" | "graded";

export function submissionState(sub: { submitted_at?: string | null; marks_awarded?: number | null } | null | undefined): SubmissionState {
  if (!sub || !sub.submitted_at) return "not_submitted";
  return sub.marks_awarded === null || sub.marks_awarded === undefined ? "submitted" : "graded";
}

export function percentage(marks: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((marks / max) * 1000) / 10;
}

// ── Gradebook ─────────────────────────────────────────────────────────────────

export type GbStudent = { id: string; name: string; rollNo: string | null };
export type GbAssignment = { id: string; title: string; maxMarks: number };
export type GbSubmission = { assignmentId: string; studentId: string; marksAwarded: number | null };

export type GbCellStatus = "graded" | "submitted" | "missing";
export type GbCell = { assignmentId: string; marks: number | null; status: GbCellStatus };
export type GbRow = { student: GbStudent; cells: GbCell[]; average: number | null };
export type Gradebook = {
  rows: GbRow[];
  assignmentAverages: { assignmentId: string; average: number | null }[];
};

/**
 * Build a student × assignment matrix. Cell status:
 *  - graded   → a submission with marks
 *  - submitted→ a submission without marks yet
 *  - missing  → no submission
 * Averages are computed as percentages over graded cells only.
 */
export function buildGradebook(students: GbStudent[], assignments: GbAssignment[], submissions: GbSubmission[]): Gradebook {
  const maxById = new Map(assignments.map((a) => [a.id, a.maxMarks]));
  const subKey = (aid: string, sid: string) => `${aid}::${sid}`;
  const subMap = new Map(submissions.map((s) => [subKey(s.assignmentId, s.studentId), s]));

  const rows: GbRow[] = students.map((student) => {
    const pcts: number[] = [];
    const cells: GbCell[] = assignments.map((a) => {
      const sub = subMap.get(subKey(a.id, student.id));
      if (!sub) return { assignmentId: a.id, marks: null, status: "missing" as const };
      if (sub.marksAwarded === null || sub.marksAwarded === undefined) {
        return { assignmentId: a.id, marks: null, status: "submitted" as const };
      }
      pcts.push(percentage(sub.marksAwarded, maxById.get(a.id) ?? 0));
      return { assignmentId: a.id, marks: sub.marksAwarded, status: "graded" as const };
    });
    const average = pcts.length ? Math.round((pcts.reduce((x, y) => x + y, 0) / pcts.length) * 10) / 10 : null;
    return { student, cells, average };
  });

  const assignmentAverages = assignments.map((a) => {
    const max = maxById.get(a.id) ?? 0;
    const graded = submissions.filter((s) => s.assignmentId === a.id && s.marksAwarded !== null && s.marksAwarded !== undefined);
    const average = graded.length
      ? Math.round((graded.reduce((sum, s) => sum + percentage(s.marksAwarded as number, max), 0) / graded.length) * 10) / 10
      : null;
    return { assignmentId: a.id, average };
  });

  return { rows, assignmentAverages };
}

/** Colour bucket for a gradebook cell, given the assignment max. */
export function gradeBand(marks: number | null, max: number, status: GbCellStatus): "pass" | "fail" | "submitted" | "missing" {
  if (status === "missing") return "missing";
  if (status === "submitted") return "submitted";
  const pct = percentage(marks as number, max);
  return pct >= 40 ? "pass" : "fail";
}

// ── YouTube embed ─────────────────────────────────────────────────────────────

/** Convert a YouTube watch/short/embed URL to an embeddable URL, or null. */
export function youTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (u.pathname.startsWith("/embed/")) return url;
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/")[2];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}
