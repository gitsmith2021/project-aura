import type { IntentDefinition, NamedQueryModel, Slots } from "../types";
import type { ResultRow } from "@/lib/dataExplorer";
import { sumOf, sumWhere } from "../composer";

// CF-3 intent — Admissions overview (incl. "departments/programs with low admissions").
// Reads the CF-2 `admissions` entity only.
const dateRange = (slots: Slots) =>
  slots.timeRange ? { field: "applied_at", from: slots.timeRange.from ?? null, to: slots.timeRange.to ?? null } : null;

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const conversionPct = (rows: ResultRow[]) => {
  const total = rows.reduce((s, r) => s + num(r.n), 0);
  const enrolled = rows.filter((r) => String(r.status) === "enrolled").reduce((s, r) => s + num(r.n), 0);
  return total > 0 ? (enrolled / total) * 100 : null;
};

export const admissionsIntent: IntentDefinition = {
  id: "admissions.overview",
  title: "Admissions",
  domain: "Admissions",
  aliases: ["admissions", "admission", "low admissions", "applications", "applicants", "intake", "enrolment funnel", "admission funnel"],
  roles: ["SUPER_ADMIN", "INST_ADMIN", "PRINCIPAL"],
  sample: "Show departments with low admissions",

  build(slots) {
    const dr = dateRange(slots);
    const queries: NamedQueryModel[] = [
      { name: "by_program", model: { entity: "admissions", fields: [], groupBy: ["program_applied"],
        aggregations: [{ fn: "count", field: "*", as: "n" }], dateRange: dr, limit: 5000 } },
      { name: "by_status", model: { entity: "admissions", fields: [], groupBy: ["status"],
        aggregations: [{ fn: "count", field: "*", as: "n" }], dateRange: dr, limit: 5000 } },
      { name: "recent", model: { entity: "admissions", fields: ["applied_at", "applicant_name", "program_applied", "status"],
        sort: [{ field: "applied_at", dir: "desc" }], dateRange: dr, limit: 10 } },
    ];
    return {
      queries,
      dashboard: {
        kpis: [
          { label: "Applications", fromQuery: "by_status", compute: sumOf("n"), format: "number" },
          { label: "Admitted", fromQuery: "by_status", compute: sumWhere("n", "status", "admitted"), format: "number", tone: "good" },
          { label: "Enrolled", fromQuery: "by_status", compute: sumWhere("n", "status", "enrolled"), format: "number", tone: "good" },
          { label: "Conversion %", fromQuery: "by_status", compute: conversionPct, format: "percent" },
        ],
        widgets: [
          { type: "ranking", title: "Programs by intake (lowest first)", fromQuery: "by_program", category: "program_applied", value: "n", sort: "asc", limit: 10, span: 1 },
          { type: "donut", title: "Pipeline by status", fromQuery: "by_status", category: "status", value: "n", span: 1 },
          { type: "table", title: "Recent applications", fromQuery: "recent", span: 2,
            columns: [
              { key: "applied_at", label: "Applied", format: "text" },
              { key: "applicant_name", label: "Applicant" },
              { key: "program_applied", label: "Program" },
              { key: "status", label: "Status" },
            ] },
        ],
      },
    };
  },

  summarize(d) {
    const apps = d.kpis.find((k) => k.label === "Applications")?.value ?? 0;
    const conv = d.kpis.find((k) => k.label === "Conversion %")?.display;
    const ranking = d.widgets.find((w) => w.type === "ranking");
    const lowest = ranking?.rows[0];
    if (!apps) return "No admissions data is available for the selected period.";
    const lowestTxt = lowest ? ` Lowest intake is in ${lowest.program_applied} (${lowest.n}).` : "";
    return `${apps.toLocaleString("en-IN")} applications received, converting at ${conv}.${lowestTxt}`;
  },

  followups: [
    "Compare admissions with last academic year",
    "Which program has the highest intake?",
    "Show the admission funnel by status",
    "Show recent applications",
  ],
};
