import { describe, it, expect } from "vitest";
import {
  errorRate, rlsCoverage, compactNumber, formatLatency, paymentSeverity, INTENTIONAL_DENY_ALL_TABLES,
  type TableRls,
} from "@/lib/platformHealth";

describe("errorRate", () => {
  it("is a percentage to one decimal, guarding zero total", () => {
    expect(errorRate(3, 100)).toBe(3);
    expect(errorRate(1, 3)).toBe(33.3);
    expect(errorRate(0, 0)).toBe(0);
    expect(errorRate(5, 0)).toBe(0);
  });
});

describe("rlsCoverage", () => {
  const tables: TableRls[] = [
    { table_name: "students", rls_enabled: true },
    { table_name: "staff", rls_enabled: true },
    { table_name: "legacy_thing", rls_enabled: false },
  ];
  it("computes covered/total/pct and lists unprotected tables", () => {
    const c = rlsCoverage(tables);
    expect(c.covered).toBe(2);
    expect(c.total).toBe(3);
    expect(c.pct).toBe(66.7);
    expect(c.unprotected).toEqual(["legacy_thing"]);
  });
  it("reports 100% for an empty set", () => {
    expect(rlsCoverage([]).pct).toBe(100);
  });
});

describe("compactNumber", () => {
  it("compacts thousands/millions/billions", () => {
    expect(compactNumber(999)).toBe("999");
    expect(compactNumber(1234)).toBe("1.2k");
    expect(compactNumber(3_400_000)).toBe("3.4M");
    expect(compactNumber(2_000_000_000)).toBe("2B");
  });
});

describe("formatLatency", () => {
  it("formats ms and seconds, handling null", () => {
    expect(formatLatency(450)).toBe("450 ms");
    expect(formatLatency(1500)).toBe("1.5 s");
    expect(formatLatency(null)).toBe("—");
  });
});

describe("paymentSeverity", () => {
  it("bands the failure rate", () => {
    expect(paymentSeverity(0)).toBe("ok");
    expect(paymentSeverity(1)).toBe("info");
    expect(paymentSeverity(5)).toBe("warn");
    expect(paymentSeverity(15)).toBe("critical");
  });
});

describe("intentional deny-all tables", () => {
  it("documents the two service-role-only tables", () => {
    expect(INTENTIONAL_DENY_ALL_TABLES).toContain("razorpay_webhook_events");
    expect(INTENTIONAL_DENY_ALL_TABLES).toContain("scheduler_error_logs");
  });
});
