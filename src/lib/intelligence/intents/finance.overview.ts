import type { IntentDefinition, NamedQueryModel } from "../types";
import type { ResultRow } from "@/lib/dataExplorer";

// CF-3 intent — Finance Overview. A cross-entity executive snapshot: fee income
// vs spend (expenses + payroll + scholarships). Each metric is its own CF-2
// query against its own entity — the orchestrator runs them all (RLS-scoped).
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const total = (rows: ResultRow[]) => (rows[0] ? num(rows[0].total) : 0);

export const financeOverviewIntent: IntentDefinition = {
  id: "finance.overview",
  title: "Finance Overview",
  domain: "Finance",
  aliases: ["finance overview", "financial overview", "financial position", "financial health", "income and expenses", "finance summary", "revenue", "finances"],
  roles: ["SUPER_ADMIN", "INST_ADMIN"],
  sample: "Show me the finance overview",

  build() {
    const queries: NamedQueryModel[] = [
      { name: "income", model: { entity: "fee_payments", fields: [],
        filters: { op: "and", conditions: [{ field: "payment_status", operator: "eq", value: "completed" }] },
        aggregations: [{ fn: "sum", field: "amount_paid", as: "total" }], limit: 5000 } },
      { name: "expenses", model: { entity: "expenses", fields: [],
        aggregations: [{ fn: "sum", field: "amount", as: "total" }], limit: 5000 } },
      { name: "payroll", model: { entity: "payroll", fields: [],
        aggregations: [{ fn: "sum", field: "amount_disbursed", as: "total" }], limit: 5000 } },
      { name: "scholarships", model: { entity: "scholarships", fields: [],
        aggregations: [{ fn: "sum", field: "disbursed_amount", as: "total" }], limit: 5000 } },
      { name: "exp_by_cat", model: { entity: "expenses", fields: [], groupBy: ["category"],
        aggregations: [{ fn: "sum", field: "amount", as: "total" }], limit: 5000 } },
    ];
    return {
      queries,
      dashboard: {
        kpis: [
          { label: "Fee Income", fromQuery: "income", compute: total, format: "currency", tone: "good" },
          { label: "Expenses", fromQuery: "expenses", compute: total, format: "currency", tone: "warn" },
          { label: "Payroll", fromQuery: "payroll", compute: total, format: "currency", tone: "warn" },
          { label: "Scholarships", fromQuery: "scholarships", compute: total, format: "currency" },
        ],
        widgets: [
          { type: "ranking", title: "Top expense categories", fromQuery: "exp_by_cat", category: "category", value: "total", sort: "desc", limit: 12, span: 2 },
        ],
      },
    };
  },

  summarize(d) {
    const income = num(d.kpis.find((k) => k.label === "Fee Income")?.value ?? 0);
    const expenses = num(d.kpis.find((k) => k.label === "Expenses")?.value ?? 0);
    const payroll = num(d.kpis.find((k) => k.label === "Payroll")?.value ?? 0);
    const scholarships = num(d.kpis.find((k) => k.label === "Scholarships")?.value ?? 0);
    if (income === 0 && expenses === 0 && payroll === 0) return "No financial activity has been recorded yet.";
    const spend = expenses + payroll + scholarships;
    const net = income - spend;
    const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
    const verdict = net >= 0 ? `a surplus of ${fmt(net)}` : `a deficit of ${fmt(-net)}`;
    return `Fee income of ${fmt(income)} against ${fmt(spend)} in total spend (expenses, payroll and scholarships) leaves ${verdict}.`;
  },

  followups: [
    "Show fee collection status",
    "What are the biggest expense categories?",
    "Show the payroll",
    "Show department budgets",
  ],
};
