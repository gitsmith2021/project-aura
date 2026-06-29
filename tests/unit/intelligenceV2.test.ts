import { describe, it, expect } from "vitest";
import type { EntityDef, ResultRow } from "@/lib/dataExplorer";
import { extractQuery, pickEntity } from "@/lib/intelligence/slotExtractor";
import { decideResponse } from "@/lib/intelligence/responseStrategy";
import { planQueries } from "@/lib/intelligence/queryPlanner";
import { composeView } from "@/lib/intelligence/composerV2";
import { buildSummary } from "@/lib/intelligence/summary";
import { normalize, bigramSimilarity, rankCandidates } from "@/lib/intelligence/semantic";

// ── Catalog fixtures (mirror the real CF-2 entities) ─────────────────────────────
const col = (key: string, label: string, type: EntityDef["columns"][number]["type"], f = true, g = false, a = false) =>
  ({ key, label, type, filterable: f, groupable: g, aggregatable: a });

const students: EntityDef = {
  key: "students", label: "Students", category: "People", source: "students",
  columns: [col("full_name", "Name", "text"), col("roll_no", "Roll No", "text"),
    col("student_program", "Program", "text", true, true), col("student_year", "Year", "number", true, true, true),
    col("department_id", "Department", "text", true, true), col("is_active", "Active", "boolean"), col("created_at", "Enrolled On", "date")],
  defaultDateField: "created_at", sortOrder: 1,
};
const staff: EntityDef = {
  key: "staff", label: "Faculty & Staff", category: "People", source: "staff",
  columns: [col("full_name", "Name", "text"), col("staff_type", "Staff Type", "text", true, true), col("department_id", "Department", "text", true, true), col("is_active", "Active", "boolean")],
  defaultDateField: "created_at", sortOrder: 2,
};
const staffSalary: EntityDef = {
  key: "staff_salary", label: "Staff Salary", category: "Finance", source: "staff_salary",
  columns: [col("full_name", "Name", "text"), col("employee_id", "Employee ID", "text"), col("designation", "Designation", "text", true, true),
    col("staff_type", "Staff Type", "text", true, true), col("department_id", "Department", "text", true, true),
    col("net_salary", "Net Salary", "number", true, false, true), col("basic_salary", "Basic Salary", "number", true, false, true), col("is_active", "Active", "boolean")],
  defaultDateField: null, sortOrder: 20,
};
const fees: EntityDef = {
  key: "fee_payments", label: "Fee Payments", category: "Finance", source: "fee_payments",
  columns: [col("amount_paid", "Amount", "number", true, false, true), col("payment_status", "Status", "text", true, true), col("paid_at", "Paid On", "date")],
  defaultDateField: "paid_at", sortOrder: 4,
};
const catalog = [students, staff, staffSalary, fees];

// ── Semantic helpers ─────────────────────────────────────────────────────────────
describe("semantic helpers", () => {
  it("normalizes punctuation/case", () => {
    expect(normalize("Computer-Science!")).toBe("computer science");
  });
  it("bigram similarity is high for near matches, low for unrelated", () => {
    expect(bigramSimilarity("computer science", "computer science")).toBe(1);
    expect(bigramSimilarity("comp science", "computer science")).toBeGreaterThan(0.4);
    expect(bigramSimilarity("commerce", "physics")).toBeLessThan(0.3);
  });
  it("ranks candidates exact > substring > bigram and respects the floor", () => {
    const cands = [{ raw: "Computer Science", resolved: "d1" }, { raw: "Commerce", resolved: "d2" }];
    expect(rankCandidates("computer science", cands)?.resolved).toBe("d1");
    expect(rankCandidates("comp sci", cands)?.resolved).toBe("d1");
    expect(rankCandidates("zzzz", cands)).toBeNull();
  });
});

// ── Entity selection ─────────────────────────────────────────────────────────────
describe("pickEntity", () => {
  it("routes a salary question to staff_salary, not staff", () => {
    expect(pickEntity("List staff drawing salary less than 10000", catalog)?.key).toBe("staff_salary");
  });
  it("routes a students question to students", () => {
    expect(pickEntity("second year computer science students", catalog)?.key).toBe("students");
  });
});

// ── Acceptance: salary ───────────────────────────────────────────────────────────
describe("salary question", () => {
  const ex = extractQuery("List staff drawing salary less than ₹10,000", catalog)!;
  it("extracts entity + numeric filter + LIST response", () => {
    expect(ex.entity).toBe("staff_salary");
    expect(ex.filters).toEqual([{ column: "net_salary", operator: "lt", value: 10000 }]);
    expect(ex.responseHint).toBe("LIST");
    expect(ex.title).toMatch(/Net Salary Below ₹10,000/);
  });
  it("plans a valid list + stats query", () => {
    const plan = planQueries(ex, staffSalary)!;
    expect(plan.responseType).toBe("LIST");
    const names = plan.models.map((m) => m.name).sort();
    expect(names).toEqual(["list", "stats"]);
    const list = plan.models.find((m) => m.name === "list")!.model;
    expect(list.filters?.conditions).toContainEqual({ field: "net_salary", operator: "lt", value: 10000 });
    expect(plan.gridColumns.map((c) => c.key)).toContain("net_salary");
    expect(plan.gridColumns.find((c) => c.key === "net_salary")?.format).toBe("currency");
  });
  it("composes KPI strip + record grid + grounded summary", () => {
    const plan = planQueries(ex, staffSalary)!;
    const rows: ResultRow[] = [
      { full_name: "A", employee_id: "E1", designation: "Lecturer", net_salary: 8000 },
      { full_name: "B", employee_id: "E2", designation: "Lab Asst", net_salary: 6000 },
    ];
    const datasets = new Map<string, ResultRow[]>([["list", rows], ["stats", [{ n: 2, avg: 7000, min: 6000, max: 8000, total: 14000 }]]]);
    const view = composeView(plan, datasets, staffSalary);
    expect(view.blocks.find((b) => b.kind === "kpiStrip")).toBeTruthy();
    const grid = view.blocks.find((b) => b.kind === "recordGrid");
    expect(grid?.kind === "recordGrid" && grid.rows.length).toBe(2);
    const summary = buildSummary(view);
    expect(summary).toMatch(/2 records match/);
    expect(summary).toMatch(/₹6,000/); // grounded in returned min
  });
});

// ── Acceptance: filtered student list ────────────────────────────────────────────
describe("second-year computer science students", () => {
  const ex = extractQuery("Give me a list of second-year computer science students", catalog)!;
  it("extracts year filter + a department filter needing resolution", () => {
    expect(ex.entity).toBe("students");
    expect(ex.filters).toContainEqual({ column: "student_year", operator: "eq", value: 2 });
    const dept = ex.filters.find((f) => f.column === "department_id");
    expect(dept?.resolve).toBe(true);
    expect(dept?.rawValue).toBe("computer science");
    expect(ex.responseHint).toBe("LIST");
  });
});

// ── Response strategy + other shapes ─────────────────────────────────────────────
describe("response strategy", () => {
  it("total → KPI", () => {
    const ex = extractQuery("total students", catalog)!;
    expect(ex.responseHint).toBe("KPI");
    expect(decideResponse(ex, students).needsStats).toBe(true);
  });
  it("by department → DISTRIBUTION", () => {
    const ex = extractQuery("students by department", catalog)!;
    expect(ex.responseHint).toBe("DISTRIBUTION");
    expect(ex.groupBy).toBe("department_id");
    expect(decideResponse(ex, students).needsDistribution).toBe(true);
  });
  it("over last 12 months → TREND", () => {
    const ex = extractQuery("fee collection over the last 12 months", catalog)!;
    expect(ex.responseHint).toBe("TREND");
    expect(decideResponse(ex, fees).needsTrend).toBe(true);
  });
  it("vs last year → COMPARISON", () => {
    const ex = extractQuery("compare admissions this year vs last year", catalog)!;
    expect(ex.comparison).toBe(true);
  });
});
