import type { IntentDefinition, NamedQueryModel } from "../types";
import type { ResultRow } from "@/lib/dataExplorer";
import { sumOf } from "../composer";

// CF-3 intent — Alumni. Reads the CF-2 `alumni` entity.
const rowCount = (rows: ResultRow[]) => rows.length;

export const alumniIntent: IntentDefinition = {
  id: "people.alumni",
  title: "Alumni",
  domain: "People",
  aliases: ["alumni", "alumnus", "graduates", "alumni network", "passed out students", "alumni engagement"],
  roles: ["SUPER_ADMIN", "INST_ADMIN"],
  sample: "Show the alumni network",

  build() {
    const queries: NamedQueryModel[] = [
      { name: "overall", model: { entity: "alumni", fields: [], aggregations: [{ fn: "count", field: "*", as: "total" }], limit: 10000 } },
      { name: "by_year", model: { entity: "alumni", fields: [], groupBy: ["graduation_year"], aggregations: [{ fn: "count", field: "*", as: "n" }], sort: [{ field: "graduation_year", dir: "asc" }], limit: 5000 } },
      { name: "by_employer", model: { entity: "alumni", fields: [], groupBy: ["current_employer"], aggregations: [{ fn: "count", field: "*", as: "n" }], limit: 5000 } },
      { name: "by_program", model: { entity: "alumni", fields: [], groupBy: ["program"], aggregations: [{ fn: "count", field: "*", as: "n" }], limit: 5000 } },
    ];
    return {
      queries,
      dashboard: {
        kpis: [
          { label: "Total Alumni", fromQuery: "overall", compute: (r) => (r[0] ? Number(r[0].total) || 0 : 0), format: "number", tone: "good" },
          { label: "Batches", fromQuery: "by_year", compute: rowCount, format: "number" },
          { label: "Employers", fromQuery: "by_employer", compute: rowCount, format: "number" },
          { label: "Programs", fromQuery: "by_program", compute: rowCount, format: "number" },
        ],
        widgets: [
          { type: "bar", title: "Alumni by graduation year", fromQuery: "by_year", category: "graduation_year", value: "n", sort: "asc", span: 1 },
          { type: "ranking", title: "Top employers", fromQuery: "by_employer", category: "current_employer", value: "n", sort: "desc", limit: 12, span: 1 },
        ],
      },
    };
  },

  summarize(d) {
    const total = Number(d.kpis.find((k) => k.label === "Total Alumni")?.value ?? 0);
    const batches = Number(d.kpis.find((k) => k.label === "Batches")?.value ?? 0);
    const top = d.widgets.find((w) => w.title === "Top employers")?.rows[0];
    if (!total) return "No alumni records are available yet.";
    const topTxt = top && top.current_employer ? ` The top employer is ${top.current_employer}.` : "";
    return `${total.toLocaleString("en-IN")} alumni across ${batches} graduating batches.${topTxt}`;
  },

  followups: [
    "Which batch has the most alumni?",
    "Where do most alumni work?",
    "How many students do we have?",
    "Show the placements",
  ],
};
