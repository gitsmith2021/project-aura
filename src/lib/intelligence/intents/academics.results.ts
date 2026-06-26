import type { IntentDefinition, NamedQueryModel } from "../types";
import type { ResultRow } from "@/lib/dataExplorer";
import { sumWhere } from "../composer";

// CF-3 intent — Exam Results. Reads the CF-2 `results` entity (exam_results).
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
// is_arrear groups stringify to "true"/"false"; pass = not-arrear ÷ total.
const passPct = (rows: ResultRow[]) => {
  const total = rows.reduce((s, r) => s + num(r.n), 0);
  const pass = rows.filter((r) => String(r.is_arrear) === "false").reduce((s, r) => s + num(r.n), 0);
  return total > 0 ? (pass / total) * 100 : null;
};

export const resultsIntent: IntentDefinition = {
  id: "academics.results",
  title: "Exam Results",
  domain: "Academics",
  aliases: ["results", "exam results", "pass percentage", "pass rate", "arrears", "grades", "result analysis", "examination results", "grade distribution"],
  roles: ["SUPER_ADMIN", "INST_ADMIN", "PRINCIPAL", "IQAC"],
  sample: "Show the exam results and pass percentage",

  build() {
    const queries: NamedQueryModel[] = [
      { name: "by_arrear", model: { entity: "results", fields: [], groupBy: ["is_arrear"],
        aggregations: [{ fn: "count", field: "*", as: "n" }], limit: 5000 } },
      { name: "overall", model: { entity: "results", fields: [],
        aggregations: [{ fn: "count", field: "*", as: "total" }, { fn: "avg", field: "marks_scored", as: "avg_marks" }], limit: 5000 } },
      { name: "by_grade", model: { entity: "results", fields: [], groupBy: ["grade"],
        aggregations: [{ fn: "count", field: "*", as: "n" }], limit: 5000 } },
      { name: "by_sem", model: { entity: "results", fields: [], groupBy: ["semester"],
        aggregations: [{ fn: "count", field: "*", as: "n" }], sort: [{ field: "semester", dir: "asc" }], limit: 5000 } },
    ];
    return {
      queries,
      dashboard: {
        kpis: [
          { label: "Pass %", fromQuery: "by_arrear", compute: passPct, format: "percent", tone: "good" },
          { label: "Arrears", fromQuery: "by_arrear", compute: sumWhere("n", "is_arrear", "true"), format: "number", tone: "bad" },
          { label: "Results Declared", fromQuery: "overall", compute: (r) => (r[0] ? num(r[0].total) : null), format: "number" },
          { label: "Average Marks", fromQuery: "overall", compute: (r) => (r[0] ? num(r[0].avg_marks) : null), format: "number" },
        ],
        widgets: [
          { type: "donut", title: "Grade distribution", fromQuery: "by_grade", category: "grade", value: "n", span: 1 },
          { type: "bar", title: "Results by semester", fromQuery: "by_sem", category: "semester", value: "n", sort: "asc", span: 1 },
        ],
      },
    };
  },

  summarize(d) {
    const pass = d.kpis.find((k) => k.label === "Pass %")?.value;
    const passDisplay = d.kpis.find((k) => k.label === "Pass %")?.display;
    const arrears = d.kpis.find((k) => k.label === "Arrears")?.value ?? 0;
    const total = d.kpis.find((k) => k.label === "Results Declared")?.value ?? 0;
    if (!total) return "No published results are available yet.";
    const health = pass != null && pass >= 85 ? "strong" : pass != null && pass >= 70 ? "satisfactory" : "needs attention";
    return `Pass rate is ${passDisplay} (${health}), with ${Number(arrears).toLocaleString("en-IN")} arrear results across ${Number(total).toLocaleString("en-IN")} declared.`;
  },

  followups: [
    "Which semester has the most arrears?",
    "Show the grade distribution",
    "Show students below 75% attendance",
    "Compare results with last semester",
  ],
};
