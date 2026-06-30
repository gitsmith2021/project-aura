// CF-3.1 — Aura Intelligence Evaluation Suite (runs in CI).
//
// Drives the deterministic pipeline (extract → plan → response strategy) over a
// library of real executive questions and measures accuracy. Three guarantees:
//   1. every `core` case passes exactly (asserted individually);
//   2. the overall accuracy over core+extended never drops below BASELINE_RATE
//      — "no future change reduces accuracy";
//   3. `gap` cases are reported (the improvement roadmap), never asserted.
//
// No DB, no LLM, no network — pure functions only, so it's fast and CI-safe.

import { describe, it, expect } from "vitest";
import { extractQuery } from "@/lib/intelligence/slotExtractor";
import { planQueries } from "@/lib/intelligence/queryPlanner";
import { EVAL_CATALOG } from "./catalog";
import { CASES, type EvalCase } from "./cases";

/** Accuracy floor for core+extended cases (currently measuring 100%). `core`
 *  cases are additionally asserted individually, so the most important questions
 *  are locked at 100%; this floor guards the broader set while leaving headroom
 *  to grow the library. Raise it as the engine improves; never lower it without
 *  an explicit, reviewed reason. To add a not-yet-working question, tier it `gap`. */
const BASELINE_RATE = 0.95;

function evaluate(c: EvalCase): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const ex = extractQuery(c.q, EVAL_CATALOG);
  if (!ex) return { pass: false, reasons: ["no entity matched"] };

  if (ex.entity !== c.entity) reasons.push(`entity: ${ex.entity} ≠ ${c.entity}`);
  if (ex.responseHint !== c.responseType) reasons.push(`response: ${ex.responseHint} ≠ ${c.responseType}`);
  if (c.groupBy && ex.groupBy !== c.groupBy) reasons.push(`groupBy: ${ex.groupBy} ≠ ${c.groupBy}`);
  if (c.sortDir && ex.sort?.dir !== c.sortDir) reasons.push(`sortDir: ${ex.sort?.dir} ≠ ${c.sortDir}`);
  for (const f of c.filters ?? []) {
    const hit = ex.filters.find((x) => x.column === f.column && x.operator === f.operator && (f.value === undefined || x.value === f.value));
    if (!hit) reasons.push(`missing filter ${f.column} ${f.operator} ${f.value ?? ""}`.trim());
  }
  if (c.resolveDept) {
    const d = ex.filters.find((x) => x.column === "department_id" && x.resolve);
    if (!d || d.rawValue !== c.resolveDept) reasons.push(`dept resolve: ${d?.rawValue ?? "—"} ≠ ${c.resolveDept}`);
  }
  // The planner must produce at least one valid CF-2 model for a matched entity.
  const entity = EVAL_CATALOG.find((e) => e.key === ex.entity);
  if (entity && !planQueries(ex, entity)) reasons.push("planner produced no valid model");

  return { pass: reasons.length === 0, reasons };
}

const core = CASES.filter((c) => c.tier === "core");
const scored = CASES.filter((c) => c.tier === "core" || c.tier === "extended");
const gaps = CASES.filter((c) => c.tier === "gap");

describe("Aura Intelligence — core questions (must pass exactly)", () => {
  it.each(core.map((c) => [c.q, c] as const))("%s", (_q, c) => {
    const r = evaluate(c);
    expect(r.pass, r.reasons.join("; ")).toBe(true);
  });
});

describe("Aura Intelligence — accuracy baseline", () => {
  it(`scores ≥ ${(BASELINE_RATE * 100).toFixed(0)}% over ${scored.length} core+extended questions`, () => {
    const results = scored.map((c) => ({ c, r: evaluate(c) }));
    const passed = results.filter((x) => x.r.pass).length;
    const rate = passed / scored.length;

    // Per-domain summary (visible in CI logs).
    const byDomain = new Map<string, { p: number; n: number }>();
    for (const { c, r } of results) {
      const d = byDomain.get(c.domain) ?? { p: 0, n: 0 };
      d.n++; if (r.pass) d.p++; byDomain.set(c.domain, d);
    }
    const summary = [...byDomain.entries()].map(([d, s]) => `${d} ${s.p}/${s.n}`).join(" · ");
    const failures = results.filter((x) => !x.r.pass).map((x) => `  ✗ "${x.c.q}" — ${x.r.reasons.join("; ")}`);
    console.log(`\n[Aura Eval] ${passed}/${scored.length} = ${(rate * 100).toFixed(1)}%  |  ${summary}` + (failures.length ? `\n${failures.join("\n")}` : ""));

    expect(rate).toBeGreaterThanOrEqual(BASELINE_RATE);
  });

  it("reports known gaps (roadmap — not asserted)", () => {
    console.log(`\n[Aura Eval] ${gaps.length} known gaps:\n` + gaps.map((g) => `  • "${g.q}" — ${g.note}`).join("\n"));
    expect(gaps.length).toBeGreaterThan(0);
  });
});
