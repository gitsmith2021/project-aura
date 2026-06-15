import { describe, it, expect } from "vitest";
import {
  parseRequirements, attendanceRate, averageMarks, sessionTally,
  normaliseMarks, labTypeLabel, LAB_TYPES,
} from "@/lib/laboratories";

describe("parseRequirements", () => {
  it("passes through a clean array, trimming + dropping blanks", () => {
    expect(parseRequirements(["Stopwatch", " Metre scale ", ""])).toEqual(["Stopwatch", "Metre scale"]);
  });
  it("splits a comma / newline string", () => {
    expect(parseRequirements("Stopwatch, Bob\nStand")).toEqual(["Stopwatch", "Bob", "Stand"]);
  });
  it("returns [] for null / non-string", () => {
    expect(parseRequirements(null)).toEqual([]);
    expect(parseRequirements(42)).toEqual([]);
  });
});

describe("attendanceRate", () => {
  it("is 0 with no records", () => {
    expect(attendanceRate([])).toBe(0);
  });
  it("rounds present/total to a whole percent", () => {
    expect(attendanceRate([{ is_present: true }, { is_present: false }])).toBe(50);
    expect(attendanceRate([{ is_present: true }, { is_present: true }, { is_present: false }])).toBe(67);
  });
});

describe("averageMarks", () => {
  it("returns null when no marks recorded", () => {
    expect(averageMarks([{ marks_secured: null }, { marks_secured: null }])).toBeNull();
    expect(averageMarks([])).toBeNull();
  });
  it("averages only the recorded marks, rounded to 2dp", () => {
    expect(averageMarks([{ marks_secured: 10 }, { marks_secured: 20 }, { marks_secured: null }])).toBe(15);
    expect(averageMarks([{ marks_secured: 10 }, { marks_secured: 15 }, { marks_secured: 11 }])).toBe(12);
  });
});

describe("sessionTally", () => {
  it("counts present / absent / total + rate", () => {
    expect(sessionTally([{ is_present: true }, { is_present: false }, { is_present: true }]))
      .toEqual({ present: 2, absent: 1, total: 3, rate: 67 });
  });
  it("handles an empty session", () => {
    expect(sessionTally([])).toEqual({ present: 0, absent: 0, total: 0, rate: 0 });
  });
});

describe("normaliseMarks", () => {
  it("returns null for blank input", () => {
    expect(normaliseMarks("")).toBeNull();
    expect(normaliseMarks(null)).toBeNull();
  });
  it("clamps to [0, max]", () => {
    expect(normaliseMarks("50")).toBe(50);
    expect(normaliseMarks(150, 100)).toBe(100);
    expect(normaliseMarks(-5)).toBe(0);
    expect(normaliseMarks("25", 20)).toBe(20);
  });
  it("returns null for non-numeric input", () => {
    expect(normaliseMarks("abc")).toBeNull();
  });
});

describe("labTypeLabel", () => {
  it("maps known types and falls back to Other", () => {
    expect(labTypeLabel("physics")).toBe("Physics");
    expect(labTypeLabel("computer_science")).toBe("Computer Science");
    expect(labTypeLabel("nonsense")).toBe("Other");
  });
  it("has a label for every declared type", () => {
    for (const t of LAB_TYPES) expect(labTypeLabel(t)).toBeTruthy();
  });
});
