import type { IntentDefinition, NamedQueryModel } from "../types";
import type { ResultRow } from "@/lib/dataExplorer";
import { sumOf, sumWhere } from "../composer";

// CF-3 intent — Scholarships. Reads the CF-2 `scholarships` entity
// (scholarship_summary security_invoker view: applications × schemes).
const schemeCount = (rows: ResultRow[]) => rows.length;

export const scholarshipsIntent: IntentDefinition = {
  id: "finance.scholarships",
  title: "Scholarships",
  domain: "Finance",
  aliases: ["scholarships", "scholarship", "scholarship distribution", "financial aid", "disbursed", "beneficiaries"],
  roles: ["SUPER_ADMIN", "INST_ADMIN", "PRINCIPAL"],
  sample: "Show scholarship distribution",

  build() {
    const queries: NamedQueryModel[] = [
      { name: "overall", model: { entity: "scholarships", fields: [],
        aggregations: [{ fn: "count", field: "*", as: "total" }, { fn: "sum", field: "disbursed_amount", as: "disbursed" }], limit: 5000 } },
      { name: "by_status", model: { entity: "scholarships", fields: [], groupBy: ["status"],
        aggregations: [{ fn: "count", field: "*", as: "n" }, { fn: "sum", field: "disbursed_amount", as: "total" }], limit: 5000 } },
      { name: "by_scheme", model: { entity: "scholarships", fields: [], groupBy: ["scheme"],
        aggregations: [{ fn: "sum", field: "disbursed_amount", as: "total" }, { fn: "count", field: "*", as: "n" }], limit: 5000 } },
    ];
    return {
      queries,
      dashboard: {
        kpis: [
          { label: "Disbursed", fromQuery: "overall", compute: (r) => (r[0] ? Number(r[0].disbursed) || 0 : 0), format: "currency", tone: "good" },
          { label: "Applications", fromQuery: "overall", compute: (r) => (r[0] ? Number(r[0].total) || 0 : 0), format: "number" },
          { label: "Beneficiaries", fromQuery: "by_status", compute: sumWhere("n", "status", "disbursed"), format: "number", tone: "good" },
          { label: "Schemes", fromQuery: "by_scheme", compute: schemeCount, format: "number" },
        ],
        widgets: [
          { type: "donut", title: "Applications by status", fromQuery: "by_status", category: "status", value: "n", span: 1 },
          { type: "ranking", title: "Disbursed by scheme", fromQuery: "by_scheme", category: "scheme", value: "total", sort: "desc", limit: 12, span: 1 },
        ],
      },
    };
  },

  summarize(d) {
    const disbursed = d.kpis.find((k) => k.label === "Disbursed")?.display;
    const apps = d.kpis.find((k) => k.label === "Applications")?.value ?? 0;
    const beneficiaries = d.kpis.find((k) => k.label === "Beneficiaries")?.display;
    if (!apps) return "No scholarship applications have been recorded yet.";
    return `${disbursed} disbursed across ${Number(apps).toLocaleString("en-IN")} applications, reaching ${beneficiaries} beneficiaries.`;
  },

  followups: [
    "Which scheme disbursed the most?",
    "How many applications are pending?",
    "Show fee collection status",
    "Compare scholarships with last year",
  ],
};
