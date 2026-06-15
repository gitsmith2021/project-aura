import { describe, it, expect } from "vitest";
import {
  isOutpassOverdue, liveOutpassStatus, minutesBetween, durationLabel,
  visitorTally, outpassTally,
} from "@/lib/gate";

const NOW = new Date("2026-06-15T18:00:00.000Z");

describe("isOutpassOverdue", () => {
  it("approved + past expected return + not returned → overdue", () => {
    expect(isOutpassOverdue({ status: "approved", expected_return: "2026-06-15T17:00:00.000Z", actual_return: null }, NOW)).toBe(true);
  });
  it("approved but returned → not overdue", () => {
    expect(isOutpassOverdue({ status: "approved", expected_return: "2026-06-15T17:00:00.000Z", actual_return: "2026-06-15T16:30:00.000Z" }, NOW)).toBe(false);
  });
  it("approved + still within window → not overdue", () => {
    expect(isOutpassOverdue({ status: "approved", expected_return: "2026-06-15T19:00:00.000Z", actual_return: null }, NOW)).toBe(false);
  });
  it("non-approved statuses are not overdue (except stored overdue)", () => {
    expect(isOutpassOverdue({ status: "pending", expected_return: "2026-06-15T17:00:00.000Z", actual_return: null }, NOW)).toBe(false);
    expect(isOutpassOverdue({ status: "overdue", expected_return: "2026-06-15T17:00:00.000Z", actual_return: null }, NOW)).toBe(true);
  });
});

describe("liveOutpassStatus", () => {
  it("upgrades a late approved outpass to overdue", () => {
    expect(liveOutpassStatus({ status: "approved", expected_return: "2026-06-15T17:00:00.000Z", actual_return: null }, NOW)).toBe("overdue");
  });
  it("leaves other statuses unchanged", () => {
    expect(liveOutpassStatus({ status: "returned", expected_return: "2026-06-15T17:00:00.000Z", actual_return: "2026-06-15T16:00:00.000Z" }, NOW)).toBe("returned");
    expect(liveOutpassStatus({ status: "pending", expected_return: "2026-06-15T19:00:00.000Z", actual_return: null }, NOW)).toBe("pending");
  });
});

describe("minutesBetween / durationLabel", () => {
  it("computes whole minutes, never negative", () => {
    expect(minutesBetween("2026-06-15T17:00:00.000Z", "2026-06-15T18:15:00.000Z")).toBe(75);
    expect(minutesBetween("2026-06-15T19:00:00.000Z", "2026-06-15T18:00:00.000Z")).toBe(0);
  });
  it("formats durations", () => {
    expect(durationLabel(45)).toBe("45m");
    expect(durationLabel(60)).toBe("1h");
    expect(durationLabel(135)).toBe("2h 15m");
  });
});

describe("visitorTally", () => {
  it("counts on-campus vs total", () => {
    expect(visitorTally([{ status: "checked_in" }, { status: "checked_out" }, { status: "checked_in" }]))
      .toEqual({ onCampus: 2, total: 3 });
  });
});

describe("outpassTally", () => {
  it("counts pending, out, and overdue", () => {
    const t = outpassTally([
      { status: "pending", expected_return: "2026-06-15T19:00:00.000Z", actual_return: null },
      { status: "approved", expected_return: "2026-06-15T19:00:00.000Z", actual_return: null }, // out, not overdue
      { status: "approved", expected_return: "2026-06-15T17:00:00.000Z", actual_return: null }, // out + overdue
      { status: "returned", expected_return: "2026-06-15T17:00:00.000Z", actual_return: "2026-06-15T16:00:00.000Z" },
    ], NOW);
    expect(t.pending).toBe(1);
    expect(t.out).toBe(2);
    expect(t.overdue).toBe(1);
    expect(t.total).toBe(4);
  });
});
