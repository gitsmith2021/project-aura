// CF-3 — deterministic intent matcher + slot extraction.
//
// This is the graceful-degradation baseline: Aura Intelligence resolves a
// question WITHOUT any LLM (so it works with $0 Anthropic credit). When credit
// is available, an LLM classifier can override/augment this — but the contract
// (intentId + Slots) is identical, so nothing downstream changes. Pure / tested.

import type { IntentDefinition, Role, Slots } from "./types";

/** India academic year ≈ June → May. */
function academicYearRange(now: Date): NonNullable<Slots["timeRange"]> {
  const y = now.getFullYear();
  const startYear = now.getMonth() >= 5 ? y : y - 1; // June = month index 5
  return { from: `${startYear}-06-01`, to: `${startYear + 1}-05-31`, label: "this academic year" };
}
function monthRange(now: Date): NonNullable<Slots["timeRange"]> {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: iso(from), to: iso(now), label: "this month" };
}
function lastNDays(now: Date, n: number): NonNullable<Slots["timeRange"]> {
  const from = new Date(now.getTime() - n * 86_400_000);
  return { from: iso(from), to: iso(now), label: `last ${n} days` };
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Extract parameters from a question. Deterministic, regex-based. */
export function extractSlots(question: string, now: Date = new Date()): Slots {
  const q = ` ${question.toLowerCase().trim()} `;

  let threshold: number | null = null;
  const th = q.match(/(?:below|under|less than|lower than|<)\s*(\d{1,3})\s*%?/);
  if (th) threshold = Number(th[1]);

  let timeRange: Slots["timeRange"] = null;
  const lastDays = q.match(/(?:last|past)\s*(\d{1,3})\s*days/);
  if (/this (?:academic )?year|current (?:academic )?year|this ay\b/.test(q)) timeRange = academicYearRange(now);
  else if (/this month|current month/.test(q)) timeRange = monthRange(now);
  else if (lastDays) timeRange = lastNDays(now, Number(lastDays[1]));

  let groupBy: string | null = null;
  if (/by department|per department|department[-\s]?wise|each department/.test(q)) groupBy = "department";
  else if (/by program|by programme|program[-\s]?wise|programme[-\s]?wise/.test(q)) groupBy = "program";

  const comparison = /\bcompare\b|\bvs\b|\bversus\b|last year|previous (?:year|semester)|year[-\s]?on[-\s]?year/.test(q);

  return { question: question.trim(), threshold, timeRange, groupBy, comparison };
}

export type IntentMatch = { intent: IntentDefinition; score: number };

/**
 * Score every role-permitted intent by alias overlap and return the best match
 * (or null if nothing scored). Multi-word aliases weigh more (more specific).
 */
export function matchIntent(question: string, intents: IntentDefinition[], role: Role): IntentMatch | null {
  const q = ` ${question.toLowerCase()} `;
  let best: IntentMatch | null = null;
  for (const intent of intents) {
    if (!intent.roles.includes(role)) continue;
    let score = 0;
    for (const alias of intent.aliases) {
      const a = alias.toLowerCase();
      if (q.includes(` ${a} `) || q.includes(a)) score += a.split(/\s+/).length;
    }
    if (score > 0 && (!best || score > best.score)) best = { intent, score };
  }
  return best;
}
