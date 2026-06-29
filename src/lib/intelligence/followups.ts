// ════════════════════════════════════════════════════════════════════════════
// CF-3 v2 — Suggested follow-up questions. Deterministic templates keyed by the
// response type + entity so users explore naturally (the LLM may add more).
// Pure + tested.
// ════════════════════════════════════════════════════════════════════════════

import type { EntityDef } from "@/lib/dataExplorer";
import type { ResponseType } from "./types";

export function buildFollowups(responseType: ResponseType, entity: EntityDef, numericMetric: string | null): string[] {
  const e = entity.label.toLowerCase();
  const metric = numericMetric ? entity.columns.find((c) => c.key === numericMetric)?.label.toLowerCase() : null;
  const hasDept = entity.columns.some((c) => c.key === "department_id");

  const out: string[] = [];
  switch (responseType) {
    case "LIST":
      if (hasDept) out.push(`Show ${e} by department`);
      if (metric) out.push(`Who has the highest ${metric}?`, `Average ${metric} by department`);
      out.push(`How many ${e} in total?`, `Compare with last year`);
      break;
    case "KPI":
      if (hasDept) out.push(`Break that down by department`);
      out.push(`Show the trend over the last 12 months`, `Compare with last year`);
      break;
    case "DISTRIBUTION":
      out.push(`Show this as a trend over time`, `Which group is largest?`, `Compare with last year`);
      break;
    case "TREND":
      out.push(`Compare this year with last year`, `Break down by department`, `Show the latest total`);
      break;
    case "COMPARISON":
      out.push(`Show the monthly trend`, `Break down by department`);
      break;
    default:
      out.push(`Show fee collection status`, `How many students do we have?`, `Show the finance overview`);
  }
  return out.slice(0, 5);
}
