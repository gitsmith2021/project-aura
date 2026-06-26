// CF-3 — Dashboard Composer.
//
// Code-driven (never LLM, never hardcoded screens): given a declarative Dashboard
// Spec + the datasets CF-2 returned (already RLS-safe), it computes each KPI and
// shapes each widget's data. The numbers it produces are authoritative — the
// Executive Summary only ever describes these, never invents them. Pure / tested.

import type { ResultRow } from "@/lib/dataExplorer";
import type {
  ComputedDashboard, ComputedKpi, ComputedWidget, DashboardSpec, KpiSpec, ValueFormat, WidgetSpec,
} from "./types";

type Datasets = Map<string, ResultRow[]>;

export function composeDashboard(spec: DashboardSpec, datasets: Datasets): ComputedDashboard {
  const kpis = spec.kpis.map((k) => computeKpi(k, datasets.get(k.fromQuery) ?? []));
  const widgets = spec.widgets.map((w) => shapeWidget(w, datasets.get(w.fromQuery) ?? []));
  const empty = [...datasets.values()].every((rows) => rows.length === 0);
  return { kpis, widgets, empty };
}

function computeKpi(spec: KpiSpec, rows: ResultRow[]): ComputedKpi {
  let value: number | null = null;
  try { value = spec.compute(rows); } catch { value = null; }
  return {
    label: spec.label,
    value,
    display: formatValue(value, spec.format ?? "number"),
    tone: spec.tone ?? "default",
  };
}

function shapeWidget(spec: WidgetSpec, rows: ResultRow[]): ComputedWidget {
  let out = rows;
  // Charts/rankings: sort by the value column and cap.
  if (spec.value && (spec.type === "bar" || spec.type === "pie" || spec.type === "donut" || spec.type === "ranking" || spec.type === "line" || spec.type === "area")) {
    const v = spec.value;
    out = [...rows].sort((a, b) => num(b[v]) - num(a[v]));
    if (spec.sort === "asc") out.reverse();
  }
  if (spec.limit && spec.limit > 0) out = out.slice(0, spec.limit);
  return { ...spec, rows: out };
}

// ── Formatting ──────────────────────────────────────────────────────────────────
export function formatValue(value: number | null, format: ValueFormat): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  switch (format) {
    case "currency": return `₹${Math.round(value).toLocaleString("en-IN")}`;
    case "percent":  return `${Math.round(value * 10) / 10}%`;
    case "number":   return Math.round(value * 100) / 100 === Math.round(value) ? Math.round(value).toLocaleString("en-IN") : (Math.round(value * 100) / 100).toLocaleString("en-IN");
    default:         return String(value);
  }
}

const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);

// ── KPI compute helpers (shared by intent definitions) ───────────────────────────
/** Sum a numeric column across rows. */
export const sumOf = (col: string) => (rows: ResultRow[]) => rows.reduce((s, r) => s + num(r[col]), 0);
/** Sum a column but only over rows whose `keyCol` equals `keyVal`. */
export const sumWhere = (col: string, keyCol: string, keyVal: string) => (rows: ResultRow[]) =>
  rows.filter((r) => String(r[keyCol]) === keyVal).reduce((s, r) => s + num(r[col]), 0);
/** Total row count via a count column (or row length fallback). */
export const totalCount = (countCol = "n") => (rows: ResultRow[]) =>
  rows.reduce((s, r) => s + (r[countCol] !== undefined ? num(r[countCol]) : 1), 0);
/** Ratio (a / (a+b)) × 100 from two `sumWhere`-style buckets. */
export const ratioPct = (col: string, keyCol: string, numeratorVal: string, denomVals: string[]) => (rows: ResultRow[]) => {
  const top = rows.filter((r) => String(r[keyCol]) === numeratorVal).reduce((s, r) => s + num(r[col]), 0);
  const bottom = rows.filter((r) => denomVals.includes(String(r[keyCol]))).reduce((s, r) => s + num(r[col]), 0);
  return bottom > 0 ? (top / bottom) * 100 : null;
};
