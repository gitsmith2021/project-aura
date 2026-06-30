// CF-3.1 — Evaluation catalog fixture.
//
// Mirrors the production CF-2 entity registry (data_explorer_entities) so the
// evaluation suite exercises the deterministic pipeline against the REAL entity
// shapes — without a database. Keep in sync with supabase/migrations/*_cf*_*entit*.
// Columns reflect what each registered entity actually exposes.

import type { EntityDef, ColumnType } from "@/lib/dataExplorer";

type C = EntityDef["columns"][number];
const c = (key: string, label: string, type: ColumnType, f = true, g = false, a = false): C =>
  ({ key, label, type, filterable: f, groupable: g, aggregatable: a });

const E = (key: string, label: string, category: string, source: string, columns: C[], defaultDateField: string | null, sortOrder: number): EntityDef =>
  ({ key, label, category, source, columns, defaultDateField, sortOrder });

export const EVAL_CATALOG: EntityDef[] = [
  E("students", "Students", "People", "students", [
    c("full_name", "Name", "text"), c("roll_no", "Roll No", "text"),
    c("student_program", "Program", "text", true, true), c("student_year", "Year", "number", true, true, true),
    c("department_id", "Department", "text", true, true), c("is_active", "Active", "boolean", true, true), c("created_at", "Enrolled On", "date"),
  ], "created_at", 1),
  E("staff", "Faculty & Staff", "People", "staff", [
    c("full_name", "Name", "text"), c("email", "Email", "text"), c("staff_type", "Staff Type", "text", true, true),
    c("department_id", "Department", "text", true, true), c("is_active", "Active", "boolean", true, true), c("created_at", "Joined On", "date"),
  ], "created_at", 2),
  E("staff_salary", "Staff Salary", "Finance", "staff_salary", [
    c("full_name", "Name", "text"), c("employee_id", "Employee ID", "text"), c("designation", "Designation", "text", true, true),
    c("staff_type", "Staff Type", "text", true, true), c("department_id", "Department", "text", true, true),
    c("net_salary", "Net Salary", "number", true, false, true), c("basic_salary", "Basic Salary", "number", true, false, true), c("is_active", "Active", "boolean", true, true),
  ], null, 20),
  E("admissions", "Admissions", "Admissions", "admissions", [
    c("applicant_name", "Applicant", "text"), c("program_applied", "Program", "text", true, true),
    c("status", "Status", "text", true, true), c("marks_percentage", "Marks %", "number", true, false, true), c("applied_at", "Applied On", "date"),
  ], "applied_at", 3),
  E("fee_payments", "Fee Payments", "Finance", "fee_payments", [
    c("amount_paid", "Amount", "number", true, false, true), c("payment_mode", "Mode", "text", true, true),
    c("payment_status", "Status", "text", true, true), c("paid_at", "Paid On", "date"),
  ], "paid_at", 4),
  E("departments", "Departments", "Academics", "departments", [
    c("name", "Department", "text", true, true), c("funding_type", "Funding", "text", true, true), c("created_at", "Created On", "date"),
  ], "created_at", 5),
  E("student_attendance", "Student Attendance", "Academics", "student_attendance_summary", [
    c("full_name", "Name", "text"), c("roll_no", "Roll No", "text"), c("student_program", "Program", "text", true, true),
    c("department_id", "Department", "text", true, true), c("attendance_pct", "Attendance %", "number", true, false, true),
    c("sessions_held", "Sessions Held", "number", true, false, true), c("sessions_attended", "Attended", "number", true, false, true),
  ], null, 6),
  E("placements", "Placements", "Placements", "placement_summary", [
    c("company", "Company", "text", true, true), c("job_role", "Role", "text", true, true), c("stage_status", "Stage", "text", true, true),
    c("placed", "Placed", "boolean", true, true), c("offer_ctc", "Offer CTC", "number", true, false, true), c("drive_date", "Drive Date", "date"),
  ], "drive_date", 7),
  E("scholarships", "Scholarships", "Finance", "scholarship_summary", [
    c("scheme", "Scheme", "text", true, true), c("scheme_type", "Type", "text", true, true), c("status", "Status", "text", true, true),
    c("disbursed_amount", "Disbursed", "number", true, false, true), c("application_date", "Applied On", "date"),
  ], "application_date", 8),
  E("results", "Exam Results", "Academics", "exam_results", [
    c("subject_name", "Subject", "text", true, true), c("semester", "Semester", "number", true, true, true), c("grade", "Grade", "text", true, true),
    c("is_arrear", "Arrear", "boolean", true, true), c("marks_scored", "Marks", "number", true, false, true),
  ], null, 9),
  E("payroll", "Payroll", "Finance", "salary_disbursements", [
    c("month", "Month", "text", true, true), c("status", "Status", "text", true, true), c("payment_mode", "Mode", "text", true, true),
    c("amount_disbursed", "Amount", "number", true, false, true), c("disbursed_at", "Disbursed On", "date"),
  ], "disbursed_at", 10),
  E("budgets", "Department Budgets", "Finance", "department_budgets", [
    c("department_id", "Department", "text", true, true), c("status", "Status", "text", true, true), c("total_allocated", "Allocated", "number", true, false, true),
  ], null, 11),
  E("expenses", "Expenses", "Finance", "expenses", [
    c("category", "Category", "text", true, true), c("department_id", "Department", "text", true, true), c("payment_mode", "Mode", "text", true, true),
    c("vendor_name", "Vendor", "text"), c("amount", "Amount", "number", true, false, true), c("expense_date", "Date", "date"),
  ], "expense_date", 12),
  E("iqac", "IQAC Meetings", "Compliance", "iqac_meetings", [
    c("status", "Status", "text", true, true), c("academic_year_id", "Academic Year", "text", true, true), c("meeting_date", "Meeting Date", "date"),
  ], "meeting_date", 13),
  E("iqac_actions", "IQAC Action Items", "Compliance", "iqac_actions_summary", [
    c("status", "Status", "text", true, true), c("due_date", "Due Date", "date"), c("resolved_at", "Resolved On", "date"),
  ], "due_date", 14),
  E("research", "Research Projects", "Academics", "research_projects", [
    c("status", "Status", "text", true, true), c("funding_agency", "Funding Agency", "text", true, true), c("department_id", "Department", "text", true, true),
    c("funding_amount", "Funding", "number", true, false, true), c("funding_spent", "Spent", "number", true, false, true), c("start_date", "Start Date", "date"),
  ], "start_date", 15),
  E("publications", "Publications", "Academics", "publications", [
    c("pub_type", "Type", "text", true, true), c("pub_year", "Year", "number", true, true, true), c("scopus_indexed", "Scopus", "boolean", true, true),
    c("ugc_listed", "UGC-CARE", "boolean", true, true), c("impact_factor", "Impact Factor", "number", true, false, true), c("journal_name", "Journal", "text"),
  ], null, 16),
  E("alumni", "Alumni", "People", "alumni", [
    c("graduation_year", "Batch Year", "number", true, true, true), c("program", "Program", "text", true, true), c("department_id", "Department", "text", true, true),
    c("current_employer", "Employer", "text"), c("city", "City", "text", true, true), c("is_active", "Active", "boolean", true, true),
  ], null, 17),
];
