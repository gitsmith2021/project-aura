import { describe, it, expect } from "vitest";
import { summarizeMetrics, percentile, type QueryRow } from "@/lib/intelligence/metrics";

const row = (p: Partial<QueryRow>): QueryRow => ({
  question: "q", intent_id: null, response_type: "LIST", confidence: 0.9, latency_ms: 100, path: "general", created_at: "2026-06-30T00:00:00Z", ...p,
});

describe("metrics", () => {
  it("percentile uses nearest-rank", () => {
    expect(percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 0.95)).toBe(100);
    expect(percentile([], 0.95)).toBe(0);
  });

  it("summarizes latency, rates and tallies", () => {
    const rows: QueryRow[] = [
      row({ question: "Total students", response_type: "KPI", latency_ms: 50, confidence: 0.95 }),
      row({ question: "Total students", response_type: "KPI", latency_ms: 70, confidence: 0.95 }),
      row({ question: "weird thing", response_type: "no_match", path: "no_match", latency_ms: 30, confidence: 0 }),
      row({ question: "which commerce", response_type: "clarify", path: "clarify", latency_ms: 200, confidence: 0.4 }),
      row({ question: "fees", response_type: "TREND", intent_id: "finance.fee_collection", latency_ms: 120, confidence: 0.8 }),
    ];
    const m = summarizeMetrics(rows);
    expect(m.total).toBe(5);
    expect(m.successRate).toBe(60);   // 3 viz (KPI,KPI,TREND) of 5
    expect(m.clarifyRate).toBe(20);
    expect(m.failRate).toBe(20);
    expect(m.slowest[0].latencyMs).toBe(200);
    expect(m.weakest[0].confidence).toBe(0);
    expect(m.topQuestions[0]).toEqual({ key: "total students", n: 2 });
    expect(m.topIntents[0]).toEqual({ key: "finance.fee_collection", n: 1 });
    expect(m.avgLatencyMs).toBe(94); // (50+70+30+200+120)/5 = 94
  });

  it("handles an empty log", () => {
    const m = summarizeMetrics([]);
    expect(m.total).toBe(0);
    expect(m.avgLatencyMs).toBe(0);
    expect(m.successRate).toBe(0);
  });
});
