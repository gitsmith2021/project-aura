// ════════════════════════════════════════════════════════════════════════════
// CF-3.1 WS8 — Response Pattern Library (pure, reusable).
//
// The single library of visualization PRIMITIVES every Aura product composes from
// — never hardcode a layout inside an intent. Each builder turns already-computed,
// RLS-safe data into a typed Block; the Visualization Composer renders them.
// Forecast is a deterministic least-squares projection (clearly labelled), never
// an LLM guess. Pure + unit-tested.
// ════════════════════════════════════════════════════════════════════════════

import type {
  AlertItem, AlertSeverity, BenchmarkItem, Block, ForecastPoint, HeatmapBlock, RiskItem, TimelineEvent,
} from "./types";
import type { ResultRow, ValueFormat } from "@/lib/dataExplorer";

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

// ── Forecast ─────────────────────────────────────────────────────────────────────
/** Least-squares slope/intercept over (index, value) points. */
export function linearFit(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };
  const xs = values.map((_, i) => i);
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = values.reduce((s, y) => s + y, 0) / n;
  let numr = 0, den = 0;
  for (let i = 0; i < n; i++) { numr += (xs[i] - mx) * (values[i] - my); den += (xs[i] - mx) ** 2; }
  const slope = den === 0 ? 0 : numr / den;
  return { slope, intercept: my - slope * mx };
}

/** Increment a "YYYY-MM" period by one month. */
export function nextMonth(period: string): string {
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return period;
  let y = Number(m[1]); let mo = Number(m[2]) + 1;
  if (mo > 12) { mo = 1; y++; }
  return `${y}-${String(mo).padStart(2, "0")}`;
}

/** A trend series (actuals) + N projected periods (deterministic linear projection). */
export function buildForecast(title: string, series: { period: string; value: number }[], periods = 3, valueFormat?: ValueFormat): Block | null {
  const actuals = series.filter((p) => Number.isFinite(num(p.value)));
  if (actuals.length < 2) return null;
  const { slope, intercept } = linearFit(actuals.map((p) => num(p.value)));
  const points: ForecastPoint[] = actuals.map((p) => ({ period: p.period, value: Math.round(num(p.value)), projected: false }));
  let period = actuals[actuals.length - 1].period;
  for (let k = 1; k <= periods; k++) {
    period = nextMonth(period);
    points.push({ period, value: Math.max(0, Math.round(intercept + slope * (actuals.length - 1 + k))), projected: true });
  }
  return { kind: "forecast", title, valueFormat, points };
}

// ── Alerts ─────────────────────────────────────────────────────────────────────
export function buildAlerts(items: AlertItem[]): Block | null {
  return items.length ? { kind: "alerts", items } : null;
}
/** A grounded alert from a flagged count (e.g. "12 students below 75%"). */
export function countAlert(count: number, label: string, severity: AlertSeverity = "warn"): AlertItem {
  return { severity: count > 0 ? severity : "good", text: count > 0 ? `${count.toLocaleString("en-IN")} ${label}` : `No ${label}` };
}

// ── Timeline ─────────────────────────────────────────────────────────────────────
export function buildTimeline(title: string, events: TimelineEvent[]): Block | null {
  return events.length ? { kind: "timeline", title, events } : null;
}

// ── Benchmark ────────────────────────────────────────────────────────────────────
export function buildBenchmark(title: string, items: BenchmarkItem[]): Block | null {
  return items.length ? { kind: "benchmark", title, items } : null;
}

// ── Heatmap ──────────────────────────────────────────────────────────────────────
/** Pivot flat rows (x, y, value) into a heatmap matrix. */
export function buildHeatmap(title: string, rows: ResultRow[], xKey: string, yKey: string, valueKey: string): HeatmapBlock | null {
  if (rows.length === 0) return null;
  const xLabels: string[] = []; const yLabels: string[] = [];
  const xi = new Map<string, number>(); const yi = new Map<string, number>();
  const idx = (labels: string[], map: Map<string, number>, v: string) => {
    if (!map.has(v)) { map.set(v, labels.length); labels.push(v); }
    return map.get(v)!;
  };
  const cells = rows.map((r) => ({ x: idx(xLabels, xi, String(r[xKey] ?? "—")), y: idx(yLabels, yi, String(r[yKey] ?? "—")), value: num(r[valueKey]) }));
  return { kind: "heatmap", title, xLabels, yLabels, cells };
}

// ── Risk matrix ──────────────────────────────────────────────────────────────────
export function buildRiskMatrix(title: string, items: RiskItem[]): Block | null {
  return items.length ? { kind: "riskMatrix", title, items } : null;
}
