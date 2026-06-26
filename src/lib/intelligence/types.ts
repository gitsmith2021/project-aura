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

// ── askAura result ──────────────────────────────────────────────────────────────
export type AuraAnswer =
  | { ok: true; intentId: string; title: string; domain: Domain; dashboard: ComputedDashboard; summary: string; followups: string[] }
  | { ok: false; reason: "no_match" | "not_authorised" | "error"; message: string; suggestions?: string[] };
