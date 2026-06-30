// ════════════════════════════════════════════════════════════════════════════
// CF-3.1 — Aura Intelligence pipeline core (instrumented).
//
// The single execution path used by both askAura (returns the answer) and the
// Developer Lab (returns answer + full trace). It runs the stable CF-3 v2 flow —
// extract → semantic resolution → plan → CF-2 execute → response strategy →
// compose → summary → follow-ups — while recording a per-stage TRACE (timings +
// confidence) and asking a CLARIFICATION when a value is genuinely ambiguous
// (never guessing). Not a "use server" module: it takes the caller's RLS client
// so the trace lib stays reusable. No SQL is generated; CF-2/RLS unchanged.
// ════════════════════════════════════════════════════════════════════════════

import { executeQueryModel } from "@/actions/dataExplorer";
import { INTENTS, intentsForRole, getIntent } from "./registry";
import { matchIntent, extractSlots } from "./matcher";
import { extractQuery } from "./slotExtractor";
import { extractQueryLLM, classifyIntent, refineSummary, llmAvailable } from "./llm";
import { planQueries } from "./queryPlanner";
import { composeView } from "./composerV2";
import { buildSummary } from "./summary";
import { buildFollowups } from "./followups";
import { resolveValue, resolveDepartmentCandidates } from "./semantic";
import { composeDashboard, attachDeltas, formatValue } from "./composer";
import { overallConfidence } from "./confidence";
import type {
  AuraAnswer, Block, Clarification, ComposedView, ComputedKpi, ExtractedQuery,
  NamedQueryModel, Role, Slots, Trace, TraceStage,
} from "./types";
import type { EntityDef, ResultRow } from "@/lib/dataExplorer";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Sb = any;
export type PipeCtx = { userId: string; role: Role; institutionId: string; departmentId: string | null };

// Configurable thresholds (CF-3.1). A second department candidate within this
// score margin of the best → ambiguous → clarify rather than guess.
const AMBIGUITY_MARGIN = 0.12;
const AMBIGUITY_FLOOR = 0.5;

const DEPT_SCOPED_ENTITIES = new Set([
  "students", "staff", "staff_salary", "student_attendance", "research", "alumni", "budgets", "expenses", "results", "admissions", "departments",
]);
const isHodRole = (r: Role) => r === "HOD" || r === "DEPARTMENT_HEAD";

const mapEntity = (r: Record<string, unknown>): EntityDef => ({
  key: r.key as string, label: r.label as string, category: r.category as string, source: r.source as string,
  columns: (r.columns as EntityDef["columns"]) ?? [], defaultDateField: (r.default_date_field as string | null) ?? null, sortOrder: (r.sort_order as number) ?? 0,
});

async function loadCatalog(supabase: Sb): Promise<EntityDef[]> {
  const { data } = await supabase
    .from("data_explorer_entities").select("key, label, category, source, columns, default_date_field, sort_order").eq("is_active", true).order("sort_order");
  return (data ?? []).map(mapEntity);
}

function scopeToDepartment(queries: NamedQueryModel[], c: PipeCtx): NamedQueryModel[] {
  if (!c.departmentId || !isHodRole(c.role)) return queries;
  const cond = { field: "department_id", operator: "eq" as const, value: c.departmentId };
  return queries.map((q) => {
    if (!DEPT_SCOPED_ENTITIES.has(q.model.entity)) return q;
    const filters = q.model.filters ? { op: "and" as const, conditions: [q.model.filters, cond] } : { op: "and" as const, conditions: [cond] };
    return { ...q, model: { ...q.model, filters } };
  });
}

async function execModels(supabase: Sb, institutionId: string, queries: NamedQueryModel[]): Promise<Map<string, ResultRow[]>> {
  const datasets = new Map<string, ResultRow[]>();
  for (const q of queries) {
    const res = await executeQueryModel(supabase, institutionId, q.model);
    datasets.set(q.name, res.success ? res.data.rows : []);
  }
  return datasets;
}

async function enrichDepartments(supabase: Sb, institutionId: string, rows: ResultRow[]): Promise<ResultRow[]> {
  if (!rows.some((r) => "department_id" in r)) return rows;
  const { data } = await supabase.from("departments").select("id, name").eq("institution_id", institutionId);
  const map = new Map<string, string>((data ?? []).map((d: { id: string; name: string }) => [d.id, d.name]));
  return rows.map((r) => ("department_id" in r ? { ...r, department_id: map.get(String(r.department_id)) ?? r.department_id } : r));
}

function monthsBack(now: Date, n: number) {
  const from = new Date(now.getFullYear(), now.getMonth() - n, 1);
  return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10), label: `last ${n} months` };
}

function applyTimeRange(ex: ExtractedQuery, question: string, entity: EntityDef): ExtractedQuery {
  const slots = extractSlots(question);
  const dateField = entity.defaultDateField ?? entity.columns.find((c) => c.type === "date")?.key ?? null;
  let range = slots.timeRange ? { from: slots.timeRange.from, to: slots.timeRange.to, label: slots.timeRange.label } : null;
  const m = question.toLowerCase().match(/last\s+(\d{1,2})\s+months/);
  if (m) range = monthsBack(new Date(), Number(m[1]));
  if (ex.responseHint === "TREND" && !range) range = monthsBack(new Date(), 12);
  return { ...ex, comparison: ex.comparison || slots.comparison, dateRange: range && dateField ? { field: dateField, ...range } : null };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Resolve filter values needing DB lookups; if a department reference is
 *  ambiguous (two near-equal matches), return a clarification instead of guessing. */
async function resolveOrClarify(
  supabase: Sb, institutionId: string, question: string, ex: ExtractedQuery,
): Promise<{ kind: "resolved"; ex: ExtractedQuery; confidence: number; detail: unknown[] } | { kind: "clarify"; clarify: Clarification }> {
  const filters: ExtractedQuery["filters"] = [];
  const detail: unknown[] = [];
  let minScore = 1;
  for (const f of ex.filters) {
    if (f.resolve && f.rawValue && f.column === "department_id") {
      const cands = await resolveDepartmentCandidates(supabase, institutionId, f.rawValue);
      if (cands.length >= 2 && cands[1].score >= AMBIGUITY_FLOOR && cands[0].score - cands[1].score < AMBIGUITY_MARGIN) {
        const options = cands.slice(0, 4).map((c) => ({ label: c.raw, ask: question.replace(new RegExp(escapeRe(f.rawValue!), "i"), c.raw) }));
        return { kind: "clarify", clarify: { prompt: `Which "${f.rawValue}" did you mean?`, options } };
      }
      if (cands[0]) { filters.push({ ...f, value: cands[0].resolved, resolve: false }); minScore = Math.min(minScore, cands[0].score); detail.push({ raw: f.rawValue, to: cands[0].raw, score: cands[0].score, via: cands[0].via }); }
      // else: unresolved → drop the filter
    } else if (f.resolve && f.rawValue) {
      const hit = await resolveValue(supabase, institutionId, ex.entity, f.column, f.rawValue);
      if (hit) { filters.push({ ...f, value: hit.resolved, resolve: false }); minScore = Math.min(minScore, hit.score); detail.push({ raw: f.rawValue, to: hit.raw, score: hit.score, via: hit.via }); }
    } else filters.push(f);
  }
  return { kind: "resolved", ex: { ...ex, filters }, confidence: minScore, detail };
}

function priorYearSlots(slots: Slots): Slots {
  if (!slots.timeRange) return slots;
  const shift = (d?: string | null) => { if (!d) return undefined; const dt = new Date(d); dt.setFullYear(dt.getFullYear() - 1); return dt.toISOString().slice(0, 10); };
  return { ...slots, timeRange: { from: shift(slots.timeRange.from), to: shift(slots.timeRange.to), label: "last year" } };
}
const shiftYear = (d?: string | null) => { if (!d) return d ?? undefined; const dt = new Date(d); dt.setFullYear(dt.getFullYear() - 1); return dt.toISOString().slice(0, 10); };
const kpi = (label: string, value: number | null, format: "number" | "currency" = "number"): ComputedKpi => ({ label, value, display: formatValue(value, format), tone: "default" });

function dashboardToView(title: string, responseType: ComposedView["responseType"], dash: ReturnType<typeof composeDashboard>): ComposedView {
  const blocks: Block[] = [];
  if (dash.kpis.length) blocks.push({ kind: "kpiStrip", kpis: dash.kpis });
  for (const w of dash.widgets) blocks.push({ kind: "chart", widget: w });
  return { title, responseType, blocks, empty: dash.empty };
}

async function maybeRefine(base: string, view: ComposedView, title: string): Promise<string> {
  if (!llmAvailable()) return base;
  const strip = view.blocks.find((b) => b.kind === "kpiStrip");
  const kpis = strip && strip.kind === "kpiStrip" ? strip.kpis.map((k) => ({ label: k.label, display: k.display })) : [];
  return refineSummary(base, title, kpis);
}

/** Run the full pipeline, building a trace. Returns the answer + the trace (the
 *  caller decides whether to expose the trace — dev only). */
export async function runPipeline(supabase: Sb, c: PipeCtx, question: string): Promise<{ answer: AuraAnswer; trace: Trace }> {
  const t0 = Date.now();
  let last = t0;
  const stages: TraceStage[] = [];
  const mark = (stage: string, confidence?: number, detail?: Record<string, unknown>) => {
    const n = Date.now(); stages.push({ stage, ms: n - last, confidence, detail }); last = n;
  };
  const finish = (path: Trace["path"], answer: AuraAnswer, overall: number): { answer: AuraAnswer; trace: Trace } =>
    ({ answer, trace: { traceId: cryptoId(), question, path, stages, overallConfidence: overall, totalMs: Date.now() - t0 } });

  const catalog = await loadCatalog(supabase);
  mark("catalog", undefined, { entities: catalog.length });

  // 1) Slot extraction (LLM → deterministic fallback).
  let ex = (llmAvailable() ? await extractQueryLLM(question, catalog) : null) ?? extractQuery(question, catalog);
  mark("extract", ex?.confidence, ex ? { entity: ex.entity, via: ex.via, responseHint: ex.responseHint, filters: ex.filters, parts: ex.confidenceParts } : { matched: false });

  // 2) General analytical path.
  if (ex && ex.responseHint !== "EXECUTIVE") {
    const entity = catalog.find((e) => e.key === ex!.entity)!;
    ex = applyTimeRange(ex, question, entity);

    const res = await resolveOrClarify(supabase, c.institutionId, question, ex);
    if (res.kind === "clarify") {
      mark("semantic", 0.4, { ambiguous: res.clarify.options.map((o) => o.label) });
      return finish("clarify", { ok: false, reason: "clarify", message: res.clarify.prompt, clarify: res.clarify }, 0.4);
    }
    ex = res.ex;
    mark("semantic", res.confidence, { resolutions: res.detail });

    const parts = { entity: ex.confidenceParts?.entity ?? 0.8, slots: ex.confidenceParts?.slots ?? 0.8, response: ex.confidenceParts?.response ?? 0.8, semantic: res.confidence };
    const overall = overallConfidence(parts);

    const plan = planQueries(ex, entity);
    mark("plan", plan ? 0.95 : 0, { models: plan?.models.map((m) => m.name), responseType: plan?.responseType });
    if (plan) {
      const scoped = scopeToDepartment(plan.models, c);
      const datasets = await execModels(supabase, c.institutionId, scoped);
      mark("execute", undefined, { rows: Object.fromEntries([...datasets].map(([k, v]) => [k, v.length])) });
      if (datasets.has("list")) datasets.set("list", await enrichDepartments(supabase, c.institutionId, datasets.get("list")!));

      const view = composeView(plan, datasets, entity);
      mark("strategy", undefined, { responseType: view.responseType, blocks: view.blocks.map((b) => b.kind) });

      if (ex.comparison && ex.dateRange && datasets.has("stats")) {
        const prior = { ...ex, dateRange: { ...ex.dateRange, from: shiftYear(ex.dateRange.from), to: shiftYear(ex.dateRange.to) } };
        const priorPlan = planQueries(prior, entity);
        if (priorPlan) {
          const priorDs = await execModels(supabase, c.institutionId, scopeToDepartment(priorPlan.models, c));
          const cur = (view.blocks.find((b) => b.kind === "kpiStrip") as Extract<Block, { kind: "kpiStrip" }> | undefined)?.kpis ?? [];
          const priorRow = (priorDs.get("stats") ?? [])[0] ?? {};
          const priorKpis: ComputedKpi[] = cur.map((k) => (k.label.startsWith("Total") ? kpi(k.label, priorRow.n != null ? Number(priorRow.n) : null) : kpi(k.label, null)));
          attachDeltas(cur, priorKpis, "vs last year");
        }
      }

      const summary = await maybeRefine(buildSummary(view), view, plan.title);
      mark("summary");
      const followups = buildFollowups(plan.responseType, entity, plan.numericMetric);
      mark("followups");
      if (!view.empty) {
        view.blocks.push({ kind: "summary", text: summary });
        return finish("general", { ok: true, intentId: null, domain: null, view, followups, confidence: overall }, overall);
      }
    }
  }

  // 3) Intent-template path (broad / executive).
  let intent = matchIntent(question, INTENTS, c.role)?.intent ?? null;
  if (!intent && llmAvailable()) {
    const permitted = intentsForRole(c.role);
    const id = await classifyIntent(question, permitted.map((i) => ({ id: i.id, title: i.title, sample: i.sample })));
    const candidate = id ? getIntent(id) : null;
    if (candidate && candidate.roles.includes(c.role)) intent = candidate;
  }
  if (intent) {
    const slots = extractSlots(question);
    const ictx = { role: c.role, institutionId: c.institutionId, departmentId: c.departmentId };
    const built = intent.build(slots, ictx);
    const queries = scopeToDepartment(built.queries, c);
    const datasets = await execModels(supabase, c.institutionId, queries);
    const dash = composeDashboard(built.dashboard, datasets);
    if (slots.comparison && slots.timeRange) {
      const priorBuilt = intent.build(priorYearSlots(slots), ictx);
      const priorDs = await execModels(supabase, c.institutionId, scopeToDepartment(priorBuilt.queries, c));
      attachDeltas(dash.kpis, composeDashboard(priorBuilt.dashboard, priorDs).kpis, "vs last year");
    }
    const view = dashboardToView(intent.title, "EXECUTIVE", dash);
    const summary = await maybeRefine(intent.summarize(dash, slots), view, intent.title);
    view.blocks.push({ kind: "summary", text: summary });
    mark("intent", 0.85, { intentId: intent.id, blocks: view.blocks.map((b) => b.kind) });
    return finish("intent", { ok: true, intentId: intent.id, domain: intent.domain, view, followups: intent.followups, confidence: 0.85 }, 0.85);
  }

  // 4) No match.
  mark("no_match", 0);
  return finish("no_match", {
    ok: false, reason: "no_match",
    message: "I can't answer that yet — here are questions I can help with:",
    suggestions: intentsForRole(c.role).slice(0, 6).map((i) => i.sample),
  }, 0);
}

function cryptoId(): string {
  try { return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2); } catch { return Math.random().toString(36).slice(2); }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
