// Phase 5L — Department Budget Management domain model + pure helpers.
// No Supabase imports — unit-testable without mocking.

export type BudgetStatus = "draft" | "submitted" | "approved" | "rejected";

export type BudgetLineCategory =
  | "lab_equipment" | "stationery" | "furniture" | "it_hardware"
  | "software" | "maintenance" | "travel" | "training" | "events" | "other";

export type BudgetLineItem = {
  id: string;
  budget_id: string;
  category: BudgetLineCategory;
  description: string;
  planned_amt: number;
  actual_amt: number;
  created_at: string;
};

export type DepartmentBudget = {
  id: string;
  institution_id: string;
  department_id: string;
  academic_year_id: string;
  total_allocated: number;
  status: BudgetStatus;
  submitted_by: string | null;
  approved_by: string | null;
  admin_notes: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  departments?: { name: string } | null;
  line_items?: BudgetLineItem[];
};

export const BUDGET_STATUSES: BudgetStatus[] = ["draft", "submitted", "approved", "rejected"];

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
};

export const BUDGET_STATUS_COLORS: Record<BudgetStatus, string> = {
  draft:     "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  submitted: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  approved:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  rejected:  "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

export const BUDGET_LINE_CATEGORIES: BudgetLineCategory[] = [
  "lab_equipment", "stationery", "furniture", "it_hardware",
  "software", "maintenance", "travel", "training", "events", "other",
];

export const BUDGET_LINE_CATEGORY_LABELS: Record<BudgetLineCategory, string> = {
  lab_equipment: "Lab Equipment",
  stationery: "Stationery",
  furniture: "Furniture",
  it_hardware: "IT Hardware",
  software: "Software",
  maintenance: "Maintenance",
  travel: "Travel",
  training: "Training",
  events: "Events",
  other: "Other",
};

/**
 * Categories with a direct equivalent in the expense logger's category enum —
 * used to auto-sync `actual_amt` from `expenses`. Categories with no mapping
 * (lab_equipment, furniture, travel, training, software) have no reliable
 * automatic source in the data model and rely on manual entry instead of a
 * fabricated/guessed attribution.
 */
export const CATEGORY_TO_EXPENSE_CATEGORY: Partial<Record<BudgetLineCategory, string>> = {
  stationery: "stationery",
  maintenance: "maintenance",
  events: "events",
  it_hardware: "it",
  other: "other",
};

/** Statuses in which a budget's line items remain editable. */
export const EDITABLE_STATUSES: BudgetStatus[] = ["draft", "rejected"];

export function isBudgetEditable(status: BudgetStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

export function canSubmitBudget(status: BudgetStatus, lineItemCount: number): boolean {
  return EDITABLE_STATUSES.includes(status) && lineItemCount > 0;
}

export function canDecideBudget(status: BudgetStatus): boolean {
  return status === "submitted";
}

export type LineItemVariance = {
  variance: number;
  utilisationPct: number;
  isOverBudget: boolean;
};

export function lineItemVariance(item: { planned_amt: number; actual_amt: number }): LineItemVariance {
  const variance = item.planned_amt - item.actual_amt;
  const utilisationPct = item.planned_amt > 0 ? Math.round((item.actual_amt / item.planned_amt) * 1000) / 10 : 0;
  return { variance, utilisationPct, isOverBudget: item.actual_amt > item.planned_amt };
}

export type BudgetTotals = {
  totalPlanned: number;
  totalActual: number;
  variance: number;
  utilisationPct: number;
};

export function budgetTotals(lineItems: { planned_amt: number; actual_amt: number }[]): BudgetTotals {
  const totalPlanned = lineItems.reduce((s, i) => s + Number(i.planned_amt), 0);
  const totalActual  = lineItems.reduce((s, i) => s + Number(i.actual_amt), 0);
  const variance = totalPlanned - totalActual;
  const utilisationPct = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 1000) / 10 : 0;
  return { totalPlanned, totalActual, variance, utilisationPct };
}

export function budgetsCSV(budgets: DepartmentBudget[]): string {
  const header = ["Department", "Status", "Total Allocated", "Total Actual", "Utilisation %", "Submitted At", "Approved At"];
  const rows = budgets.map((b) => {
    const t = budgetTotals(b.line_items ?? []);
    return [
      b.departments?.name ?? "",
      BUDGET_STATUS_LABELS[b.status],
      String(b.total_allocated),
      String(t.totalActual),
      String(t.utilisationPct),
      b.submitted_at ?? "",
      b.approved_at ?? "",
    ];
  });
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [header, ...rows].map((r) => r.map((c) => esc(String(c))).join(",")).join("\n");
}
