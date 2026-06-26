import type { IntentDefinition, NamedQueryModel, Slots } from "../types";
import type { ResultRow } from "@/lib/dataExplorer";
import { sumOf } from "../composer";

// CF-3 intent — Attendance Risk ("students below 75%"). Reads the CF-2
// `student_attendance` entity (a security_invoker view → RLS-respecting).
// Scoped to roles that can read attendance under RLS (SUPER_ADMIN / INST_ADMIN).
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

export const attendanceRiskIntent: IntentDefinition = {
  id: "academics.attendance_risk",
  title: "Attendance Risk",
  domain: "Academics",
  aliases: ["attendance risk", "low attendance", "attendance below", "students below", "short of attendance", "attendance shortage", "defaulters", "attendance"],
  roles: ["SUPER_ADMIN", "INST_ADMIN", "HOD", "DEPARTMENT_HEAD"],
  sample: "Show students below 75% attendance",

  build(slots: Slots) {
    const threshold = slots.threshold ?? 75;
    const belowFilter = { op: "and" as const, conditions: [{ field: "attendance_pct", operator: "lt" as const, value: threshold }] };
    const queries: NamedQueryModel[] = [
      { name: "below", model: { entity: "student_attendance", fields: ["full_name", "roll_no", "department_id", "attendance_pct"],
        filters: belowFilter, sort: [{ field: "attendance_pct", dir: "asc" }], limit: 100 } },
      { name: "below_count", model: { entity: "student_attendance", fields: [], filters: belowFilter,
        aggregations: [{ fn: "count", field: "*", as: "n" }], limit: 5000 } },
      { name: "below_by_dept", model: { entity: "student_attendance", fields: [], filters: belowFilter, groupBy: ["department_id"],
        aggregations: [{ fn: "count", field: "*", as: "n" }], limit: 5000 } },
      { name: "overall", model: { entity: "student_attendance", fields: [],
        aggregations: [{ fn: "count", field: "*", as: "total" }, { fn: "avg", field: "attendance_pct", as: "avg_pct" }], limit: 5000 } },
    ];
    return {
      queries,
      dashboard: {
        kpis: [
          { label: `Below ${threshold}%`, fromQuery: "below_count", compute: sumOf("n"), format: "number", tone: "bad" },
          { label: "Avg Attendance", fromQuery: "overall", compute: (rows: ResultRow[]) => (rows[0] ? num(rows[0].avg_pct) : null), format: "percent" },
          { label: "Students Tracked", fromQuery: "overall", compute: (rows: ResultRow[]) => (rows[0] ? num(rows[0].total) : null), format: "number" },
          { label: "Threshold", fromQuery: "overall", compute: () => threshold, format: "percent" },
        ],
        widgets: [
          { type: "ranking", title: "Most at-risk students", fromQuery: "below", category: "full_name", value: "attendance_pct", sort: "asc", limit: 12, span: 1 },
          { type: "ranking", title: "At-risk by department", fromQuery: "below_by_dept", category: "department_id", value: "n", sort: "desc", limit: 12, span: 1 },
          { type: "table", title: "Students below threshold", fromQuery: "below", span: 2,
            columns: [
              { key: "roll_no", label: "Roll No" },
              { key: "full_name", label: "Name" },
              { key: "department_id", label: "Department" },
              { key: "attendance_pct", label: "Attendance %", format: "number" },
            ] },
        ],
      },
    };
  },

  summarize(d, slots) {
    const threshold = slots.threshold ?? 75;
    const below = d.kpis.find((k) => k.label.startsWith("Below"))?.value ?? 0;
    const avg = d.kpis.find((k) => k.label === "Avg Attendance")?.display;
    const dept = d.widgets.find((w) => w.title === "At-risk by department")?.rows[0];
    if (below === 0) return `No students are below ${threshold}% attendance — average attendance is ${avg}.`;
    const deptTxt = dept ? ` The most at-risk students are concentrated in one department (${dept.n}).` : "";
    return `${Number(below).toLocaleString("en-IN")} students are below ${threshold}% attendance, against an average of ${avg}.${deptTxt}`;
  },

  followups: [
    "Show fee collection status",
    "Which department has the most at-risk students?",
    "Show students below 60% attendance",
    "How many students do we have?",
  ],
};
