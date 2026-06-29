// CF-3 — optional LLM enhancement layer (graceful).
//
// When ANTHROPIC_API_KEY is set, Claude (1) classifies questions the deterministic
// matcher misses and (2) refines the deterministic summary into board-quality prose
// GROUNDED ONLY in the computed KPIs (never invents numbers, never sees raw PII).
// With no key / any error it returns null/base — Aura Intelligence stays fully
// functional deterministically. SERVER-ONLY.

import Anthropic from "@anthropic-ai/sdk";
import type { EntityDef, FilterOperator } from "@/lib/dataExplorer";
import type { ExtractedQuery, ExtractedFilter, ResponseType } from "./types";

const MODEL = "claude-haiku-4-5-20251001"; // cheap + fast for classify/extract/summarise

function client(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  return key ? new Anthropic({ apiKey: key }) : null;
}

export function llmAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function textOf(msg: Anthropic.Message): string {
  return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}

/** Map a question to one registered intent id (or null). Used only as a fallback
 *  when the deterministic matcher finds nothing. The returned id is validated by
 *  the caller against the registry, so a bad answer can't reach the DB. */
export async function classifyIntent(
  question: string,
  candidates: { id: string; title: string; sample: string }[],
): Promise<string | null> {
  const c = client();
  if (!c || candidates.length === 0) return null;
  try {
    const list = candidates.map((x) => `- ${x.id}: ${x.title} (e.g. "${x.sample}")`).join("\n");
    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: 40,
      system: "Map the executive's question to exactly one intent id from the list. Reply with ONLY the intent id, or 'none' if nothing fits.",
      messages: [{ role: "user", content: `Intents:\n${list}\n\nQuestion: "${question}"\n\nintent id:` }],
    });
    const text = textOf(msg).toLowerCase();
    const hit = candidates.find((x) => text.includes(x.id.toLowerCase()));
    return hit ? hit.id : null;
  } catch {
    return null;
  }
}

const VALID_OPS: FilterOperator[] = ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is_null", "not_null", "between"];
const VALID_RESPONSE: ResponseType[] = ["KPI", "LIST", "TREND", "COMPARISON", "DISTRIBUTION", "EXECUTIVE", "MIXED"];

/** LLM slot extraction → a catalog-constrained ExtractedQuery. The model only
 *  CLASSIFIES + EXTRACTS into JSON referencing real entity/column keys; the result
 *  is validated against the catalog here (and again by the planner) so a
 *  hallucinated entity/column is dropped and can never reach the DB. Returns null
 *  on any failure → the deterministic extractor's result is used instead. */
export async function extractQueryLLM(question: string, catalog: EntityDef[]): Promise<ExtractedQuery | null> {
  const c = client();
  if (!c) return null;
  try {
    const cat = catalog.map((e) =>
      `${e.key}: { ${e.columns.map((col) => `${col.key}:${col.type}`).join(", ")} }`).join("\n");
    const sys = [
      "You convert an executive's question into a STRICT JSON query plan over the given catalog.",
      "Rules: choose exactly one `entity` key from the catalog. Every filter `column` MUST be a real column of that entity.",
      "Operators: eq, neq, gt, gte, lt, lte, ilike, in, between. For a DEPARTMENT/PROGRAM/COURSE name in a *_id column, set resolve=true and put the human text in rawValue.",
      "responseHint ∈ KPI|LIST|TREND|COMPARISON|DISTRIBUTION|EXECUTIVE. Reply with ONLY JSON, no prose.",
      'Shape: {"entity","filters":[{"column","operator","value","rawValue","resolve"}],"groupBy","sort":{"field","dir"},"limit","numericMetric","comparison","responseHint","title"}',
    ].join(" ");
    const msg = await c.messages.create({
      model: MODEL, max_tokens: 400, system: sys,
      messages: [{ role: "user", content: `Catalog:\n${cat}\n\nQuestion: "${question}"\n\nJSON:` }],
    });
    const raw = textOf(msg);
    const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const p = JSON.parse(json) as Record<string, unknown>;

    const entity = catalog.find((e) => e.key === p.entity);
    if (!entity) return null;
    const colSet = new Set(entity.columns.map((col) => col.key));

    const filters: ExtractedFilter[] = Array.isArray(p.filters)
      ? (p.filters as Record<string, unknown>[]).flatMap((f) => {
          const column = String(f.column ?? "");
          const operator = String(f.operator ?? "") as FilterOperator;
          if (!colSet.has(column) || !VALID_OPS.includes(operator)) return [];
          return [{ column, operator, value: f.value, rawValue: f.rawValue ? String(f.rawValue) : undefined, resolve: !!f.resolve }];
        })
      : [];

    const groupBy = typeof p.groupBy === "string" && colSet.has(p.groupBy) ? p.groupBy : null;
    const sortRaw = p.sort as { field?: string; dir?: string } | undefined;
    const sort = sortRaw && typeof sortRaw.field === "string" && colSet.has(sortRaw.field)
      ? { field: sortRaw.field, dir: sortRaw.dir === "asc" ? "asc" as const : "desc" as const } : null;
    const numericMetric = typeof p.numericMetric === "string" && colSet.has(p.numericMetric) ? p.numericMetric : null;
    const responseHint = VALID_RESPONSE.includes(p.responseHint as ResponseType) ? (p.responseHint as ResponseType) : null;

    return {
      entity: entity.key, filters, numericMetric, groupBy, sort,
      limit: typeof p.limit === "number" ? p.limit : null,
      comparison: !!p.comparison, responseHint,
      title: typeof p.title === "string" ? p.title : entity.label,
      via: "llm",
    };
  } catch {
    return null;
  }
}

/** Rewrite the deterministic summary into 1–2 polished sentences, using ONLY the
 *  given KPI facts. Returns the base text on any failure. */
export async function refineSummary(
  base: string,
  title: string,
  kpis: { label: string; display: string }[],
): Promise<string> {
  const c = client();
  if (!c) return base;
  try {
    const facts = kpis.map((k) => `${k.label}: ${k.display}`).join("; ");
    const msg = await c.messages.create({
      model: MODEL,
      max_tokens: 180,
      system: "You are an executive analyst writing for a Chairman. Rewrite the draft into 1–2 concise, confident, board-quality sentences. Use ONLY the provided metrics — never invent or infer numbers. No preamble, no bullet points.",
      messages: [{ role: "user", content: `Dashboard: ${title}\nMetrics: ${facts}\nDraft: ${base}\n\nPolished summary:` }],
    });
    return textOf(msg) || base;
  } catch {
    return base;
  }
}
