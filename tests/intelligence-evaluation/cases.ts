// CF-3.1 — Executive question library for the evaluation suite.
//
// Each case encodes the REALISTIC expectation for the deterministic pipeline
// (extract → plan → response strategy) over the real entity catalog. Tiers:
//   • core     — high-value, unambiguous; asserted individually (must pass).
//   • extended — counted toward the accuracy baseline (must not regress).
//   • gap      — known limitations (missing entity/dimension/routing); NOT
//                asserted, only reported — this IS the improvement roadmap.
//
// Grow this toward 300–500. Adding a case that fails lowers the measured rate,
// surfacing exactly where Aura needs to improve.

import type { FilterOperator } from "@/lib/dataExplorer";
import type { ResponseType } from "@/lib/intelligence/types";

export type ExpectFilter = { column: string; operator: FilterOperator; value?: unknown };

export type EvalCase = {
  q: string;
  domain: string;
  tier: "core" | "extended" | "gap";
  entity: string;
  responseType: ResponseType;
  filters?: ExpectFilter[];
  groupBy?: string;
  sortDir?: "asc" | "desc";
  resolveDept?: string;     // expect a department_id filter (resolve) with this rawValue
  note?: string;
};

export const CASES: EvalCase[] = [
  // ── Admissions ──────────────────────────────────────────────────────────────
  { q: "How many admissions this year?", domain: "Admissions", tier: "core", entity: "admissions", responseType: "KPI" },
  { q: "Admissions by program", domain: "Admissions", tier: "core", entity: "admissions", responseType: "DISTRIBUTION", groupBy: "program_applied" },
  { q: "Pending admissions", domain: "Admissions", tier: "core", entity: "admissions", responseType: "LIST", filters: [{ column: "status", operator: "eq", value: "pending" }] },
  { q: "Applicants with marks above 90", domain: "Admissions", tier: "core", entity: "admissions", responseType: "LIST", filters: [{ column: "marks_percentage", operator: "gt", value: 90 }] },
  { q: "Compare admissions this year vs last year", domain: "Admissions", tier: "core", entity: "admissions", responseType: "COMPARISON" },
  { q: "List all admissions", domain: "Admissions", tier: "extended", entity: "admissions", responseType: "LIST" },
  { q: "Admissions by status", domain: "Admissions", tier: "extended", entity: "admissions", responseType: "DISTRIBUTION", groupBy: "status" },
  { q: "How many applications do we have?", domain: "Admissions", tier: "extended", entity: "admissions", responseType: "KPI" },
  { q: "Admissions with marks below 50", domain: "Admissions", tier: "extended", entity: "admissions", responseType: "LIST", filters: [{ column: "marks_percentage", operator: "lt", value: 50 }] },
  { q: "Approved admissions", domain: "Admissions", tier: "extended", entity: "admissions", responseType: "LIST", filters: [{ column: "status", operator: "eq", value: "approved" }] },
  { q: "Admissions by district", domain: "Admissions", tier: "gap", entity: "admissions", responseType: "LIST", note: "no district dimension on admissions" },
  { q: "Top five courses", domain: "Admissions", tier: "gap", entity: "", responseType: "LIST", note: "no course entity" },

  // ── Fee Collection ──────────────────────────────────────────────────────────
  { q: "Total fee collection", domain: "Fee", tier: "core", entity: "fee_payments", responseType: "KPI" },
  { q: "Fee collection by mode", domain: "Fee", tier: "core", entity: "fee_payments", responseType: "DISTRIBUTION", groupBy: "payment_mode" },
  { q: "Payments above ₹50,000", domain: "Fee", tier: "core", entity: "fee_payments", responseType: "LIST", filters: [{ column: "amount_paid", operator: "gt", value: 50000 }] },
  { q: "Fee collection over the last 12 months", domain: "Fee", tier: "core", entity: "fee_payments", responseType: "TREND" },
  { q: "Show all fee payments", domain: "Fee", tier: "extended", entity: "fee_payments", responseType: "LIST" },
  { q: "Fee payments by status", domain: "Fee", tier: "extended", entity: "fee_payments", responseType: "DISTRIBUTION", groupBy: "payment_status" },
  { q: "Compare fee collection with last year", domain: "Fee", tier: "extended", entity: "fee_payments", responseType: "COMPARISON" },
  { q: "Payments below ₹1,000", domain: "Fee", tier: "extended", entity: "fee_payments", responseType: "LIST", filters: [{ column: "amount_paid", operator: "lt", value: 1000 }] },
  { q: "Outstanding fees this semester", domain: "Fee", tier: "gap", entity: "", responseType: "LIST", note: "fee demands/dues not exposed as an entity" },
  { q: "Students owing more than ₹50,000", domain: "Fee", tier: "gap", entity: "students", responseType: "LIST", note: "dues not modeled; routes to students" },

  // ── Faculty salary ──────────────────────────────────────────────────────────
  { q: "Faculty earning below ₹20,000", domain: "Faculty", tier: "core", entity: "staff_salary", responseType: "LIST", filters: [{ column: "net_salary", operator: "lt", value: 20000 }] },
  { q: "Staff drawing salary less than ₹10,000", domain: "Faculty", tier: "core", entity: "staff_salary", responseType: "LIST", filters: [{ column: "net_salary", operator: "lt", value: 10000 }] },
  { q: "Average salary by department", domain: "Faculty", tier: "core", entity: "staff_salary", responseType: "DISTRIBUTION", groupBy: "department_id" },
  { q: "Highest paid staff", domain: "Faculty", tier: "core", entity: "staff_salary", responseType: "LIST", sortDir: "desc" },
  { q: "Staff salary above ₹50,000", domain: "Faculty", tier: "extended", entity: "staff_salary", responseType: "LIST", filters: [{ column: "net_salary", operator: "gt", value: 50000 }] },
  { q: "Salary by designation", domain: "Faculty", tier: "extended", entity: "staff_salary", responseType: "DISTRIBUTION", groupBy: "designation" },
  { q: "Lowest paid employees", domain: "Faculty", tier: "extended", entity: "staff_salary", responseType: "LIST", sortDir: "asc" },

  // ── Faculty headcount ───────────────────────────────────────────────────────
  { q: "How many faculty do we have?", domain: "Faculty", tier: "core", entity: "staff", responseType: "KPI" },
  { q: "Faculty by department", domain: "Faculty", tier: "core", entity: "staff", responseType: "DISTRIBUTION", groupBy: "department_id" },
  { q: "List all staff", domain: "Faculty", tier: "extended", entity: "staff", responseType: "LIST" },
  { q: "Staff by type", domain: "Faculty", tier: "extended", entity: "staff", responseType: "DISTRIBUTION", groupBy: "staff_type" },

  // ── Attendance ──────────────────────────────────────────────────────────────
  { q: "Students below 75% attendance", domain: "Attendance", tier: "core", entity: "student_attendance", responseType: "LIST", filters: [{ column: "attendance_pct", operator: "lt", value: 75 }] },
  { q: "Students with attendance below 75%", domain: "Attendance", tier: "core", entity: "student_attendance", responseType: "LIST", filters: [{ column: "attendance_pct", operator: "lt", value: 75 }] },
  { q: "Top attendance", domain: "Attendance", tier: "core", entity: "student_attendance", responseType: "LIST", sortDir: "desc" },
  { q: "Lowest attendance", domain: "Attendance", tier: "core", entity: "student_attendance", responseType: "LIST", sortDir: "asc" },
  { q: "Attendance by department", domain: "Attendance", tier: "extended", entity: "student_attendance", responseType: "DISTRIBUTION", groupBy: "department_id" },
  { q: "Students above 90% attendance", domain: "Attendance", tier: "extended", entity: "student_attendance", responseType: "LIST", filters: [{ column: "attendance_pct", operator: "gt", value: 90 }] },

  // ── Students ────────────────────────────────────────────────────────────────
  { q: "Total students", domain: "Students", tier: "core", entity: "students", responseType: "KPI" },
  { q: "Students by department", domain: "Students", tier: "core", entity: "students", responseType: "DISTRIBUTION", groupBy: "department_id" },
  { q: "Give me a list of second-year computer science students", domain: "Students", tier: "core", entity: "students", responseType: "LIST", filters: [{ column: "student_year", operator: "eq", value: 2 }], resolveDept: "computer science" },
  { q: "Students by program", domain: "Students", tier: "extended", entity: "students", responseType: "DISTRIBUTION", groupBy: "student_program" },
  { q: "How many students do we have?", domain: "Students", tier: "extended", entity: "students", responseType: "KPI" },
  { q: "Third year students", domain: "Students", tier: "extended", entity: "students", responseType: "LIST", filters: [{ column: "student_year", operator: "eq", value: 3 }] },

  // ── Academics / results ─────────────────────────────────────────────────────
  { q: "Exam results by grade", domain: "Academics", tier: "core", entity: "results", responseType: "DISTRIBUTION", groupBy: "grade" },
  { q: "Results by semester", domain: "Academics", tier: "extended", entity: "results", responseType: "DISTRIBUTION", groupBy: "semester" },
  { q: "Students with arrears", domain: "Academics", tier: "gap", entity: "students", responseType: "LIST", note: "arrear flag lives on results; routes to students" },
  { q: "Pass percentage", domain: "Academics", tier: "gap", entity: "", responseType: "KPI", note: "no pass metric exposed" },
  { q: "CIA failures", domain: "Academics", tier: "gap", entity: "", responseType: "LIST", note: "CIA not registered as an entity" },

  // ── Placements ──────────────────────────────────────────────────────────────
  { q: "Highest placement package", domain: "Placements", tier: "core", entity: "placements", responseType: "LIST", sortDir: "desc" },
  { q: "Placements by company", domain: "Placements", tier: "core", entity: "placements", responseType: "DISTRIBUTION", groupBy: "company" },
  { q: "Offers above 10 lakh", domain: "Placements", tier: "core", entity: "placements", responseType: "LIST", filters: [{ column: "offer_ctc", operator: "gt", value: 1000000 }] },
  { q: "List all placements", domain: "Placements", tier: "extended", entity: "placements", responseType: "LIST" },
  { q: "Placements by stage", domain: "Placements", tier: "extended", entity: "placements", responseType: "DISTRIBUTION", groupBy: "stage_status" },
  { q: "Placement by department", domain: "Placements", tier: "gap", entity: "placements", responseType: "LIST", note: "placement summary has no department dimension" },

  // ── Scholarships ────────────────────────────────────────────────────────────
  { q: "Pending scholarship approvals", domain: "Scholarships", tier: "core", entity: "scholarships", responseType: "LIST", filters: [{ column: "status", operator: "eq", value: "pending" }] },
  { q: "Scholarships by scheme", domain: "Scholarships", tier: "core", entity: "scholarships", responseType: "DISTRIBUTION", groupBy: "scheme" },
  { q: "Scholarships by type", domain: "Scholarships", tier: "extended", entity: "scholarships", responseType: "DISTRIBUTION", groupBy: "scheme_type" },
  { q: "Approved scholarships", domain: "Scholarships", tier: "extended", entity: "scholarships", responseType: "LIST", filters: [{ column: "status", operator: "eq", value: "approved" }] },

  // ── Research / publications ─────────────────────────────────────────────────
  { q: "Research projects by department", domain: "Research", tier: "core", entity: "research", responseType: "DISTRIBUTION", groupBy: "department_id" },
  { q: "Research by status", domain: "Research", tier: "extended", entity: "research", responseType: "DISTRIBUTION", groupBy: "status" },
  { q: "Research funding above 10 lakh", domain: "Research", tier: "extended", entity: "research", responseType: "LIST", filters: [{ column: "funding_amount", operator: "gt", value: 1000000 }] },
  { q: "Publications by year", domain: "Research", tier: "core", entity: "publications", responseType: "DISTRIBUTION", groupBy: "pub_year" },
  { q: "Publications by type", domain: "Research", tier: "extended", entity: "publications", responseType: "DISTRIBUTION", groupBy: "pub_type" },

  // ── IQAC ────────────────────────────────────────────────────────────────────
  { q: "IQAC meetings by status", domain: "IQAC", tier: "core", entity: "iqac", responseType: "DISTRIBUTION", groupBy: "status" },
  { q: "IQAC action items by status", domain: "IQAC", tier: "extended", entity: "iqac_actions", responseType: "DISTRIBUTION", groupBy: "status" },
  { q: "Pending NAAC evidence", domain: "IQAC", tier: "gap", entity: "", responseType: "LIST", note: "NAAC evidence not modeled as a queryable entity" },

  // ── Knowledge Hub ───────────────────────────────────────────────────────────
  { q: "Resources uploaded this month", domain: "KnowledgeHub", tier: "gap", entity: "", responseType: "LIST", note: "knowledge resources not registered as a CF-2 entity" },

  // ── Payroll / budgets / expenses / alumni ───────────────────────────────────
  { q: "Payroll by month", domain: "Payroll", tier: "core", entity: "payroll", responseType: "TREND", note: "'by month' is temporal → trend" },
  { q: "Total payroll", domain: "Payroll", tier: "extended", entity: "payroll", responseType: "KPI" },
  { q: "Department budgets by status", domain: "Budget", tier: "core", entity: "budgets", responseType: "DISTRIBUTION", groupBy: "status" },
  { q: "Expenses by category", domain: "Budget", tier: "core", entity: "expenses", responseType: "DISTRIBUTION", groupBy: "category" },
  { q: "Expenses above ₹1,00,000", domain: "Budget", tier: "extended", entity: "expenses", responseType: "LIST", filters: [{ column: "amount", operator: "gt", value: 100000 }] },
  { q: "Alumni by batch year", domain: "Alumni", tier: "extended", entity: "alumni", responseType: "DISTRIBUTION", groupBy: "graduation_year" },
  { q: "Alumni by city", domain: "Alumni", tier: "extended", entity: "alumni", responseType: "DISTRIBUTION", groupBy: "city" },
];
