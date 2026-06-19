// ─────────────────────────────────────────────────────────────
// Online Examination System — pure domain helpers (Phase 6D)
// Auto-grading, exam-window state and timer maths. No I/O so the
// scoring logic (the security-sensitive part) stays unit-tested.
// ─────────────────────────────────────────────────────────────

export type QuestionType = "mcq" | "multi" | "short";

export const QUESTION_TYPES: QuestionType[] = ["mcq", "multi", "short"];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "Multiple choice (single)",
  multi: "Multiple choice (multi)",
  short: "Short answer",
};

export type ExamStatus = "draft" | "published" | "closed";

export const EXAM_STATUS_LABELS: Record<ExamStatus, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
};

export const EXAM_STATUS_STYLES: Record<ExamStatus, string> = {
  draft: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  closed: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

/** 3 anti-cheating violations auto-submit the attempt with a flag. */
export const VIOLATION_LIMIT = 3;

export type GradableQuestion = {
  id: string;
  question_type: QuestionType;
  correct_keys: string[];
  marks: number;
};

/** Normalise short-answer text: trim, lowercase, collapse inner whitespace. */
export function normalizeShort(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

export type GradedAnswer = { isCorrect: boolean; awarded: number };

/** Grade a single response against the question's key. No partial credit. */
export function gradeOne(q: GradableQuestion, response: string[]): GradedAnswer {
  const resp = Array.isArray(response) ? response.filter((r) => r !== "" && r != null) : [];
  if (resp.length === 0) return { isCorrect: false, awarded: 0 };

  if (q.question_type === "short") {
    const accepted = q.correct_keys.map(normalizeShort);
    const given = normalizeShort(String(resp[0]));
    const ok = accepted.includes(given);
    return { isCorrect: ok, awarded: ok ? q.marks : 0 };
  }
  // mcq / multi → exact set match
  const ok = sameSet(resp.map(String), q.correct_keys.map(String));
  return { isCorrect: ok, awarded: ok ? q.marks : 0 };
}

export type SubmissionGrade = {
  score: number;
  totalMarks: number;
  perQuestion: { questionId: string; isCorrect: boolean; awarded: number }[];
};

/** Grade a whole submission. `responses` maps question id → selected keys / [text]. */
export function gradeSubmission(questions: GradableQuestion[], responses: Record<string, string[]>): SubmissionGrade {
  let score = 0;
  let totalMarks = 0;
  const perQuestion = questions.map((q) => {
    totalMarks += q.marks;
    const g = gradeOne(q, responses[q.id] ?? []);
    score += g.awarded;
    return { questionId: q.id, isCorrect: g.isCorrect, awarded: g.awarded };
  });
  return { score, totalMarks, perQuestion };
}

export function totalMarksOf(questions: { marks: number }[]): number {
  return questions.reduce((sum, q) => sum + (q.marks || 0), 0);
}

// ── Exam window / timer ───────────────────────────────────────────────────────

export type ExamWindow = {
  status: ExamStatus;
  scheduled_start: string | null;
  scheduled_end: string | null;
};

export type WindowState = "upcoming" | "open" | "closed";

/** Whether an eligible student can start the exam right now. */
export function examWindowState(exam: ExamWindow, now: Date = new Date()): WindowState {
  if (exam.status === "closed") return "closed";
  if (exam.status === "draft") return "upcoming";
  const t = now.getTime();
  if (exam.scheduled_start && t < new Date(exam.scheduled_start).getTime()) return "upcoming";
  if (exam.scheduled_end && t > new Date(exam.scheduled_end).getTime()) return "closed";
  return "open";
}

/** Seconds left in an in-progress attempt, bounded by the exam end time. */
export function remainingSeconds(
  startedAt: string,
  durationMinutes: number,
  scheduledEnd: string | null,
  now: Date = new Date(),
): number {
  const hardEnd = new Date(startedAt).getTime() + durationMinutes * 60_000;
  const end = scheduledEnd ? Math.min(hardEnd, new Date(scheduledEnd).getTime()) : hardEnd;
  return Math.max(0, Math.floor((end - now.getTime()) / 1000));
}

/** 125 → "02:05"; 3700 → "01:01:40". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function percentage(score: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((score / total) * 1000) / 10;
}
