// Phase 7F-sub — NAAC SSR evidence registry.
//
// The single source of truth mapping the seven NAAC criteria to Aura's data.
// Each evidence source is either:
//   status "live"    — the module exists; `table` + `column` tell the
//                      aggregator how to count evidence rows, and
//   status "pending" — the module is on the roadmap but not built yet
//                      (`phase` says where). Pending sources still appear in
//                      the SSR dashboard so the institution sees the FULL
//                      readiness picture, not just what Aura can count today.
//
// Counting modes:
//   column: "institution_id" | "tenant_id" — direct .eq() head count
//   column: "join:attendance"             — attendance has no institution
//            column; counted through attendance → class_schedules →
//            departments (same join the 7C drill-down uses)
//
// When a new module ships, flip its source here from pending → live and the
// SSR dashboard + completeness math pick it up with zero further wiring.

export type SSREvidenceSource = {
  key: string;
  /** What this evidences, with the NAAC metric hint. */
  label: string;
  status: "live" | "pending";
  /** live only: table to count. */
  table?: string;
  /** live only: how to scope the count to an institution. */
  column?: "institution_id" | "tenant_id" | "join:attendance";
  /** pending only: roadmap phase that ships this module. */
  phase?: string;
};

export type SSRCriterion = {
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  title: string;
  description: string;
  sources: SSREvidenceSource[];
};

export const SSR_CRITERIA: SSRCriterion[] = [
  {
    number: 1,
    title: "Curricular Aspects",
    description: "Curriculum design, academic flexibility, enrichment and feedback",
    sources: [
      { key: "subjects", label: "Subjects master (1.1)", status: "live", table: "subjects", column: "institution_id" },
      { key: "curriculum_units", label: "Syllabus & curriculum units (1.1, 1.2)", status: "live", table: "curriculum_units", column: "institution_id" },
      { key: "course_outcomes", label: "Course outcomes defined — OBE (1.1, 1.2)", status: "live", table: "course_outcomes", column: "institution_id" },
      { key: "guest_lectures_c1", label: "Guest lectures & expert talks (1.3)", status: "live", table: "guest_lectures", column: "institution_id" },
      { key: "internships_c1", label: "Internships & field projects (1.2, 1.3)", status: "live", table: "internships", column: "institution_id" },
      { key: "feedback", label: "Curriculum feedback from stakeholders (1.4)", status: "pending", phase: "Phase 6E — Student Feedback & Faculty Ratings" },
    ],
  },
  {
    number: 2,
    title: "Teaching-Learning & Evaluation",
    description: "Enrolment, teaching quality, assessment and learning outcomes",
    sources: [
      { key: "students", label: "Enrolled students (2.1)", status: "live", table: "students", column: "institution_id" },
      { key: "staff", label: "Teaching staff on roll (2.4)", status: "live", table: "staff", column: "institution_id" },
      { key: "attendance", label: "Attendance records (2.2)", status: "live", table: "attendance", column: "join:attendance" },
      { key: "lesson_plans", label: "Lesson plans / teaching diary (2.3)", status: "live", table: "lesson_plans", column: "institution_id" },
      { key: "cia_marks", label: "Continuous internal assessment marks (2.5)", status: "live", table: "cia_marks", column: "institution_id" },
      { key: "exam_results", label: "Exam results & pass outcomes (2.6)", status: "live", table: "exam_results", column: "institution_id" },
      { key: "cia_results", label: "Finalized CIA results (2.6)", status: "live", table: "cia_results", column: "institution_id" },
      { key: "co_po_map", label: "CO/PO attainment mapping — OBE (2.6)", status: "live", table: "co_po_map", column: "institution_id" },
    ],
  },
  {
    number: 3,
    title: "Research, Innovations & Extension",
    description: "Research output, innovation ecosystem and extension activities",
    sources: [
      { key: "publications", label: "Research papers & publications (3.3)", status: "pending", phase: "Phase 5I — Research & Publications Management" },
      { key: "research_projects", label: "Funded research projects (3.1)", status: "pending", phase: "Phase 5I — Research & Publications Management" },
      { key: "extension_activities", label: "Extension & outreach programs (3.4)", status: "pending", phase: "Phase 4H — Student Clubs & Organizations (NSS/NCC)" },
      { key: "guest_lectures_c3", label: "Expert interaction / collaborative events (3.5)", status: "live", table: "guest_lectures", column: "institution_id" },
    ],
  },
  {
    number: 4,
    title: "Infrastructure & Learning Resources",
    description: "Physical, academic and IT infrastructure; library as learning resource",
    sources: [
      // schedules is one of two tables still on the legacy tenant_id column
      { key: "timetable", label: "Classroom & facility utilization via timetable (4.1)", status: "live", table: "schedules", column: "tenant_id" },
      { key: "library", label: "Library automation & volumes (4.2)", status: "pending", phase: "Phase 4A — Library Management System" },
      { key: "labs", label: "Laboratory management (4.1, 4.3)", status: "pending", phase: "Phase 4D — Laboratory Management" },
      { key: "assets", label: "Asset & infrastructure registry (4.4)", status: "pending", phase: "Phase 4E — Asset & Inventory Management" },
      { key: "sports_infra", label: "Sports & physical education facilities (4.1)", status: "pending", phase: "Phase 4J — Sports & Physical Education" },
    ],
  },
  {
    number: 5,
    title: "Student Support & Progression",
    description: "Scholarships, guidance, placements, progression and alumni",
    sources: [
      { key: "fee_concessions", label: "Fee concessions & freeships (5.1)", status: "live", table: "fee_concessions", column: "institution_id" },
      { key: "internships_c5", label: "Internships & industrial training (5.2)", status: "live", table: "internships", column: "institution_id" },
      { key: "promotions", label: "Student progression / promotion records (5.2)", status: "live", table: "promotion_logs", column: "institution_id" },
      { key: "scholarships", label: "Government & institutional scholarships (5.1)", status: "pending", phase: "Phase 5G — Scholarship Management" },
      { key: "placements", label: "Placement & career services (5.2)", status: "pending", phase: "Phase 5F — Placement Cell" },
      { key: "alumni", label: "Alumni engagement (5.4)", status: "pending", phase: "Phase 5D — Alumni System" },
    ],
  },
  {
    number: 6,
    title: "Governance, Leadership & Management",
    description: "Institutional vision, governance, faculty empowerment, financial management and IQAC",
    sources: [
      { key: "members", label: "Role-based governance structure (6.1)", status: "live", table: "institution_members", column: "institution_id" },
      { key: "audit_logs", label: "Tamper-evident audit trail (6.2, 6.5)", status: "live", table: "audit_logs", column: "institution_id" },
      { key: "leave_requests", label: "Staff welfare & HR workflows (6.3)", status: "live", table: "leave_requests", column: "institution_id" },
      { key: "salary", label: "Payroll & financial governance (6.4)", status: "live", table: "salary_disbursements", column: "institution_id" },
      { key: "iqac_meetings", label: "IQAC meetings, minutes & action items (6.5)", status: "pending", phase: "Phase 7F-sub2 — IQAC Meeting & Action Tracker" },
      { key: "budgets", label: "Department budget planning (6.4)", status: "live", table: "department_budgets", column: "institution_id" },
      { key: "grievances", label: "Grievance redressal mechanism (6.2)", status: "live", table: "grievances", column: "institution_id" },
      { key: "appraisals", label: "Staff appraisals & workload reports (6.3)", status: "pending", phase: "Phase 5E — Staff Appraisal" },
    ],
  },
  {
    number: 7,
    title: "Institutional Values & Best Practices",
    description: "Gender equity, environment, inclusivity, best practices and distinctiveness",
    sources: [
      { key: "guest_lectures_c7", label: "Value-education events & talks (7.1)", status: "live", table: "guest_lectures", column: "institution_id" },
      { key: "privacy", label: "DPDP data-privacy compliance — best practice (7.2)", status: "live", table: "data_consent_logs", column: "institution_id" },
      { key: "mous", label: "MOUs & industry collaborations (7.1)", status: "pending", phase: "Phase 6H — Industry Connect & MOU Management" },
      { key: "clubs", label: "NSS / NCC / cultural activity records (7.1)", status: "pending", phase: "Phase 4H — Student Clubs & Organizations" },
    ],
  },
];

/** Flat list of live sources (what the aggregator actually counts). */
export function liveSources(): (SSREvidenceSource & { criterion: number })[] {
  return SSR_CRITERIA.flatMap((c) =>
    c.sources.filter((s) => s.status === "live").map((s) => ({ ...s, criterion: c.number }))
  );
}
