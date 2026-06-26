import type { IntentDefinition, NamedQueryModel } from "../types";
import type { ResultRow } from "@/lib/dataExplorer";
import { sumOf, sumWhere } from "../composer";

// CF-3 intent — Department Budgets. Reads the CF-2 `budgets` entity
// (department_budgets, Phase 5L).
const deptCount = (rows: ResultRow[]) => rows.length;

export const budgetIntent: IntentDefinition = {
  id: "finance.budget",
  title: "Department Budgets",
  domain: "Finance",
  aliases: ["budget", "budgets", "department budget", "allocation", "budget allocation", "department budgets"],
  roles: ["SUPER_ADMIN", "INST_ADMIN", "DEPARTMENT_HEAD", "HOD"],
  sample: "Show department budgets",

  build() {
    const queries: NamedQueryModel[] = [
      { name: "overall", model: { entity: "budgets", fields: [],
        aggregations: [{ fn: "sum", field: "total_allocated", as: "total" }, { fn: "count", field: "*", as: "n" }], limit: 5000 } },
      { name: "by_status", model: { entity: "budgets", fields: [], groupBy: ["status"],
        aggregations: [{ fn: "count", field: "*", as: "n" }], limit: 5000 } },
      { name: "by_dept", model: { entity: "budgets", fields: [], groupBy: ["department_id"],
        aggregations: [{ fn: "sum", field: "total_allocated", as: "total" }], limit: 5000 } },
    ];
    return {
      queries,
      dashboard: {
        kpis: [
          { label: "Total Allocated", fromQuery: "overall", compute: (r) => (r[0] ? Number(r[0].total) || 0 : 0), format: "currency", tone: "good" },
          { label: "Budgets", fromQuery: "overall", compute: (r) => (r[0] ? Number(r[0].n) || 0 : 0), format: "number" },
          { label: "Approved", fromQuery: "by_status", compute: sumWhere("n", "status", "approved"), format: "number", tone: "good" },
          { label: "Departments", fromQuery: "by_dept", compute: deptCount, format: "number" },
        ],
        widgets: [
          { type: "ranking", title: "Allocation by department", fromQuery: "by_dept", category: "department_id", value: "total", sort: "desc", limit: 12, span: 1 },
          { type: "donut", title: "Budgets by status", fromQuery: "by_status", category: "status", value: "n", span: 1 },
        ],
      },
    };
  },

  summarize(d) {
    const total = d.kpis.find((k) => k.label === "Total Allocated")?.display;
    const budgets = d.kpis.find((k) => k.label === "Budgets")?.value ?? 0;
    const depts = d.kpis.find((k) => k.label === "Departments")?.value ?? 0;
    if (!budgets) return "No department budgets have been created yet.";
    return `${total} allocated across ${Number(depts).toLocaleString("en-IN")} departments (${Number(budgets).toLocaleString("en-IN")} budgets).`;
  },

  followups: [
    "Which department has the largest budget?",
    "How many budgets are pending approval?",
    "Show the finance overview",
    "Show fee collection status",
  ],
};
