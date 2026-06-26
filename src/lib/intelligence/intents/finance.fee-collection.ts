import type { IntentDefinition, NamedQueryModel, Slots } from "../types";
import { sumWhere, sumOf, ratioPct, formatValue } from "../composer";

// CF-3 intent — Fee Collection. Reads the CF-2 `fee_payments` entity only.
const dateRange = (slots: Slots) =>
  slots.timeRange ? { field: "paid_at", from: slots.timeRange.from ?? null, to: slots.timeRange.to ?? null } : null;

const STATUS_LABELS = { completed: "Collected", pending: "Pending", failed: "Failed", refunded: "Refunded" };

export const feeCollectionIntent: IntentDefinition = {
  id: "finance.fee_collection",
  title: "Fee Collection",
  domain: "Finance",
  aliases: ["fee collection", "fees collected", "fee status", "collection status", "fees", "outstanding fees", "pending fees"],
  roles: ["SUPER_ADMIN", "INST_ADMIN", "PRINCIPAL"],
  sample: "What is the fee collection status this academic year?",

  build(slots) {
    const dr = dateRange(slots);
    const queries: NamedQueryModel[] = [
      { name: "by_status", model: { entity: "fee_payments", fields: [], groupBy: ["payment_status"],
        aggregations: [{ fn: "sum", field: "amount_paid", as: "total" }, { fn: "count", field: "*", as: "n" }], dateRange: dr, limit: 5000 } },
      { name: "by_mode", model: { entity: "fee_payments", fields: [], groupBy: ["payment_mode"],
        aggregations: [{ fn: "sum", field: "amount_paid", as: "total" }], dateRange: dr, limit: 5000 } },
      { name: "recent", model: { entity: "fee_payments", fields: ["paid_at", "amount_paid", "payment_mode", "payment_status"],
        sort: [{ field: "paid_at", dir: "desc" }], dateRange: dr, limit: 10 } },
    ];
    return {
      queries,
      dashboard: {
        kpis: [
          { label: "Collected", fromQuery: "by_status", compute: sumWhere("total", "payment_status", "completed"), format: "currency", tone: "good" },
          { label: "Outstanding", fromQuery: "by_status", compute: sumWhere("total", "payment_status", "pending"), format: "currency", tone: "warn" },
          { label: "Collection %", fromQuery: "by_status", compute: ratioPct("total", "payment_status", "completed", ["completed", "pending"]), format: "percent" },
          { label: "Payments", fromQuery: "by_status", compute: sumOf("n"), format: "number" },
        ],
        widgets: [
          { type: "donut", title: "Collection by status", fromQuery: "by_status", category: "payment_status", value: "total", labelMap: STATUS_LABELS, span: 1 },
          { type: "bar", title: "By payment mode", fromQuery: "by_mode", category: "payment_mode", value: "total", span: 1 },
          { type: "table", title: "Recent collections", fromQuery: "recent", span: 2,
            columns: [
              { key: "paid_at", label: "Date", format: "text" },
              { key: "amount_paid", label: "Amount", format: "currency" },
              { key: "payment_mode", label: "Mode" },
              { key: "payment_status", label: "Status" },
            ] },
        ],
      },
    };
  },

  summarize(d, slots) {
    const pct = d.kpis.find((k) => k.label === "Collection %")?.value;
    const collected = d.kpis.find((k) => k.label === "Collected")?.display;
    const outstanding = d.kpis.find((k) => k.label === "Outstanding")?.display;
    const period = slots.timeRange?.label ?? "to date";
    if (pct === null || pct === undefined) return "No fee collection data is available for the selected period.";
    const health = pct >= 85 ? "strong" : pct >= 70 ? "steady" : "below target";
    return `Fee collection ${period} stands at ${formatValue(pct, "percent")} — ${health}. ${collected} has been collected with ${outstanding} still outstanding.`;
  },

  followups: [
    "Compare fee collection with last academic year",
    "Which payment mode is used most?",
    "Show outstanding amount this month",
    "Show recent fee collections",
  ],
};
