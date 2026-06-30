// ════════════════════════════════════════════════════════════════════════════
// CF-3 v2 — Visualization Composer (Card / Response-Pattern Library).
//
// Given a Plan (from the Query Planner) + the datasets CF-2 returned, it assembles
// an ordered list of typed BLOCKS — KpiStrip, RecordGrid, Chart, Comparison — for
// the UI to render dynamically. No two questions need the same layout. The numbers
// are authoritative; the Executive Summary (added by the orchestrator) only ever
// describes these. Pure + tested.
// ════════════════════════════════════════════════════════════════════════════

import type { ResultRow, EntityDef } from "@/lib/dataExplorer";
import type { Block, ComposedView, ComputedKpi, ComputedWidget } from "./types";
import type { Plan } from "./queryPlanner";
import { formatValue, shapeWidget } from "./composer";
import { buildForecast, buildAlerts, countAlert } from "./responsePatterns";

type Datasets = Map<string, ResultRow[]>;
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

function kpi(label: string, value: number | null, format: "number" | "currency" | "percent" = "number", tone = "default"): ComputedKpi {
  return { label, value, display: formatValue(value, format), tone };
}

const isCurrency = (key: string | null) => !!key && /(salary|amount|fee|pay|wage|budget|expense)/.test(key);

/** Build stat KPIs from the "stats" aggregate row (count + avg/min/max of the metric). */
function statsKpis(plan: Plan, datasets: Datasets, entity: EntityDef): ComputedKpi[] {
  const row = (datasets.get("stats") ?? [])[0] ?? {};
  const metricCol = plan.numericMetric ? entity.columns.find((c) => c.key === plan.numericMetric) : null;
  const m = metricCol?.label ?? "Value";
  const fmt = isCurrency(plan.numericMetric) ? "currency" : "number";
  const kpis: ComputedKpi[] = [kpi(`Total ${entity.label}`, row.n != null ? num(row.n) : null, "number", "good")];
  if (plan.numericMetric) {
    kpis.push(
      kpi(`Average ${m}`, row.avg != null ? num(row.avg) : null, fmt),
      kpi(`Lowest ${m}`, row.min != null ? num(row.min) : null, fmt),
      kpi(`Highest ${m}`, row.max != null ? num(row.max) : null, fmt),
    );
  }
  return kpis;
}

/** Assemble the ComposedView blocks for a plan + its executed datasets. */
export function composeView(plan: Plan, datasets: Datasets, entity: EntityDef): ComposedView {
  const blocks: Block[] = [];
  const list = datasets.get("list") ?? [];
  const dist = datasets.get("dist") ?? [];
  const trend = datasets.get("trend") ?? [];
  const statsRow = (datasets.get("stats") ?? [])[0];

  // KPI strip — for KPI / LIST(with metric) / EXECUTIVE
  if (datasets.has("stats")) {
    const kpis = statsKpis(plan, datasets, entity);
    if (kpis.length) blocks.push({ kind: "kpiStrip", kpis });
  }

  // WS8 — Alert: a filtered LIST (threshold query) flags how many records matched.
  if (plan.responseType === "LIST" && datasets.has("stats")) {
    const n = statsRow?.n != null ? num(statsRow.n) : list.length;
    const al = buildAlerts([countAlert(n, `${entity.label.toLowerCase()} match this criteria — review`)]);
    if (al) blocks.push(al);
  }

  // Record grid — the list of matching records
  if (datasets.has("list")) {
    const total = statsRow?.n != null ? num(statsRow.n) : list.length;
    blocks.push({ kind: "recordGrid", title: plan.title, columns: plan.gridColumns, rows: list, total, capped: list.length >= 200 });
  }

  // Distribution chart
  if (datasets.has("dist") && plan.category) {
    const value = plan.numericMetric ? "total" : "n";
    const widget: ComputedWidget = shapeWidget(
      { type: plan.responseType === "DISTRIBUTION" ? "donut" : "bar", title: `By ${labelFor(entity, plan.category)}`, fromQuery: "dist", category: plan.category, value, sort: "desc", limit: 12 },
      dist,
    );
    blocks.push({ kind: "chart", widget });
  }

  // Trend chart (monthly buckets) — or a WS8 forecast block when projected.
  if (datasets.has("trend") && plan.dateField) {
    const widget: ComputedWidget = shapeWidget(
      { type: "trend", title: plan.title, fromQuery: "trend", category: "period", value: plan.numericMetric ?? "count", dateField: plan.dateField },
      trend,
    );
    const fc = plan.forecast
      ? buildForecast(plan.title, widget.rows.map((r) => ({ period: String(r[widget.category!]), value: num(r[widget.value!]) })), 3, isCurrency(plan.numericMetric) ? "currency" : "number")
      : null;
    blocks.push(fc ?? { kind: "chart", widget });
  }

  const empty = (!datasets.has("list") || list.length === 0)
    && (!datasets.has("dist") || dist.length === 0)
    && (!datasets.has("trend") || trend.length === 0)
    && (statsRow?.n == null || num(statsRow.n) === 0);

  return { title: plan.title, responseType: plan.responseType, blocks, empty };
}

const labelFor = (entity: EntityDef, key: string) => (key === "department_id" ? "Department" : entity.columns.find((c) => c.key === key)?.label ?? key);
