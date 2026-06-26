import type { IntentDefinition, NamedQueryModel } from "../types";
import type { ResultRow } from "@/lib/dataExplorer";
import { sumOf, sumWhere } from "../composer";

// CF-3 intent — IQAC. Reads CF-2 `iqac` (meetings) + `iqac_actions` (view).
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

export const iqacIntent: IntentDefinition = {
  id: "compliance.iqac",
  title: "IQAC",
  domain: "Compliance",
  aliases: ["iqac", "iqac meetings", "quality assurance", "action items", "iqac compliance", "internal quality"],
  roles: ["SUPER_ADMIN", "INST_ADMIN"],
  sample: "Show IQAC meetings and action items",

  build() {
    const queries: NamedQueryModel[] = [
      { name: "meetings_overall", model: { entity: "iqac", fields: [], aggregations: [{ fn: "count", field: "*", as: "total" }], limit: 5000 } },
      { name: "meetings_by_status", model: { entity: "iqac", fields: [], groupBy: ["status"], aggregations: [{ fn: "count", field: "*", as: "n" }], limit: 5000 } },
      { name: "actions_by_status", model: { entity: "iqac_actions", fields: [], groupBy: ["status"], aggregations: [{ fn: "count", field: "*", as: "n" }], limit: 5000 } },
    ];
    return {
      queries,
      dashboard: {
        kpis: [
          { label: "Meetings Held", fromQuery: "meetings_overall", compute: (r) => (r[0] ? num(r[0].total) : 0), format: "number", tone: "good" },
          { label: "Action Items", fromQuery: "actions_by_status", compute: sumOf("n"), format: "number" },
          { label: "Resolved", fromQuery: "actions_by_status", compute: sumWhere("n", "status", "resolved"), format: "number", tone: "good" },
          { label: "Open", fromQuery: "actions_by_status", compute: (rows: ResultRow[]) => rows.filter((r) => String(r.status) !== "resolved").reduce((s, r) => s + num(r.n), 0), format: "number", tone: "warn" },
        ],
        widgets: [
          { type: "donut", title: "Meetings by status", fromQuery: "meetings_by_status", category: "status", value: "n", span: 1 },
          { type: "donut", title: "Action items by status", fromQuery: "actions_by_status", category: "status", value: "n", span: 1 },
        ],
      },
    };
  },

  summarize(d) {
    const meetings = num(d.kpis.find((k) => k.label === "Meetings Held")?.value ?? 0);
    const actions = num(d.kpis.find((k) => k.label === "Action Items")?.value ?? 0);
    const resolved = num(d.kpis.find((k) => k.label === "Resolved")?.value ?? 0);
    if (!meetings && !actions) return "No IQAC activity has been recorded yet.";
    const naac = meetings >= 2 ? "meets the NAAC ≥2-meetings/year norm" : "is below the NAAC ≥2-meetings/year norm";
    return `${meetings} IQAC meetings held (${naac}); ${resolved} of ${actions} action items resolved.`;
  },

  followups: [
    "Show the accreditation readiness",
    "How many action items are overdue?",
    "Show research and publications",
    "Show the NAAC readiness",
  ],
};
