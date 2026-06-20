import { describe, it, expect } from "vitest";
import {
  MEETING_STATUSES, MEETING_STATUS_LABELS, ACTION_STATUSES, ACTION_STATUS_LABELS,
  NAAC_MIN_MEETINGS_PER_YEAR, meetingStats, actionStats, isActionOverdue,
  completenessBand, BAND_COLOR,
} from "@/lib/iqac";

describe("status metadata", () => {
  it("labels every meeting and action status", () => {
    for (const s of MEETING_STATUSES) expect(MEETING_STATUS_LABELS[s]).toBeTruthy();
    for (const s of ACTION_STATUSES) expect(ACTION_STATUS_LABELS[s]).toBeTruthy();
  });
});

describe("meetingStats", () => {
  it("tallies statuses and the NAAC 6.1 compliance flag (≥2/year)", () => {
    expect(NAAC_MIN_MEETINGS_PER_YEAR).toBe(2);
    const s = meetingStats([{ status: "completed" }, { status: "minutes_pending" }, { status: "scheduled" }]);
    expect(s).toMatchObject({ total: 3, completed: 1, minutesPending: 1, scheduled: 1, compliant: true });
  });
  it("is non-compliant below the minimum", () => {
    expect(meetingStats([{ status: "completed" }]).compliant).toBe(false);
    expect(meetingStats([]).compliant).toBe(false);
  });
});

describe("actionStats", () => {
  it("tallies statuses and a resolved percentage", () => {
    const s = actionStats([{ status: "completed" }, { status: "completed" }, { status: "open" }, { status: "deferred" }]);
    expect(s.total).toBe(4);
    expect(s.completed).toBe(2);
    expect(s.resolvedPct).toBe(50);
  });
  it("is 0% for an empty list", () => {
    expect(actionStats([]).resolvedPct).toBe(0);
  });
});

describe("isActionOverdue", () => {
  const today = new Date(2026, 5, 19); // 2026-06-19
  it("flags past-due open/in-progress items", () => {
    expect(isActionOverdue("2026-06-10", "open", today)).toBe(true);
    expect(isActionOverdue("2026-06-10", "in_progress", today)).toBe(true);
  });
  it("ignores completed/deferred or future/empty due dates", () => {
    expect(isActionOverdue("2026-06-10", "completed", today)).toBe(false);
    expect(isActionOverdue("2026-06-10", "deferred", today)).toBe(false);
    expect(isActionOverdue("2026-06-29", "open", today)).toBe(false);
    expect(isActionOverdue(null, "open", today)).toBe(false);
  });
});

describe("completenessBand", () => {
  it("bands by 80/40/0 thresholds and maps a colour", () => {
    expect(completenessBand(0)).toBe("empty");
    expect(completenessBand(30)).toBe("low");
    expect(completenessBand(40)).toBe("partial");
    expect(completenessBand(80)).toBe("strong");
    expect(BAND_COLOR.strong).toBeTruthy();
    expect(BAND_COLOR.empty).toBeTruthy();
  });
});
