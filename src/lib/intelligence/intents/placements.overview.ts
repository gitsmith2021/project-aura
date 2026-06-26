import type { IntentDefinition, NamedQueryModel } from "../types";
import type { ResultRow } from "@/lib/dataExplorer";
import { sumOf } from "../composer";

// CF-3 intent — Placements. Reads the CF-2 `placements` entity (placement_summary
// security_invoker view: registrations × drives × companies, RLS-respecting).
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const first = (key: string) => (rows: ResultRow[]) => (rows[0] ? num(rows[0][key]) : null);

export const placementsIntent: IntentDefinition = {
  id: "placements.overview",
  title: "Placements",
  domain: "Placements",
  aliases: ["placements", "placement", "placement statistics", "placed students", "highest package", "campus placements", "offers", "ctc", "recruitment drives"],
  roles: ["SUPER_ADMIN", "INST_ADMIN", "PRINCIPAL"],
  sample: "Show placement statistics",

  build() {
    const placedFilter = { op: "and" as const, conditions: [{ field: "placed", operator: "eq" as const, value: true }] };
    const queries: NamedQueryModel[] = [
      { name: "placed", model: { entity: "placements", fields: [], filters: placedFilter,
        aggregations: [{ fn: "count", field: "*", as: "n" }], limit: 5000 } },
      { name: "overall", model: { entity: "placements", fields: [],
        aggregations: [{ fn: "count", field: "*", as: "total" }, { fn: "max", field: "offer_ctc", as: "highest" }, { fn: "avg", field: "offer_ctc", as: "avg_ctc" }], limit: 5000 } },
      { name: "by_company", model: { entity: "placements", fields: [], filters: placedFilter, groupBy: ["company"],
        aggregations: [{ fn: "count", field: "*", as: "n" }], limit: 5000 } },
      { name: "top_offers", model: { entity: "placements", fields: ["company", "job_role", "offer_ctc"],
        filters: { op: "and", conditions: [{ field: "offer_ctc", operator: "not_null" }] }, sort: [{ field: "offer_ctc", dir: "desc" }], limit: 10 } },
    ];
    return {
      queries,
      dashboard: {
        kpis: [
          { label: "Placed", fromQuery: "placed", compute: sumOf("n"), format: "number", tone: "good" },
          { label: "Highest CTC", fromQuery: "overall", compute: first("highest"), format: "currency", tone: "good" },
          { label: "Average CTC", fromQuery: "overall", compute: first("avg_ctc"), format: "currency" },
          { label: "Registrations", fromQuery: "overall", compute: first("total"), format: "number" },
        ],
        widgets: [
          { type: "ranking", title: "Top recruiters (hires)", fromQuery: "by_company", category: "company", value: "n", sort: "desc", limit: 12, span: 1 },
          { type: "table", title: "Top offers", fromQuery: "top_offers", span: 1,
            columns: [
              { key: "company", label: "Company" },
              { key: "job_role", label: "Role" },
              { key: "offer_ctc", label: "CTC", format: "currency" },
            ] },
        ],
      },
    };
  },

  summarize(d) {
    const placed = d.kpis.find((k) => k.label === "Placed")?.value ?? 0;
    const highest = d.kpis.find((k) => k.label === "Highest CTC")?.display;
    const avg = d.kpis.find((k) => k.label === "Average CTC")?.display;
    if (!placed) return "No placement offers have been recorded yet.";
    return `${Number(placed).toLocaleString("en-IN")} students placed, with a highest package of ${highest} and an average of ${avg}.`;
  },

  followups: [
    "Which company hired the most students?",
    "Show the highest packages offered",
    "Compare placements with last year",
    "How many students do we have?",
  ],
};
