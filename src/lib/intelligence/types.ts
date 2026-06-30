// ════════════════════════════════════════════════════════════════════════════
// AURA CORE FOUNDATION · CF-3 — Aura Intelligence: core types
//
// The Intelligence Layer sits ON TOP of CF-2 (frozen). A question resolves to a
// registered Intent + Slots; deterministic code turns that into CF-2 Query
// Models and a declarative Dashboard Spec; CF-2 runs the queries (RLS); the
// Composer computes KPIs + widget data; an Executive Summary + follow-ups close.
//
// Nothing here generates or runs SQL. Everything flows through CF-2's Query Model.
// See docs/AURA_CORE/CF3_AURA_INTELLIGENCE.md.
// ════════════════════════════════════════════════════════════════════════════

import type { QueryModel, ResultRow } from "@/lib/dataExplorer";

export type Role =
  | "SUPER_ADMIN" | "INST_ADMIN" | "PRINCIPAL" | "IQAC" | "HOD" | "DEPARTMENT_HEAD" | "STAFF" | "STUDENT" | "PARENT";

export type Domain =
  | "Finance" | "Admissions" | "Academics" | "People" | "Compliance" | "Placements";

/** Parameters the matcher/LLM extracts from a question. Normalised before use. */
export type Slots = {
  question: string;
  timeRange?: { from?: string; to?: string; label?: string } | null;
  groupBy?: string | null;
  threshold?: number | null;
  comparison?: boolean;
};

/** A CF-2 Query Model with a name the Dashboard Spec references. */
export type NamedQueryModel = { name: string; model: QueryModel };

// ── Dashboard Spec (declarative — the Composer renders it) ──────────────────────
export type ValueFormat = "number" | "currency" | "percent" | "text";

export type KpiSpec = {
  label: string;
  fromQuery: string;                       // dataset name
  /** Compute the metric from the (already aggregated, RLS-safe) rows. */
  compute: (rows: ResultRow[]) => number | null;
  format?: ValueFormat;
  tone?: "default" | "good" | "warn" | "bad";
  /** When true, smaller is better (drives default tone heuristics). */
  invert?: boolean;
};

export type WidgetType =
  | "bar" | "line" | "area" | "pie" | "donut" | "ranking" | "table" | "trend" | "alert" | "progress";

export type WidgetSpec = {
  type: WidgetType;
  title: string;
  fromQuery: string;
  category?: string;        // label / x-axis column
  value?: string;           // numeric column
  columns?: { key: string; label: string; format?: ValueFormat }[]; // for tables
  limit?: number;
  sort?: "asc" | "desc";    // by value
  /** Optional friendly relabelling of category values (e.g. status codes). */
  labelMap?: Record<string, string>;
  span?: 1 | 2;             // grid columns the widget occupies
  /** For `trend`: the date column to bucket by month (value summed, or counted). */
  dateField?: string;
};

export type DashboardSpec = { kpis: KpiSpec[]; widgets: WidgetSpec[] };

export type IntentContext = { role: Role; institutionId: string; departmentId?: string | null };

/** The unit of extensibility — one file per intent in lib/intelligence/intents/. */
export type IntentDefinition = {
  id: string;                              // 'finance.fee_collection'
  title: string;                           // 'Fee Collection'
  domain: Domain;
  /** Deterministic match keywords/phrases (lowercase). */
  aliases: string[];
  /** Roles allowed to run this intent. */
  roles: Role[];
  /** Example question shown in the launcher. */
  sample: string;
  build: (slots: Slots, ctx: IntentContext) => { queries: NamedQueryModel[]; dashboard: DashboardSpec };
  /** Deterministic, data-grounded summary (LLM may later refine the prose). */
  summarize: (d: ComputedDashboard, slots: Slots) => string;
  followups: string[];
};

// ── Composer output ─────────────────────────────────────────────────────────────
export type KpiDelta = { pct: number | null; dir: "up" | "down" | "flat"; label: string };
export type ComputedKpi = { label: string; value: number | null; display: string; tone: string; delta?: KpiDelta | null };
export type ComputedWidget = WidgetSpec & { rows: ResultRow[] };
export type ComputedDashboard = { kpis: ComputedKpi[]; widgets: ComputedWidget[]; empty: boolean };

// ════════════════════════════════════════════════════════════════════════════
// CF-3 v2 — general engine: business-question understanding → typed answer blocks
// ════════════════════════════════════════════════════════════════════════════

/** What kind of answer the business question expects (Response Strategy output). */
export type ResponseType = "KPI" | "LIST" | "TREND" | "COMPARISON" | "DISTRIBUTION" | "EXECUTIVE" | "MIXED";

/** A catalog-constrained query parsed from a question (by LLM or the deterministic
 *  extractor). Every `column` references a real CF-2 entity column; values needing
 *  DB resolution (e.g. a department NAME) are flagged for the planner. */
export type ExtractedFilter = {
  column: string;
  operator: import("@/lib/dataExplorer").FilterOperator;
  value: unknown;
  rawValue?: string;        // original human text (for resolution + display)
  resolve?: boolean;        // planner must resolve rawValue → a real stored value/id
};

export type ExtractedQuery = {
  entity: string;                                    // CF-2 entity key
  filters: ExtractedFilter[];
  numericMetric?: string | null;                     // a numeric column the question is "about" (salary…)
  dateRange?: { field?: string; from?: string; to?: string; label?: string } | null;
  groupBy?: string | null;
  sort?: { field: string; dir: "asc" | "desc" } | null;
  limit?: number | null;
  comparison?: boolean;
  responseHint?: ResponseType | null;
  title?: string;                                    // human title for the answer
  via?: "llm" | "deterministic";
  // CF-3.1 — internal confidence (dev-mode / clarification only, never shown to users)
  confidence?: number;                               // overall, pre-semantic
  confidenceParts?: { entity: number; slots: number; response: number; semantic?: number };
};

// ── CF-3.1 — Observability trace (built every execution; exposed only in dev) ────
export type TraceStage = { stage: string; ms: number; confidence?: number; detail?: Record<string, unknown> };
export type Trace = {
  traceId: string;
  question: string;
  path: "general" | "intent" | "clarify" | "no_match";
  stages: TraceStage[];
  overallConfidence: number;
  totalMs: number;
};

// ── CF-3.1 — Clarification (ask, never guess) ────────────────────────────────────
export type ClarifyOption = { label: string; /** the question to ask when picked */ ask: string };
export type Clarification = { prompt: string; options: ClarifyOption[] };

// ── Card / Response-Pattern Library — the Visualization Composer renders these ───
export type GridColumn = { key: string; label: string; format?: ValueFormat };

export type Block =
  | { kind: "kpiStrip"; kpis: ComputedKpi[] }
  | { kind: "recordGrid"; title: string; columns: GridColumn[]; rows: ResultRow[]; total: number; capped: boolean }
  | { kind: "chart"; widget: ComputedWidget }
  | { kind: "comparison"; title: string; kpis: ComputedKpi[]; periodLabel: string }
  | { kind: "summary"; text: string }
  | { kind: "recommendations"; items: string[] };

export type ComposedView = { title: string; responseType: ResponseType; blocks: Block[]; empty: boolean };

// ── askAura result (v2 — unified, block-based; CF-3.1 adds clarify) ──────────────
export type AuraAnswer =
  | { ok: true; intentId: string | null; domain: Domain | null; view: ComposedView; followups: string[]; confidence?: number }
  | { ok: false; reason: "clarify"; message: string; clarify: Clarification }
  | { ok: false; reason: "no_match" | "not_authorised" | "error"; message: string; suggestions?: string[] };
