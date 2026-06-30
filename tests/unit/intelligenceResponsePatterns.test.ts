import { describe, it, expect } from "vitest";
import type { EntityDef, ResultRow } from "@/lib/dataExplorer";
import { extractQuery } from "@/lib/intelligence/slotExtractor";
import { linearFit, nextMonth, buildForecast, buildHeatmap, countAlert, buildBenchmark, buildRiskMatrix } from "@/lib/intelligence/responsePatterns";

const col = (key: string, label: string, type: EntityDef["columns"][number]["type"], f = true, g = false, a = false) =>
  ({ key, label, type, filterable: f, groupable: g, aggregatable: a });
const fees: EntityDef = {
  key: "fee_payments", label: "Fee Payments", category: "Finance", source: "fee_payments",
  columns: [col("amount_paid", "Amount", "number", true, false, true), col("payment_status", "Status", "text", true, true), col("paid_at", "Paid On", "date")],
  defaultDateField: "paid_at", sortOrder: 4,
};

describe("WS8 — pattern library builders", () => {
  it("linearFit recovers a known line", () => {
    const { slope, intercept } = linearFit([2, 4, 6, 8]); // y = 2x + 2
    expect(Math.round(slope)).toBe(2);
    expect(Math.round(intercept)).toBe(2);
  });
  it("nextMonth rolls over the year", () => {
    expect(nextMonth("2026-03")).toBe("2026-04");
    expect(nextMonth("2026-12")).toBe("2027-01");
  });
  it("buildForecast keeps actuals and projects forward", () => {
    const series = [{ period: "2026-01", value: 100 }, { period: "2026-02", value: 110 }, { period: "2026-03", value: 120 }];
    const block = buildForecast("Fees", series, 2)!;
    expect(block.kind).toBe("forecast");
    if (block.kind !== "forecast") return;
    expect(block.points.filter((p) => !p.projected)).toHaveLength(3);
    expect(block.points.filter((p) => p.projected)).toHaveLength(2);
    expect(block.points[3].period).toBe("2026-04");
    expect(block.points[3].value).toBeGreaterThan(120);   // upward trend continues
  });
  it("buildForecast needs at least two points", () => {
    expect(buildForecast("x", [{ period: "2026-01", value: 5 }], 3)).toBeNull();
  });
  it("buildHeatmap pivots flat rows", () => {
    const rows: ResultRow[] = [
      { dept: "CS", year: 1, n: 10 }, { dept: "CS", year: 2, n: 20 }, { dept: "EC", year: 1, n: 5 },
    ];
    const hm = buildHeatmap("Students", rows, "dept", "year", "n")!;
    expect(hm.xLabels).toEqual(["CS", "EC"]);
    expect(hm.yLabels).toEqual(["1", "2"]);
    expect(hm.cells).toHaveLength(3);
  });
  it("countAlert is grounded and severity-aware", () => {
    expect(countAlert(12, "students below 75%").severity).toBe("warn");
    expect(countAlert(0, "students below 75%").severity).toBe("good");
  });
  it("benchmark/risk builders pass through (reusable primitives)", () => {
    expect(buildBenchmark("t", [{ label: "Attendance", value: 72, target: 75 }])?.kind).toBe("benchmark");
    expect(buildRiskMatrix("t", [{ label: "Dues", likelihood: 3, impact: 3 }])?.kind).toBe("riskMatrix");
    expect(buildBenchmark("t", [])).toBeNull();
  });
});

describe("WS8 — forecast detection", () => {
  it("a forecast question routes to TREND + sets the forecast flag", () => {
    const ex = extractQuery("forecast fee collection for the next 3 months", [fees])!;
    expect(ex.responseHint).toBe("TREND");
    expect(ex.forecast).toBe(true);
  });
  it("a plain trend question is not a forecast", () => {
    const ex = extractQuery("fee collection over the last 12 months", [fees])!;
    expect(ex.forecast).toBe(false);
  });
});
