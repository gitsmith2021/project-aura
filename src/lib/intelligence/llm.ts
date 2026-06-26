// CF-3 — optional LLM enhancement layer (graceful).
//
// When ANTHROPIC_API_KEY is set, Claude (1) classifies questions the deterministic
// matcher misses and (2) refines the deterministic summary into board-quality prose
// GROUNDED ONLY in the computed KPIs (never invents numbers, never sees raw PII).
// With no key / any error it returns null/base — Aura Intelligence stays fully
// functional deterministically. SERVER-ONLY.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5-20251001"; // cheap + fast for classify/summarise

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
