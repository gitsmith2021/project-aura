// ════════════════════════════════════════════════════════════════════════════
// CF-3.1 — Confidence Engine (pure).
//
// Every stage of the pipeline produces a confidence in [0,1]; the overall is the
// weakest link (conservative — if any stage is unsure, the answer is unsure).
// Confidence is INTERNAL: surfaced in the developer lab and used by the
// Clarification engine, never shown to normal users. Deterministic + tested.
// ════════════════════════════════════════════════════════════════════════════

import type { ExtractedQuery } from "./types";

export type ConfidenceParts = {
  entity: number;            // routing — how sure we picked the right entity
  slots: number;             // slot extraction — filters/group/sort parsed cleanly
  response: number;          // response strategy — explicit shape vs the LIST default
  semantic?: number;         // value resolution (e.g. "computer science" → a dept)
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Entity routing confidence from the score margin over the runner-up. */
export function entityConfidence(margin: number, switched: boolean): number {
  if (switched) return 0.7;        // salary-intent override — deterministic but heuristic
  if (margin >= 3) return 0.97;
  if (margin === 2) return 0.92;
  if (margin === 1) return 0.82;
  return 0.6;                       // tie — picked first; genuinely uncertain
}

/** Slot-extraction confidence. Clean structured filters raise it; a value still
 *  pending semantic resolution lowers it slightly (resolved later). */
export function slotConfidence(ex: ExtractedQuery): number {
  if (ex.filters.length === 0 && !ex.groupBy && !ex.sort) return 0.85;
  let s = 0.9;
  if (ex.filters.some((f) => f.resolve)) s -= 0.1;
  return clamp(s);
}

/** Response-strategy confidence: an explicit shape is surer than the LIST default. */
export function responseConfidence(ex: ExtractedQuery): number {
  return ex.responseHint && ex.responseHint !== "LIST" ? 0.92 : 0.78;
}

/** Overall = the weakest stage. */
export function overallConfidence(parts: ConfidenceParts): number {
  const vals = [parts.entity, parts.slots, parts.response, ...(parts.semantic !== undefined ? [parts.semantic] : [])];
  return r2(Math.min(...vals));
}

export const pct = (n: number): string => `${Math.round(n * 100)}%`;
