import type { IntentDefinition, NamedQueryModel } from "../types";
import type { ResultRow } from "@/lib/dataExplorer";
import { sumOf } from "../composer";

// CF-3 intent — CIA Results. Reads the CF-2 `results` entity → `cia_results`
// (Phase 2E). Note: cia_results holds internal-assessment scores (final_percentage,
// semester, status), not letter grades / arrears. Pass = score ≥ 40%.
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const first = (key: string) => (rows: ResultRow[]) => (rows[0] ? num(rows[0][key]) : null);
const PASS_MARK = 40;

export const resultsIntent: IntentDefinition = {
  id: "academics.results",
  title: "CIA Results",
  domain: "Academics",
  aliases: ["results", "cia results", "internal assessment", "pass percentage", "pass rate", "result analysis", "academic performance", "examination results", "cia"],
  roles: ["SUPER_ADMIN", "INST_ADMIN", "PRINCIPAL", "IQAC", "HOD", "DEPARTMENT_HEAD"],
  sample: "Show the CIA results and pass percentage",

  build() {
    const passFilter = { op: "and" as const, conditions: [{ field: "final_percentage", operator: "gte" as const, value: PASS_MARK }] };
    const queries: NamedQueryModel[] = [
      { name: "overall", model: { entity: "results", fields: [],
        aggregations: [{ fn: "count", field: "*", as: "total" }, { fn: "avg", field: "final_percentage", as: "avg_pct" }], limit: 5000 } },
      { name: "pass", model: { entity: "results", fields: [], filters: passFilter,
        aggregations: [{ fn: "count", field: "*", as: "n" }], limit: 5000 } },
      { name: "by_sem", model: { entity: "results", fields: [], groupBy: ["semester"],
        aggregations: [{ fn: "avg", field: "final_percentage", as: "avg_pct" }, { fn: "count", field: "*", as: "n" }],
        sort: [{ field: "semester", dir: "asc" }], limit: 5000 } },
      { name: "by_dept", model: { entity: "results", fields: [], groupBy: ["department_id"],
        aggregations: [{ fn: "avg", field: "final_percentage", as: "avg_pct" }, { fn: "count", field: "*", as: "n" }], limit: 5000 } },
    ];
    return {
      queries,
      dashboard: {
        kpis: [
          { label: "Average Score", fromQuery: "overall", compute: first("avg_pct"), format: "percent", tone: "good" },
          { label: `Passed (≥${PASS_MARK}%)`, fromQuery: "pass", compute: sumOf("n"), format: "number", tone: "good" },
          { label: "Students Assessed", fromQuery: "overall", compute: first("total"), format: "number" },
          { label: "Departments", fromQuery: "by_dept", compute: (rows) => rows.length, format: "number" },
        ],
        widgets: [
          { type: "bar", title: "Average score by semester", fromQuery: "by_sem", category: "semester", value: "avg_pct", sort: "asc", span: 1 },
          { type: "ranking", title: "Average score by department", fromQuery: "by_dept", category: "department_id", value: "avg_pct", sort: "desc", limit: 12, span: 1 },
        ],
      },
    };
  },

  summarize(d) {
    const avg = d.kpis.find((k) => k.label === "Average Score")?.display;
    const passed = num(d.kpis.find((k) => k.label.startsWith("Passed"))?.value ?? 0);
    const total = num(d.kpis.find((k) => k.label === "Students Assessed")?.value ?? 0);
    if (!total) return "No published CIA results are available yet.";
    const passRate = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;
    const health = passRate >= 85 ? "strong" : passRate >= 70 ? "satisfactory" : "needs attention";
    return `Average CIA score is ${avg}, with a ${passRate}% pass rate (${health}) — ${passed.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")} students scored ≥ ${PASS_MARK}%.`;
  },

  followups: [
    "Which department has the highest average score?",
    "Show students below 75% attendance",
    "Compare results with last semester",
    "Show admissions for this academic year",
  ],
};
