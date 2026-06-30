// ════════════════════════════════════════════════════════════════════════════
// CF-3 v2 — Query Planner.
//
// Converts an ExtractedQuery (catalog-constrained) + the chosen Response Strategy
// into one or more CF-2 Query Models, then VALIDATES each against the entity
// before returning — a hallucinated/typo'd column can never reach the DB. The
// planner emits ONLY the CF-2 Query Model; it never writes SQL. Pure + tested.
// (Value resolution — e.g. department NAME → id — happens upstream, async, in the
//  orchestrator, which mutates filter values before planning.)
// ════════════════════════════════════════════════════════════════════════════

import {
  validateQueryModel, DEFAULT_LIMIT, MAX_LIMIT,
  type EntityDef, type QueryModel, type FilterGroup, type Condition, type Aggregation,
} from "@/lib/dataExplorer";
import type { ExtractedQuery, GridColumn, NamedQueryModel, ResponseType } from "./types";
import { decideResponse } from "./responseStrategy";

const GRID_LIMIT = 200;
const SKIP_IN_GRID = new Set(["is_active", "email", "phone", "created_at", "updated_at"]);

export type Plan = {
  responseType: ResponseType;
  title: string;
  models: NamedQueryModel[];
  gridColumns: GridColumn[];
  numericMetric: string | null;
  category: string | null;     // distribution category column
  dateField: string | null;    // trend date column
  forecast: boolean;           // WS8 — project the trend forward
};

/** Columns to show in a record grid: business-meaningful, metric guaranteed, capped. */
export function displayColumns(entity: EntityDef, numericMetric: string | null): GridColumn[] {
  const ordered = [...entity.columns].sort((a, b) => rank(a.key) - rank(b.key));
  const out: GridColumn[] = [];
  for (const c of ordered) {
    if (SKIP_IN_GRID.has(c.key)) continue;
    out.push({ key: c.key, label: c.key === "department_id" ? "Department" : c.label, format: c.type === "number" ? (/(salary|amount|fee|pay|wage|budget|expense)/.test(c.key) ? "currency" : "number") : "text" });
    if (out.length >= 7) break;
  }
  if (numericMetric && !out.some((c) => c.key === numericMetric)) {
    const c = entity.columns.find((x) => x.key === numericMetric);
    if (c) out.push({ key: c.key, label: c.label, format: /(salary|amount|fee|pay|wage)/.test(c.key) ? "currency" : "number" });
  }
  return out;
}
const rank = (key: string): number => {
  if (/(full_name|applicant_name|^name$)/.test(key)) return 0;
  if (/(employee_id|roll_no|^code$)/.test(key)) return 1;
  if (/designation/.test(key)) return 2;
  if (/department_id/.test(key)) return 3;
  if (/(program|year|status)/.test(key)) return 4;
  return 5;
};

function toFilterGroup(x: ExtractedQuery): FilterGroup | null {
  if (x.filters.length === 0) return null;
  const conditions: Condition[] = x.filters.map((f) => ({ field: f.column, operator: f.operator, value: f.value }));
  return { op: "and", conditions };
}

function statsAggregations(metric: string | null): Aggregation[] {
  const aggs: Aggregation[] = [{ fn: "count", field: "*", as: "n" }];
  if (metric) aggs.push({ fn: "avg", field: metric, as: "avg" }, { fn: "min", field: metric, as: "min" }, { fn: "max", field: metric, as: "max" }, { fn: "sum", field: metric, as: "total" });
  return aggs;
}

/** Plan the CF-2 queries + grid metadata for a question. Returns null if nothing valid. */
export function planQueries(x: ExtractedQuery, entity: EntityDef): Plan | null {
  const recipe = decideResponse(x, entity);
  const filters = toFilterGroup(x);
  const dateRange = x.dateRange?.field ? { field: x.dateRange.field, from: x.dateRange.from ?? null, to: x.dateRange.to ?? null } : null;
  const metric = x.numericMetric && entity.columns.some((c) => c.key === x.numericMetric && c.type === "number") ? x.numericMetric : null;

  const models: NamedQueryModel[] = [];
  const add = (name: string, model: QueryModel) => { if (validateQueryModel(model, entity).ok) models.push({ name, model }); };

  const gridColumns = displayColumns(entity, metric);

  if (recipe.needsList) {
    add("list", {
      entity: entity.key, fields: gridColumns.map((c) => c.key), filters, dateRange,
      sort: x.sort ? [{ field: x.sort.field, dir: x.sort.dir }] : undefined,
      limit: x.limit ?? GRID_LIMIT,
    });
  }
  if (recipe.needsStats) {
    add("stats", { entity: entity.key, fields: [], filters, dateRange, aggregations: statsAggregations(metric), limit: MAX_LIMIT });
  }
  let category: string | null = null;
  if (recipe.needsDistribution) {
    category = x.groupBy ?? entity.columns.find((c) => c.groupable)?.key ?? null;
    if (category) add("dist", {
      entity: entity.key, fields: [], filters, dateRange, groupBy: [category],
      aggregations: metric ? [{ fn: "sum", field: metric, as: "total" }, { fn: "count", field: "*", as: "n" }] : [{ fn: "count", field: "*", as: "n" }],
      limit: MAX_LIMIT,
    });
  }
  let dateField: string | null = null;
  if (recipe.needsTrend) {
    dateField = x.dateRange?.field ?? entity.defaultDateField ?? entity.columns.find((c) => c.type === "date")?.key ?? null;
    if (dateField) {
      const fields = metric ? [dateField, metric] : [dateField];
      add("trend", { entity: entity.key, fields, filters, dateRange, limit: MAX_LIMIT });
    }
  }

  if (models.length === 0) return null;
  return { responseType: recipe.responseType, title: x.title ?? entity.label, models, gridColumns, numericMetric: metric, category, dateField, forecast: !!x.forecast };
}

export { DEFAULT_LIMIT };
