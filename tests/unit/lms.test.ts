import { describe, it, expect } from "vitest";
import {
  MATERIAL_TYPES, MATERIAL_TYPE_LABELS, isLinkMaterial, DUE_SOON_HOURS,
  dueStatus, dueLabel, isLate, submissionState, percentage,
  buildGradebook, gradeBand, youTubeEmbedUrl,
  type GbStudent, type GbAssignment, type GbSubmission,
} from "@/lib/lms";

describe("material metadata", () => {
  it("labels every material type", () => {
    expect(MATERIAL_TYPES).toHaveLength(6);
    for (const t of MATERIAL_TYPES) expect(MATERIAL_TYPE_LABELS[t]).toBeTruthy();
  });
  it("classifies link materials", () => {
    expect(isLinkMaterial("video_link")).toBe(true);
    expect(isLinkMaterial("reference")).toBe(true);
    expect(isLinkMaterial("notes")).toBe(false);
  });
});

describe("dueStatus / dueLabel", () => {
  const now = new Date("2026-06-19T10:00:00Z");
  it("flags overdue / due_soon / open at the 48h boundary", () => {
    expect(dueStatus("2026-06-19T09:00:00Z", now)).toBe("overdue");
    expect(dueStatus("2026-06-20T09:00:00Z", now)).toBe("due_soon"); // <48h
    expect(dueStatus("2026-06-25T09:00:00Z", now)).toBe("open");
    expect(DUE_SOON_HOURS).toBe(48);
  });
  it("labels remaining and overdue time", () => {
    expect(dueLabel("2026-06-21T10:00:00Z", now)).toBe("2d left");
    expect(dueLabel("2026-06-19T15:00:00Z", now)).toBe("5h left");
    expect(dueLabel("2026-06-19T08:00:00Z", now)).toBe("2h overdue");
  });
});

describe("isLate", () => {
  it("is true only after the due date", () => {
    expect(isLate("2026-06-20T00:00:00Z", "2026-06-19T23:59:00Z")).toBe(true);
    expect(isLate("2026-06-19T12:00:00Z", "2026-06-19T23:59:00Z")).toBe(false);
  });
});

describe("submissionState", () => {
  it("maps null/submitted/graded", () => {
    expect(submissionState(null)).toBe("not_submitted");
    expect(submissionState({ submitted_at: null })).toBe("not_submitted");
    expect(submissionState({ submitted_at: "2026-06-19T10:00:00Z", marks_awarded: null })).toBe("submitted");
    expect(submissionState({ submitted_at: "2026-06-19T10:00:00Z", marks_awarded: 8 })).toBe("graded");
  });
});

describe("percentage", () => {
  it("rounds to one decimal and guards zero max", () => {
    expect(percentage(8, 10)).toBe(80);
    expect(percentage(1, 3)).toBe(33.3);
    expect(percentage(5, 0)).toBe(0);
  });
});

describe("buildGradebook", () => {
  const students: GbStudent[] = [
    { id: "s1", name: "Asha", rollNo: "01" },
    { id: "s2", name: "Ravi", rollNo: "02" },
  ];
  const assignments: GbAssignment[] = [
    { id: "a1", title: "A1", maxMarks: 10 },
    { id: "a2", title: "A2", maxMarks: 20 },
  ];
  const submissions: GbSubmission[] = [
    { assignmentId: "a1", studentId: "s1", marksAwarded: 8 },   // 80%
    { assignmentId: "a2", studentId: "s1", marksAwarded: 10 },  // 50%
    { assignmentId: "a1", studentId: "s2", marksAwarded: null }, // submitted, ungraded
    // s2/a2 missing
  ];
  const gb = buildGradebook(students, assignments, submissions);

  it("builds a cell per student × assignment with the right status", () => {
    const s1 = gb.rows.find((r) => r.student.id === "s1")!;
    expect(s1.cells.map((c) => c.status)).toEqual(["graded", "graded"]);
    const s2 = gb.rows.find((r) => r.student.id === "s2")!;
    expect(s2.cells.map((c) => c.status)).toEqual(["submitted", "missing"]);
  });

  it("averages each student as a percentage over graded cells", () => {
    expect(gb.rows.find((r) => r.student.id === "s1")!.average).toBe(65); // (80 + 50)/2
    expect(gb.rows.find((r) => r.student.id === "s2")!.average).toBeNull();
  });

  it("averages each assignment over graded submissions", () => {
    expect(gb.assignmentAverages.find((a) => a.assignmentId === "a1")!.average).toBe(80);
    expect(gb.assignmentAverages.find((a) => a.assignmentId === "a2")!.average).toBe(50);
  });
});

describe("gradeBand", () => {
  it("buckets by 40% pass mark and submission status", () => {
    expect(gradeBand(8, 10, "graded")).toBe("pass");
    expect(gradeBand(3, 10, "graded")).toBe("fail");
    expect(gradeBand(null, 10, "submitted")).toBe("submitted");
    expect(gradeBand(null, 10, "missing")).toBe("missing");
  });
});

describe("youTubeEmbedUrl", () => {
  it("converts watch, youtu.be and shorts URLs", () => {
    expect(youTubeEmbedUrl("https://www.youtube.com/watch?v=abc123")).toBe("https://www.youtube.com/embed/abc123");
    expect(youTubeEmbedUrl("https://youtu.be/xyz789")).toBe("https://www.youtube.com/embed/xyz789");
    expect(youTubeEmbedUrl("https://youtube.com/shorts/short99")).toBe("https://www.youtube.com/embed/short99");
    expect(youTubeEmbedUrl("https://www.youtube.com/embed/keep")).toBe("https://www.youtube.com/embed/keep");
  });
  it("returns null for non-YouTube or malformed URLs", () => {
    expect(youTubeEmbedUrl("https://drive.google.com/file/d/1")).toBeNull();
    expect(youTubeEmbedUrl("not a url")).toBeNull();
    expect(youTubeEmbedUrl("")).toBeNull();
  });
});
