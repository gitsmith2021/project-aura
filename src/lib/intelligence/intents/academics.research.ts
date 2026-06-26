import type { IntentDefinition, NamedQueryModel } from "../types";
import type { ResultRow } from "@/lib/dataExplorer";
import { sumOf } from "../composer";

// CF-3 intent — Research & Publications. Reads CF-2 `research` + `publications`.
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const first = (key: string) => (rows: ResultRow[]) => (rows[0] ? num(rows[0][key]) : null);

export const researchIntent: IntentDefinition = {
  id: "academics.research",
  title: "Research & Publications",
  domain: "Academics",
  aliases: ["research", "publications", "research projects", "papers", "funding", "scopus", "research output", "publication count"],
  roles: ["SUPER_ADMIN", "INST_ADMIN"],
  sample: "Show research projects and publications",

  build() {
    const queries: NamedQueryModel[] = [
      { name: "projects", model: { entity: "research", fields: [],
        aggregations: [{ fn: "count", field: "*", as: "total" }, { fn: "sum", field: "funding_amount", as: "funding" }], limit: 5000 } },
      { name: "proj_by_status", model: { entity: "research", fields: [], groupBy: ["status"], aggregations: [{ fn: "count", field: "*", as: "n" }], limit: 5000 } },
      { name: "pubs", model: { entity: "publications", fields: [], aggregations: [{ fn: "count", field: "*", as: "total" }], limit: 5000 } },
      { name: "pubs_scopus", model: { entity: "publications", fields: [],
        filters: { op: "and", conditions: [{ field: "scopus_indexed", operator: "eq", value: true }] }, aggregations: [{ fn: "count", field: "*", as: "n" }], limit: 5000 } },
      { name: "pubs_by_year", model: { entity: "publications", fields: [], groupBy: ["pub_year"], aggregations: [{ fn: "count", field: "*", as: "n" }], sort: [{ field: "pub_year", dir: "asc" }], limit: 5000 } },
    ];
    return {
      queries,
      dashboard: {
        kpis: [
          { label: "Research Projects", fromQuery: "projects", compute: first("total"), format: "number", tone: "good" },
          { label: "Funding", fromQuery: "projects", compute: first("funding"), format: "currency" },
          { label: "Publications", fromQuery: "pubs", compute: first("total"), format: "number", tone: "good" },
          { label: "Scopus-Indexed", fromQuery: "pubs_scopus", compute: sumOf("n"), format: "number" },
        ],
        widgets: [
          { type: "bar", title: "Publications by year", fromQuery: "pubs_by_year", category: "pub_year", value: "n", sort: "asc", span: 1 },
          { type: "donut", title: "Projects by status", fromQuery: "proj_by_status", category: "status", value: "n", span: 1 },
        ],
      },
    };
  },

  summarize(d) {
    const projects = num(d.kpis.find((k) => k.label === "Research Projects")?.value ?? 0);
    const funding = d.kpis.find((k) => k.label === "Funding")?.display;
    const pubs = num(d.kpis.find((k) => k.label === "Publications")?.value ?? 0);
    const scopus = num(d.kpis.find((k) => k.label === "Scopus-Indexed")?.value ?? 0);
    if (!projects && !pubs) return "No research projects or publications have been recorded yet.";
    return `${projects} research projects (${funding} funding) and ${pubs} publications, of which ${scopus} are Scopus-indexed.`;
  },

  followups: [
    "Which department publishes the most?",
    "Show the NAAC readiness",
    "Show IQAC meetings",
    "How much research funding have we received?",
  ],
};
