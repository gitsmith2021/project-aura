import { describe, it, expect } from "vitest";
import {
  FEATURES, FEATURE_LABELS, planHasFeature, STATUS_LABELS,
  daysLeft, effectiveStatus, planMonthlyEquivalent, mrr, arr, withinLimits,
  formatINR, invoiceNumber,
  type SubLike,
} from "@/lib/subscriptions";

describe("feature catalog", () => {
  it("labels every feature and marks premium ones", () => {
    for (const f of FEATURES) expect(FEATURE_LABELS[f.key]).toBeTruthy();
    expect(FEATURES.find((f) => f.key === "core")!.premium).toBe(false);
    expect(FEATURES.find((f) => f.key === "online_exams")!.premium).toBe(true);
  });
  it("planHasFeature checks membership", () => {
    expect(planHasFeature(["core", "lms"], "lms")).toBe(true);
    expect(planHasFeature(["core"], "cctv")).toBe(false);
    expect(planHasFeature(null, "core")).toBe(false);
  });
  it("labels every status", () => {
    for (const s of ["active", "trial", "expired", "cancelled"] as const) expect(STATUS_LABELS[s]).toBeTruthy();
  });
});

describe("daysLeft / effectiveStatus", () => {
  const now = new Date("2026-06-19T12:00:00Z");
  it("counts days to expiry and handles no expiry", () => {
    expect(daysLeft("2026-06-29T12:00:00Z", now)).toBe(10);
    expect(daysLeft("2026-06-14T12:00:00Z", now)).toBe(-5);
    expect(daysLeft(null, now)).toBeNull();
  });
  it("downgrades an expired active/trial sub", () => {
    expect(effectiveStatus("active", "2026-06-14T12:00:00Z", now)).toBe("expired");
    expect(effectiveStatus("trial", "2026-07-14T12:00:00Z", now)).toBe("trial");
    expect(effectiveStatus("cancelled", "2026-07-14T12:00:00Z", now)).toBe("cancelled");
  });
});

describe("planMonthlyEquivalent", () => {
  it("uses monthly price on monthly cycle", () => {
    expect(planMonthlyEquivalent({ price_monthly: 9999, price_annual: 99990 }, "monthly")).toBe(9999);
  });
  it("amortises annual over 12 months, falling back to 12× monthly", () => {
    expect(planMonthlyEquivalent({ price_monthly: 1000, price_annual: 10800 }, "annual")).toBe(900);
    expect(planMonthlyEquivalent({ price_monthly: 1000, price_annual: null }, "annual")).toBe(1000);
  });
});

describe("mrr / arr", () => {
  const now = new Date("2026-06-19T12:00:00Z");
  const subs: SubLike[] = [
    { status: "active", billing_cycle: "monthly", expires_at: "2026-07-19T12:00:00Z", plan: { price_monthly: 9999, price_annual: 99990 } },
    { status: "active", billing_cycle: "annual", expires_at: "2027-06-19T12:00:00Z", plan: { price_monthly: 19999, price_annual: 199990 } }, // 16665.83/mo
    { status: "trial", billing_cycle: "monthly", expires_at: "2026-07-01T12:00:00Z", plan: { price_monthly: 4999, price_annual: null } },     // excluded (trial)
    { status: "active", billing_cycle: "monthly", expires_at: "2026-06-01T12:00:00Z", plan: { price_monthly: 4999, price_annual: null } },    // excluded (expired)
  ];
  it("sums monthly-equivalent over paying subs only", () => {
    expect(mrr(subs, now)).toBe(9999 + 16665.83);
  });
  it("ARR is MRR × 12", () => {
    expect(arr(subs, now)).toBe(Math.round((9999 + 16665.83) * 12 * 100) / 100);
  });
});

describe("withinLimits", () => {
  it("flags over-cap usage and computes percentages", () => {
    const c = withinLimits({ max_students: 500, max_staff: 50 }, 600, 40);
    expect(c.studentsOver).toBe(true);
    expect(c.staffOver).toBe(false);
    expect(c.studentPct).toBe(120);
    expect(c.staffPct).toBe(80);
  });
  it("treats null caps as unlimited", () => {
    const c = withinLimits({ max_students: null, max_staff: null }, 99999, 9999);
    expect(c.studentsOver).toBe(false);
    expect(c.studentPct).toBeNull();
  });
});

describe("formatting", () => {
  it("formats INR and invoice numbers", () => {
    expect(formatINR(125000)).toBe("₹1,25,000");
    expect(formatINR(null)).toBe("—");
    expect(invoiceNumber(2026, 7)).toBe("INV/2026/0007");
  });
});
