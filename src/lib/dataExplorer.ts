// ════════════════════════════════════════════════════════════════════════════
// AURA CORE FOUNDATION · CF-2 — Data Explorer: the Query Model + compiler
//
// One internal Query Model (JSON) is the durable abstraction. The Visual Builder
// (v1) produces it; future Natural-Language and Advanced-SQL modes will produce
// the SAME model. Everything here is PURE (no I/O) and unit-tested — the server
// action applies the compiled plan to a supabase-js query that runs as the user
// (read-only, RLS-respecting). See docs/AURA_CORE/CF2_DATA_EXPLORER.md.
// ════════════════════════════════════════════════════════════════════════════

// ── Registry types (mirror data_explorer_entities) ────────────────────────────
export type ColumnType = "text" | "number" | "boolean" | "date";

export type EntityColumn = {
  key: string;
  label: string;
  type: ColumnType;
  filterable: boolean;
  groupable: boolean;
  aggregatable: boolean;
};

export type EntityDef = {
  key: string;
  label: string;
  category: string;
  source: string;
  columns: EntityColumn[];
  defaultDateField: string | null;
  sortOrder: number;
};

// ── Query Model ────────────────────────────────────────────────────────────────
export type FilterOperator =
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
  | "like" | "ilike" | "in" | "is_null" | "not_null" | "between";

export type AggFn = "count" | "sum" | "avg" | "min" | "max";

export type Condition = {
  field: string;
  operator: FilterOperator;
  value?: unknown;          // scalar; array for `in`; [lo,hi] for `between`
};

export type FilterGroup = {
  op: "and" | "or";
  conditions: (Condition | FilterGroup)[];
};

export type Aggregation = { fn: AggFn; field: string; as: string };
export type SortSpec = { field: string; dir: "asc" | "desc" };
export type DateRange = { field: string; from?: string | null; to?: string | null };

export type QueryModel = {
  entity: string;
  fields: string[];
  filters?: FilterGroup | null;
  dateRange?: DateRange | null;
  sort?: SortSpec[];
  groupBy?: string[];
  aggregations?: Aggregation[];
  limit?: number;
};

export const MAX_LIMIT = 5000;
export const DEFAULT_LIMIT = 1000;

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: "equals", neq: "not equals", gt: "greater than", gte: "≥", lt: "less than", lte: "≤",
  like: "contains (case-sensitive)", ilike: "contains", in: "is any of",
  is_null: "is empty", not_null: "is not empty", between: "between",
};

const isGroup = (n: Condition | FilterGroup): n is FilterGroup =>
  (n as FilterGroup).op === "and" || (n as FilterGroup).op === "or";

// ── Validation ───────────────────────────────────────────────────────────────
export type ValidationResult = { ok: true } | { ok: false; error: string };

/** Validate a Query Model against an entity definition. Invalid models never run. */
export function validateQueryModel(model: QueryModel, entity: EntityDef): ValidationResult {
  if (model.entity !== entity.key) return { ok: false, error: "Entity mismatch." };
  const cols = new Map(entity.columns.map((c) => [c.key, c]));

  for (const f of model.fields) {
    if (!cols.has(f)) return { ok: false, error: `Unknown column: ${f}` };
  }
  if (model.fields.length === 0 && (!model.aggregations || model.aggregations.length === 0)) {
    return { ok: false, error: "Select at least one column or aggregation." };
  }

  const validateGroup = (g: FilterGroup): ValidationResult => {
    for (const n of g.conditions) {
      if (isGroup(n)) { const r = validateGroup(n); if (!r.ok) return r; continue; }
      const col = cols.get(n.field);
      if (!col) return { ok: false, error: `Unknown filter column: ${n.field}` };
      if (!col.filterable) return { ok: false, error: `Column not filterable: ${n.field}` };
    }
    return { ok: true };
  };
  if (model.filters) { const r = validateGroup(model.filters); if (!r.ok) return r; }

  for (const s of model.sort ?? []) {
    if (!cols.has(s.field)) return { ok: false, error: `Unknown sort column: ${s.field}` };
  }
  for (const g of model.groupBy ?? []) {
    const col = cols.get(g);
    if (!col) return { ok: false, error: `Unknown group column: ${g}` };
    if (!col.groupable) return { ok: false, error: `Column not groupable: ${g}` };
  }
  for (const a of model.aggregations ?? []) {
    if (a.fn === "count") continue; // count(*) always allowed
    const col = cols.get(a.field);
    if (!col) return { ok: false, error: `Unknown aggregation column: ${a.field}` };
    if (!col.aggregatable) return { ok: false, error: `Column not aggregatable: ${a.field}` };
  }
  if (model.limit !== undefined && (model.limit < 1 || model.limit > MAX_LIMIT)) {
    return { ok: false, error: `Limit must be between 1 and ${MAX_LIMIT}.` };
  }
  return { ok: true };
}

// ── PostgREST filter compilation ───────────────────────────────────────────────
// supabase-js applies multiple top-level filters as AND; nested logic uses the
// PostgREST `and(...)`/`or(...)` string grammar passed to `.or()`.

/** Encode a value for a PostgREST filter string. */
function enc(value: unknown): string {
  if (value === null || value === undefined) return "null";
  const s = String(value);
  // Quote when the value could collide with PostgREST grammar (comma/paren/space).
  return /[(),.\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}

/** One leaf condition → a PostgREST filter fragment, e.g. `student_year.eq.1`. */
export function compileCondition(c: Condition): string {
  switch (c.operator) {
    case "is_null":  return `${c.field}.is.null`;
    case "not_null": return `${c.field}.not.is.null`;
    case "in": {
      const arr = Array.isArray(c.value) ? c.value : [c.value];
      return `${c.field}.in.(${arr.map(enc).join(",")})`;
    }
    case "between": {
      const [lo, hi] = Array.isArray(c.value) ? c.value : [undefined, undefined];
      return `and(${c.field}.gte.${enc(lo)},${c.field}.lte.${enc(hi)})`;
    }
    case "like":  return `${c.field}.like.*${c.value}*`;
    case "ilike": return `${c.field}.ilike.*${c.value}*`;
    default:      return `${c.field}.${c.operator}.${enc(c.value)}`;
  }
}

/** A whole group → a PostgREST logical string, e.g. `and(a.eq.1,or(b.eq.2,c.eq.3))`. */
export function compileGroup(g: FilterGroup): string {
  const parts = g.conditions.map((n) => (isGroup(n) ? compileGroup(n) : compileCondition(n)));
  return `${g.op}(${parts.join(",")})`;
}

/**
 * A plan the action applies to a supabase query:
 *  - `andLeaves`: applied as individual `.filter()` calls (chained = AND)
 *  - `orStrings`: applied as `.or(string)` calls (each is itself AND-ed with the rest)
 * For a root OR, the whole tree becomes a single `.or()` string.
 */
export type FilterPlan = { andLeaves: Condition[]; orStrings: string[] };

export function compileFilters(filters: FilterGroup | null | undefined): FilterPlan {
  const plan: FilterPlan = { andLeaves: [], orStrings: [] };
  if (!filters || filters.conditions.length === 0) return plan;
  if (filters.op === "or") {
    plan.orStrings.push(compileGroup(filters));
    return plan;
  }
  // root AND: leaves apply directly; nested groups become .or() strings
  for (const n of filters.conditions) {
    if (isGroup(n)) plan.orStrings.push(compileGroup(n));
    else plan.andLeaves.push(n);
  }
  return plan;
}

// ── In-process grouping + aggregation (v1) ──────────────────────────────────────
export type ResultRow = Record<string, unknown>;

const num = (v: unknown): number => (typeof v === "number" ? v : Number(v));

function aggregate(rows: ResultRow[], aggs: Aggregation[]): ResultRow {
  const out: ResultRow = {};
  for (const a of aggs) {
    if (a.fn === "count") { out[a.as] = rows.length; continue; }
    const vals = rows.map((r) => num(r[a.field])).filter((n) => Number.isFinite(n));
    if (vals.length === 0) { out[a.as] = null; continue; }
    switch (a.fn) {
      case "sum": out[a.as] = round(vals.reduce((s, n) => s + n, 0)); break;
      case "avg": out[a.as] = round(vals.reduce((s, n) => s + n, 0) / vals.length); break;
      case "min": out[a.as] = Math.min(...vals); break;
      case "max": out[a.as] = Math.max(...vals); break;
    }
  }
  return out;
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Apply groupBy + aggregations to a fetched (RLS-limited, capped) row set.
 * - groupBy + aggregations → one row per group with the group keys + agg columns
 * - aggregations only       → a single summary row
 * - neither                 → rows unchanged
 */
export function groupAndAggregate(rows: ResultRow[], model: QueryModel): ResultRow[] {
  const groupBy = model.groupBy ?? [];
  const aggs = model.aggregations ?? [];
  if (groupBy.length === 0 && aggs.length === 0) return rows;
  if (groupBy.length === 0) return [aggregate(rows, aggs)];

  const groups = new Map<string, ResultRow[]>();
  for (const r of rows) {
    const key = groupBy.map((g) => String(r[g] ?? "")).join("");
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }
  const result: ResultRow[] = [];
  for (const bucket of groups.values()) {
    const row: ResultRow = {};
    for (const g of groupBy) row[g] = bucket[0][g];
    if (aggs.length > 0) Object.assign(row, aggregate(bucket, aggs));
    else row.count = bucket.length;
    result.push(row);
  }
  return result;
}

/** The display columns of a result, accounting for grouping/aggregation. */
export function resultColumns(model: QueryModel): string[] {
  const groupBy = model.groupBy ?? [];
  const aggs = model.aggregations ?? [];
  if (groupBy.length === 0 && aggs.length === 0) return model.fields;
  const cols = [...groupBy];
  if (aggs.length > 0) cols.push(...aggs.map((a) => a.as));
  else if (groupBy.length > 0) cols.push("count");
  return cols;
}

/** CSV serialization of rows for the given columns (RFC-4180-ish quoting). */
export function toCSV(rows: ResultRow[], columns: string[]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map(esc).join(",");
  const body = rows.map((r) => columns.map((c) => esc(r[c])).join(",")).join("\n");
  return `${header}\n${body}`;
}
