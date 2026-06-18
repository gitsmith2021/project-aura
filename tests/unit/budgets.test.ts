import { describe, it, expect } from "vitest";
import {
  isBudgetEditable, canSubmitBudget, canDecideBudget,
  lineItemVariance, budgetTotals, budgetsCSV,
  BUDGET_STATUS_LABELS, BUDGET_LINE_CATEGORY_LABELS,
  type DepartmentBudget, type BudgetLineItem,
} from "@/lib/budgets";

function item(over: Partial<BudgetLineItem>): BudgetLineItem {
  return {
    id: Math.random().toString(36).slice(2),
    budget_id: "b1",
    category: "stationery",
    description: "Notebooks",
    planned_amt: 1000,
    actual_amt: 0,
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

function budget(over: Partial<DepartmentBudget>): DepartmentBudget {
  return {
    id: "b1",
    institution_id: "i1",
    department_id: "d1",
    academic_year_id: "ay1",
    total_allocated: 1000,
    status: "draft",
    submitted_by: null,
    approved_by: null,
    admin_notes: null,
    submitted_at: null,
    approved_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    departments: { name: "Computer Science" },
    line_items: [],
    ...over,
  };
}

describe("isBudgetEditable / canSubmitBudget / canDecideBudget", () => {
  it("draft and rejected are editable; submitted and approved are not", () => {
    expect(isBudgetEditable("draft")).toBe(true);
    expect(isBudgetEditable("rejected")).toBe(true);
    expect(isBudgetEditable("submitted")).toBe(false);
    expect(isBudgetEditable("approved")).toBe(false);
  });

  it("can only submit an editable budget with at least one line item", () => {
    expect(canSubmitBudget("draft", 1)).toBe(true);
    expect(canSubmitBudget("draft", 0)).toBe(false);
    expect(canSubmitBudget("submitted", 1)).toBe(false);
    expect(canSubmitBudget("rejected", 2)).toBe(true);
  });

  it("can only decide on a submitted budget", () => {
    expect(canDecideBudget("submitted")).toBe(true);
    expect(canDecideBudget("draft")).toBe(false);
    expect(canDecideBudget("approved")).toBe(false);
  });
});

describe("lineItemVariance", () => {
  it("computes variance and utilisation when under budget", () => {
    const v = lineItemVariance({ planned_amt: 1000, actual_amt: 600 });
    expect(v.variance).toBe(400);
    expect(v.utilisationPct).toBe(60);
    expect(v.isOverBudget).toBe(false);
  });

  it("flags over-budget items with negative variance", () => {
    const v = lineItemVariance({ planned_amt: 1000, actual_amt: 1200 });
    expect(v.variance).toBe(-200);
    expect(v.utilisationPct).toBe(120);
    expect(v.isOverBudget).toBe(true);
  });

  it("returns 0% utilisation when nothing is planned", () => {
    const v = lineItemVariance({ planned_amt: 0, actual_amt: 0 });
    expect(v.utilisationPct).toBe(0);
    expect(v.isOverBudget).toBe(false);
  });
});

describe("budgetTotals", () => {
  it("sums planned/actual across line items", () => {
    const t = budgetTotals([
      item({ planned_amt: 1000, actual_amt: 500 }),
      item({ planned_amt: 2000, actual_amt: 2500 }),
    ]);
    expect(t.totalPlanned).toBe(3000);
    expect(t.totalActual).toBe(3000);
    expect(t.variance).toBe(0);
    expect(t.utilisationPct).toBe(100);
  });

  it("returns zeroed totals for an empty list", () => {
    const t = budgetTotals([]);
    expect(t.totalPlanned).toBe(0);
    expect(t.totalActual).toBe(0);
    expect(t.utilisationPct).toBe(0);
  });
});

describe("budgetsCSV", () => {
  it("includes a header row and one row per budget", () => {
    const csv = budgetsCSV([
      budget({ status: "approved", total_allocated: 5000, line_items: [item({ planned_amt: 5000, actual_amt: 3000 })] }),
    ]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Department");
    expect(lines[1]).toContain("Computer Science");
    expect(lines[1]).toContain(BUDGET_STATUS_LABELS.approved);
  });

  it("escapes quotes in department names", () => {
    const csv = budgetsCSV([budget({ departments: { name: 'Sciences "Block A"' } })]);
    expect(csv).toContain('"Sciences ""Block A"""');
  });
});

describe("category labels", () => {
  it("covers every defined budget line category", () => {
    expect(BUDGET_LINE_CATEGORY_LABELS.lab_equipment).toBe("Lab Equipment");
    expect(BUDGET_LINE_CATEGORY_LABELS.it_hardware).toBe("IT Hardware");
    expect(Object.keys(BUDGET_LINE_CATEGORY_LABELS)).toHaveLength(10);
  });
});
