import type { IntentDefinition, NamedQueryModel } from "../types";
import type { ResultRow } from "@/lib/dataExplorer";
import { sumOf, sumWhere } from "../composer";

// CF-3 intent — Faculty & Staff overview. Reads the CF-2 `staff` entity only.
const activeOnly = { op: "and" as const, conditions: [{ field: "is_active", operator: "eq" as const, value: true }] };
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const deptCount = (rows: ResultRow[]) => rows.length;

export const facultyIntent: IntentDefinition = {
  id: "people.faculty",
  title: "Faculty & Staff",
  domain: "People",
  aliases: ["faculty", "staff", "teaching staff", "how many faculty", "faculty count", "staff strength", "teachers", "non-teaching staff"],
  roles: ["SUPER_ADMIN", "INST_ADMIN", "PRINCIPAL", "IQAC"],
  sample: "How many faculty do we have, by department?",

  build() {
    const queries: NamedQueryModel[] = [
      { name: "by_type", model: { entity: "staff", fields: [], filters: activeOnly, groupBy: ["staff_type"],
        aggregations: [{ fn: "count", field: "*", as: "n" }], limit: 5000 } },
      { name: "by_dept", model: { entity: "staff", fields: [], filters: activeOnly, groupBy: ["department_id"],
        aggregations: [{ fn: "count", field: "*", as: "n" }], limit: 5000 } },
    ];
    return {
      queries,
      dashboard: {
        kpis: [
          { label: "Total Staff", fromQuery: "by_type", compute: sumOf("n"), format: "number", tone: "good" },
          { label: "Teaching", fromQuery: "by_type", compute: sumWhere("n", "staff_type", "teaching"), format: "number" },
          { label: "Non-Teaching", fromQuery: "by_type", compute: (rows: ResultRow[]) => rows.filter((r) => String(r.staff_type) !== "teaching").reduce((s, r) => s + num(r.n), 0), format: "number" },
          { label: "Departments", fromQuery: "by_dept", compute: deptCount, format: "number" },
        ],
        widgets: [
          { type: "donut", title: "By staff type", fromQuery: "by_type", category: "staff_type", value: "n", span: 1 },
          { type: "ranking", title: "By department", fromQuery: "by_dept", category: "department_id", value: "n", sort: "desc", limit: 12, span: 1 },
        ],
      },
    };
  },

  summarize(d) {
    const total = d.kpis.find((k) => k.label === "Total Staff")?.value ?? 0;
    const teaching = d.kpis.find((k) => k.label === "Teaching")?.display;
    const depts = d.kpis.find((k) => k.label === "Departments")?.value ?? 0;
    if (!total) return "No active staff records are available.";
    return `${Number(total).toLocaleString("en-IN")} active staff — ${teaching} teaching — across ${depts} departments.`;
  },

  followups: [
    "How many students do we have?",
    "Which department has the most faculty?",
    "Show fee collection status",
    "Show admissions for this academic year",
  ],
};
