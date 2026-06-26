import type { IntentDefinition, NamedQueryModel } from "../types";
import type { ResultRow } from "@/lib/dataExplorer";
import { sumOf, sumWhere } from "../composer";

// CF-3 intent — Student Enrollment overview. Reads the CF-2 `students` entity only.
const activeOnly = { op: "and" as const, conditions: [{ field: "is_active", operator: "eq" as const, value: true }] };
const deptCount = (rows: ResultRow[]) => rows.length;

export const enrollmentIntent: IntentDefinition = {
  id: "people.enrollment",
  title: "Student Enrollment",
  domain: "People",
  aliases: ["students", "enrollment", "enrolment", "how many students", "student strength", "student count", "students by department", "students by program"],
  roles: ["SUPER_ADMIN", "INST_ADMIN", "PRINCIPAL", "IQAC"],
  sample: "How many students do we have, by department?",

  build() {
    const queries: NamedQueryModel[] = [
      { name: "by_program", model: { entity: "students", fields: [], filters: activeOnly, groupBy: ["student_program"],
        aggregations: [{ fn: "count", field: "*", as: "n" }], limit: 5000 } },
      { name: "by_year", model: { entity: "students", fields: [], filters: activeOnly, groupBy: ["student_year"],
        aggregations: [{ fn: "count", field: "*", as: "n" }], sort: [{ field: "student_year", dir: "asc" }], limit: 5000 } },
      { name: "by_dept", model: { entity: "students", fields: [], filters: activeOnly, groupBy: ["department_id"],
        aggregations: [{ fn: "count", field: "*", as: "n" }], limit: 5000 } },
    ];
    return {
      queries,
      dashboard: {
        kpis: [
          { label: "Active Students", fromQuery: "by_program", compute: sumOf("n"), format: "number", tone: "good" },
          { label: "Undergraduate", fromQuery: "by_program", compute: sumWhere("n", "student_program", "UG"), format: "number" },
          { label: "Postgraduate", fromQuery: "by_program", compute: sumWhere("n", "student_program", "PG"), format: "number" },
          { label: "Departments", fromQuery: "by_dept", compute: deptCount, format: "number" },
        ],
        widgets: [
          { type: "donut", title: "By program", fromQuery: "by_program", category: "student_program", value: "n", span: 1 },
          { type: "bar", title: "By year", fromQuery: "by_year", category: "student_year", value: "n", sort: "asc", span: 1 },
          { type: "ranking", title: "By department", fromQuery: "by_dept", category: "department_id", value: "n", sort: "desc", limit: 12, span: 2 },
        ],
      },
    };
  },

  summarize(d) {
    const total = d.kpis.find((k) => k.label === "Active Students")?.value ?? 0;
    const ug = d.kpis.find((k) => k.label === "Undergraduate")?.display;
    const pg = d.kpis.find((k) => k.label === "Postgraduate")?.display;
    const depts = d.kpis.find((k) => k.label === "Departments")?.value ?? 0;
    if (!total) return "No active student records are available.";
    return `${total.toLocaleString("en-IN")} active students — ${ug} undergraduate and ${pg} postgraduate — across ${depts} departments.`;
  },

  followups: [
    "Show admissions for this academic year",
    "Which department has the most students?",
    "Show fee collection status",
    "Compare UG and PG strength",
  ],
};
