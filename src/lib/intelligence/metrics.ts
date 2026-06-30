// ════════════════════════════════════════════════════════════════════════════
// CF-3.1 WS5/WS6 — Performance metrics + usage analytics (pure).
//
// Aggregates logged executions (intelligence_queries) into an internal dashboard
// model: latency (avg/p95), success/clarify/failure rates, most-common intents &
// questions, and the weakest recognitions. No PII beyond the question text the
// asker already typed; RLS-scoped reads happen in the action. Pure + tested.
// ════════════════════════════════════════════════════════════════════════════

export type QueryRow = {
  question: string;
  intent_id: string | null;
  response_type: string | null;
  confidence: number | null;
  latency_ms: number | null;
  path: string | null;
  created_at: string;
};

export type Tally = { key: string; n: number };
export type IntelligenceMetrics = {
  total: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  avgConfidence: number;
  successRate: number;       // produced a visualization
  clarifyRate: number;       // asked for clarification
  failRate: number;          // couldn't answer (no_match)
  slowest: { question: string; latencyMs: number }[];
  topResponseTypes: Tally[];
  topIntents: Tally[];
  topQuestions: Tally[];
  weakest: { question: string; confidence: number }[];   // lowest-confidence recognitions
};

const VIZ_TYPES = new Set(["KPI", "LIST", "TREND", "COMPARISON", "DISTRIBUTION", "EXECUTIVE", "MIXED"]);

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, n) => s + n, 0) / xs.length : 0);
const r1 = (n: number) => Math.round(n * 10) / 10;

/** percentile (0..1) of a numeric series (nearest-rank). */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[idx];
}

function tally(keys: (string | null | undefined)[], limit = 8): Tally[] {
  const m = new Map<string, number>();
  for (const k of keys) { if (!k) continue; m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n).slice(0, limit);
}

export function summarizeMetrics(rows: QueryRow[]): IntelligenceMetrics {
  const total = rows.length;
  const latencies = rows.map((r) => r.latency_ms).filter((n): n is number => typeof n === "number");
  const confidences = rows.map((r) => r.confidence).filter((n): n is number => typeof n === "number");

  const isClarify = (r: QueryRow) => r.response_type === "clarify" || r.path === "clarify";
  const isFail = (r: QueryRow) => r.response_type === "no_match" || r.path === "no_match";
  const isSuccess = (r: QueryRow) => !!r.response_type && VIZ_TYPES.has(r.response_type);

  const slowest = rows
    .filter((r) => typeof r.latency_ms === "number")
    .sort((a, b) => (b.latency_ms ?? 0) - (a.latency_ms ?? 0))
    .slice(0, 5)
    .map((r) => ({ question: r.question, latencyMs: r.latency_ms! }));

  const weakest = rows
    .filter((r) => typeof r.confidence === "number")
    .sort((a, b) => (a.confidence ?? 0) - (b.confidence ?? 0))
    .slice(0, 5)
    .map((r) => ({ question: r.question, confidence: r.confidence! }));

  return {
    total,
    avgLatencyMs: Math.round(avg(latencies)),
    p95LatencyMs: Math.round(percentile(latencies, 0.95)),
    avgConfidence: total ? r1(avg(confidences) * 100) / 100 : 0,
    successRate: total ? r1((rows.filter(isSuccess).length / total) * 100) : 0,
    clarifyRate: total ? r1((rows.filter(isClarify).length / total) * 100) : 0,
    failRate: total ? r1((rows.filter(isFail).length / total) * 100) : 0,
    slowest,
    topResponseTypes: tally(rows.map((r) => r.response_type)),
    topIntents: tally(rows.map((r) => r.intent_id)),
    topQuestions: tally(rows.map((r) => r.question.trim().toLowerCase())),
    weakest,
  };
}
