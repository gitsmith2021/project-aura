// ════════════════════════════════════════════════════════════════════════════
// CF-3 v2 — Response Strategy Registry.
//
// THE most important enhancement: given the parsed question (not the entity), it
// decides "what kind of answer does the user expect?" and the recipe of blocks to
// assemble. The Intent Registry NEVER decides visualization — this does. Pure.
// ════════════════════════════════════════════════════════════════════════════

import type { EntityDef } from "@/lib/dataExplorer";
import type { ExtractedQuery, ResponseType } from "./types";

export type Recipe = {
  responseType: ResponseType;
  needsList: boolean;        // fetch a record grid
  needsStats: boolean;       // fetch count/avg/min/max KPIs
  needsDistribution: boolean;// groupBy chart
  needsTrend: boolean;       // monthly bucketed chart
  needsComparison: boolean;  // prior-period KPIs + deltas
};

const hasNumericFilter = (x: ExtractedQuery) =>
  x.filters.some((f) => ["lt", "lte", "gt", "gte", "between"].includes(f.operator));

/** Map a question's shape to its expected response type + block recipe. */
export function decideResponse(x: ExtractedQuery, entity: EntityDef): Recipe {
  const type: ResponseType = x.responseHint ?? "LIST";
  const hasNumericMetric = !!x.numericMetric && entity.columns.some((c) => c.key === x.numericMetric);

  switch (type) {
    case "KPI":
      return base({ responseType: "KPI", needsStats: true });
    case "DISTRIBUTION":
      return base({ responseType: "DISTRIBUTION", needsDistribution: true });
    case "TREND":
      return base({ responseType: "TREND", needsTrend: true });
    case "COMPARISON":
      return base({ responseType: "COMPARISON", needsStats: true, needsComparison: true });
    case "EXECUTIVE":
      return base({ responseType: "EXECUTIVE", needsStats: true, needsDistribution: true });
    case "MIXED":
      return base({ responseType: "MIXED", needsStats: true, needsList: true, needsDistribution: true });
    case "LIST":
    default:
      // A filtered list of records; add stat KPIs when a numeric metric is involved.
      return base({ responseType: "LIST", needsList: true, needsStats: hasNumericFilter(x) && hasNumericMetric });
  }
}

function base(p: Partial<Recipe>): Recipe {
  return {
    responseType: p.responseType ?? "LIST",
    needsList: p.needsList ?? false,
    needsStats: p.needsStats ?? false,
    needsDistribution: p.needsDistribution ?? false,
    needsTrend: p.needsTrend ?? false,
    needsComparison: p.needsComparison ?? false,
  };
}
