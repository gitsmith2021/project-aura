import { describe, it, expect } from "vitest";
import {
  QUESTION_TYPES, QUESTION_TYPE_LABELS, EXAM_STATUS_LABELS, EXAM_STATUS_STYLES, VIOLATION_LIMIT,
  normalizeShort, gradeOne, gradeSubmission, totalMarksOf,
  examWindowState, remainingSeconds, formatClock, formatDuration, percentage,
  type GradableQuestion,
} from "@/lib/onlineExams";

describe("metadata completeness", () => {
  it("labels every question type and status", () => {
    for (const t of QUESTION_TYPES) expect(QUESTION_TYPE_LABELS[t]).toBeTruthy();
    for (const s of ["draft", "published", "closed"] as const) {
      expect(EXAM_STATUS_LABELS[s]).toBeTruthy();
      expect(EXAM_STATUS_STYLES[s]).toBeTruthy();
    }
    expect(VIOLATION_LIMIT).toBe(3);
  });
});

describe("normalizeShort", () => {
  it("trims, lowercases and collapses whitespace", () => {
    expect(normalizeShort("  Hello   World ")).toBe("hello world");
  });
});

describe("gradeOne", () => {
  const mcq: GradableQuestion = { id: "1", question_type: "mcq", correct_keys: ["b"], marks: 2 };
  const multi: GradableQuestion = { id: "2", question_type: "multi", correct_keys: ["a", "c"], marks: 3 };
  const short: GradableQuestion = { id: "3", question_type: "short", correct_keys: ["Paris", "paris city"], marks: 1 };

  it("grades single-choice MCQ", () => {
    expect(gradeOne(mcq, ["b"])).toEqual({ isCorrect: true, awarded: 2 });
    expect(gradeOne(mcq, ["a"])).toEqual({ isCorrect: false, awarded: 0 });
  });

  it("requires the exact set for multi-select (no partial credit)", () => {
    expect(gradeOne(multi, ["c", "a"])).toEqual({ isCorrect: true, awarded: 3 }); // order-insensitive
    expect(gradeOne(multi, ["a"])).toEqual({ isCorrect: false, awarded: 0 });     // missing one
    expect(gradeOne(multi, ["a", "c", "d"])).toEqual({ isCorrect: false, awarded: 0 }); // extra
  });

  it("grades short answers case/space-insensitively against any accepted text", () => {
    expect(gradeOne(short, ["  PARIS "])).toEqual({ isCorrect: true, awarded: 1 });
    expect(gradeOne(short, ["Paris  City"])).toEqual({ isCorrect: true, awarded: 1 });
    expect(gradeOne(short, ["London"])).toEqual({ isCorrect: false, awarded: 0 });
  });

  it("treats blank/empty responses as wrong", () => {
    expect(gradeOne(mcq, [])).toEqual({ isCorrect: false, awarded: 0 });
    expect(gradeOne(short, [""])).toEqual({ isCorrect: false, awarded: 0 });
  });
});

describe("gradeSubmission", () => {
  const qs: GradableQuestion[] = [
    { id: "1", question_type: "mcq", correct_keys: ["b"], marks: 2 },
    { id: "2", question_type: "multi", correct_keys: ["a", "c"], marks: 3 },
    { id: "3", question_type: "short", correct_keys: ["paris"], marks: 1 },
  ];
  it("sums awarded marks and reports total + per-question", () => {
    const g = gradeSubmission(qs, { "1": ["b"], "2": ["a"], "3": ["Paris"] });
    expect(g.totalMarks).toBe(6);
    expect(g.score).toBe(3); // 2 (mcq) + 0 (multi wrong) + 1 (short)
    expect(g.perQuestion).toHaveLength(3);
    expect(g.perQuestion[1]).toEqual({ questionId: "2", isCorrect: false, awarded: 0 });
  });
  it("handles missing responses", () => {
    const g = gradeSubmission(qs, {});
    expect(g.score).toBe(0);
    expect(g.totalMarks).toBe(6);
  });
  it("totalMarksOf matches", () => {
    expect(totalMarksOf(qs)).toBe(6);
  });
});

describe("examWindowState", () => {
  const now = new Date("2026-06-19T10:00:00Z");
  it("is upcoming for drafts and before the start", () => {
    expect(examWindowState({ status: "draft", scheduled_start: null, scheduled_end: null }, now)).toBe("upcoming");
    expect(examWindowState({ status: "published", scheduled_start: "2026-06-19T11:00:00Z", scheduled_end: null }, now)).toBe("upcoming");
  });
  it("is open within the window or when published with no window", () => {
    expect(examWindowState({ status: "published", scheduled_start: null, scheduled_end: null }, now)).toBe("open");
    expect(examWindowState({ status: "published", scheduled_start: "2026-06-19T09:00:00Z", scheduled_end: "2026-06-19T12:00:00Z" }, now)).toBe("open");
  });
  it("is closed when status closed or past the end", () => {
    expect(examWindowState({ status: "closed", scheduled_start: null, scheduled_end: null }, now)).toBe("closed");
    expect(examWindowState({ status: "published", scheduled_start: null, scheduled_end: "2026-06-19T09:00:00Z" }, now)).toBe("closed");
  });
});

describe("remainingSeconds", () => {
  const now = new Date("2026-06-19T10:10:00Z");
  it("counts down from start + duration", () => {
    // started 10:00, 30 min duration → ends 10:30, now 10:10 → 1200s
    expect(remainingSeconds("2026-06-19T10:00:00Z", 30, null, now)).toBe(1200);
  });
  it("is bounded by the scheduled end", () => {
    // duration would end 10:30 but exam closes 10:15 → 300s
    expect(remainingSeconds("2026-06-19T10:00:00Z", 30, "2026-06-19T10:15:00Z", now)).toBe(300);
  });
  it("never goes negative", () => {
    expect(remainingSeconds("2026-06-19T09:00:00Z", 30, null, now)).toBe(0);
  });
});

describe("formatters", () => {
  it("formatClock mm:ss and hh:mm:ss", () => {
    expect(formatClock(125)).toBe("02:05");
    expect(formatClock(3700)).toBe("01:01:40");
    expect(formatClock(-5)).toBe("00:00");
  });
  it("formatDuration", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(90)).toBe("1h 30m");
  });
  it("percentage rounds to one decimal", () => {
    expect(percentage(3, 6)).toBe(50);
    expect(percentage(1, 3)).toBe(33.3);
    expect(percentage(0, 0)).toBe(0);
  });
});
