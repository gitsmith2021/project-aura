import type { IntentDefinition, NamedQueryModel } from "../types";
import type { ResultRow } from "@/lib/dataExplorer";
import { sumOf } from "../composer";

// CF-3 intent — Payroll. Reads the CF-2 `payroll` entity (salary_disbursements).
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const first = (key: string) => (rows: ResultRow[]) => (rows[0] ? num(rows[0][key]) : null);

export const payrollIntent: IntentDefinition = {
  id: "hr.payroll",
  title: "Payroll",
  domain: "Finance",
  aliases: ["payroll", "salary", "salaries", "salary disbursement", "staff salary", "payroll cost", "salary paid"],
  roles: ["SUPER_ADMIN", "INST_ADMIN"],
  sample: "Show the payroll and salary disbursements",

  build() {
    const queries: NamedQueryModel[] = [
      { name: "overall", model: { entity: "payroll", fields: [],
        aggregations: [{ fn: "sum", field: "amount_disbursed", as: "total" }, { fn: "count", field: "*", as: "n" }, { fn: "avg", field: "amount_disbursed", as: "avg" }], limit: 5000 } },
      { name: "by_month", model: { entity: "payroll", fields: [], groupBy: ["month"],
        aggregations: [{ fn: "sum", field: "amount_disbursed", as: "total" }], sort: [{ field: "month", dir: "asc" }], limit: 5000 } },
      { name: "by_status", model: { entity: "payroll", fields: [], groupBy: ["status"],
        aggregations: [{ fn: "count", field: "*", as: "n" }, { fn: "sum", field: "amount_disbursed", as: "total" }], limit: 5000 } },
    ];
    return {
      queries,
      dashboard: {
        kpis: [
          { label: "Total Disbursed", fromQuery: "overall", compute: first("total"), format: "currency", tone: "good" },
          { label: "Disbursements", fromQuery: "overall", compute: first("n"), format: "number" },
          { label: "Average Salary", fromQuery: "overall", compute: first("avg"), format: "currency" },
          { label: "Months", fromQuery: "by_month", compute: (rows) => rows.length, format: "number" },
        ],
        widgets: [
          { type: "bar", title: "Payroll by month", fromQuery: "by_month", category: "month", value: "total", sort: "asc", span: 1 },
          { type: "donut", title: "By status", fromQuery: "by_status", category: "status", value: "n", span: 1 },
        ],
      },
    };
  },

  summarize(d) {
    const total = d.kpis.find((k) => k.label === "Total Disbursed")?.display;
    const n = d.kpis.find((k) => k.label === "Disbursements")?.value ?? 0;
    const avg = d.kpis.find((k) => k.label === "Average Salary")?.display;
    if (!n) return "No salary disbursements have been recorded yet.";
    return `${total} disbursed across ${Number(n).toLocaleString("en-IN")} payments, averaging ${avg} per disbursement.`;
  },

  followups: [
    "Show fee collection status",
    "Which month had the highest payroll?",
    "Show department budgets",
    "Show the finance overview",
  ],
};
