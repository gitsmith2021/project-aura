import type { IntentDefinition, NamedQueryModel } from "../types";
import type { ResultRow } from "@/lib/dataExplorer";

// CF-3 intent — NAAC Accreditation Readiness. There's no single NAAC table; this
// is a cross-entity snapshot of the signals NAAC weighs (IQAC activity, research
// output, scholarships), each its own CF-2 query against its own entity.
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const total = (rows: ResultRow[]) => (rows[0] ? num(rows[0].total) : 0);

export const naacIntent: IntentDefinition = {
  id: "compliance.naac",
  title: "NAAC Readiness",
  domain: "Compliance",
  aliases: ["naac", "naac readiness", "accreditation", "accreditation readiness", "naac status", "iqac readiness"],
  roles: ["SUPER_ADMIN", "INST_ADMIN"],
  sample: "Show the NAAC readiness",

  build() {
    const queries: NamedQueryModel[] = [
      { name: "iqac", model: { entity: "iqac", fields: [], aggregations: [{ fn: "count", field: "*", as: "total" }], limit: 5000 } },
      { name: "publications", model: { entity: "publications", fields: [], aggregations: [{ fn: "count", field: "*", as: "total" }], limit: 5000 } },
      { name: "research", model: { entity: "research", fields: [], aggregations: [{ fn: "count", field: "*", as: "total" }], limit: 5000 } },
      { name: "scholarships", model: { entity: "scholarships", fields: [], aggregations: [{ fn: "count", field: "*", as: "total" }], limit: 5000 } },
      { name: "pubs_by_year", model: { entity: "publications", fields: [], groupBy: ["pub_year"], aggregations: [{ fn: "count", field: "*", as: "n" }], sort: [{ field: "pub_year", dir: "asc" }], limit: 5000 } },
    ];
    return {
      queries,
      dashboard: {
        kpis: [
          { label: "IQAC Meetings", fromQuery: "iqac", compute: total, format: "number", tone: "good" },
          { label: "Publications", fromQuery: "publications", compute: total, format: "number", tone: "good" },
          { label: "Research Projects", fromQuery: "research", compute: total, format: "number" },
          { label: "Scholarships", fromQuery: "scholarships", compute: total, format: "number" },
        ],
        widgets: [
          { type: "bar", title: "Publications by year", fromQuery: "pubs_by_year", category: "pub_year", value: "n", sort: "asc", span: 2 },
        ],
      },
    };
  },

  summarize(d) {
    const iqac = num(d.kpis.find((k) => k.label === "IQAC Meetings")?.value ?? 0);
    const pubs = num(d.kpis.find((k) => k.label === "Publications")?.value ?? 0);
    const research = num(d.kpis.find((k) => k.label === "Research Projects")?.value ?? 0);
    const scholarships = num(d.kpis.find((k) => k.label === "Scholarships")?.value ?? 0);
    const iqacOk = iqac >= 2;
    return `Accreditation signals: ${iqac} IQAC meetings (${iqacOk ? "meets" : "below"} the ≥2/year norm), ${pubs} publications, ${research} research projects and ${scholarships} scholarships on record. Maintain IQAC cadence and research output to stay accreditation-ready.`;
  },

  followups: [
    "Show IQAC meetings and action items",
    "Show research and publications",
    "Show scholarship distribution",
    "Show the placements",
  ],
};
