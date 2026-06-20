// ─────────────────────────────────────────────────────────────
// Data Retention Policy Registry — DPDP Act 2023 (Phase 2.5B)
//
// Single source of truth for how long each category of personal
// data is kept. Rendered on /privacy-policy and the admin
// compliance page. Dev Rule 15: every new table that stores PII
// must register its retention period here.
// ─────────────────────────────────────────────────────────────

export type RetentionPolicy = {
  /** Stable key, kebab-case */
  key: string;
  /** Human-readable category shown on the privacy policy page */
  category: string;
  /** Tables covered by this policy */
  tables: string[];
  /** Retention period, human readable */
  period: string;
  /** Retention period in years (null = retained while account is active) */
  years: number | null;
  /** Legal / operational basis for keeping the data this long */
  basis: string;
};

export const RETENTION_POLICIES: RetentionPolicy[] = [
  {
    key: "financial-records",
    category: "Financial records (fees, payments, salaries, expenses)",
    tables: [
      "fee_payments", "fee_structures", "fee_concessions",
      "salary_disbursements", "expenses", "razorpay_webhook_events",
      "monthly_statutory_deductions", "staff_tax_declarations", "statutory_payroll_config",
    ],
    period: "7 years after the financial year they belong to",
    years: 7,
    basis: "Income Tax Act 1961 & GST record-keeping requirements",
  },
  {
    key: "academic-records",
    category: "Academic records (marks, results, promotions, hall tickets)",
    tables: [
      "exam_results", "cia_marks", "cia_results", "student_promotions", "exam_schedules",
    ],
    period: "Duration of enrolment + 7 years (transcripts permanently)",
    years: 7,
    basis: "UGC record-retention norms; alumni transcript & verification requests",
  },
  {
    key: "attendance-records",
    category: "Attendance records (NFC + manual)",
    tables: ["attendance_sessions", "attendance_records"],
    period: "3 years after the academic year ends",
    years: 3,
    basis: "NAAC/UGC audit window for attendance-linked eligibility",
  },
  {
    key: "medical-records",
    category: "Medical & infirmary records",
    tables: ["medical_records", "medical_visits"],
    period: "5 years after the last entry",
    years: 5,
    basis: "Standard medical record-keeping practice for minors and adults",
  },
  {
    key: "identity-profile",
    category: "Identity & profile data (name, DOB, contact, photos)",
    tables: ["students", "staff", "profiles", "institution_members"],
    period: "While the account is active; erased on approved erasure request",
    years: null,
    basis: "Required to provide the service; DPDP right to erasure applies",
  },
  {
    key: "biometric-nfc",
    category: "NFC card identifiers (no fingerprint/face data is stored)",
    tables: ["staff_mobile_devices", "nfc card registry (Phase 4F)"],
    period: "Until the card is deactivated or consent is withdrawn",
    years: null,
    basis: "Consent-based (biometric_nfc); deactivated immediately on withdrawal",
  },
  {
    key: "consent-erasure-logs",
    category: "Consent & erasure request logs",
    tables: ["data_consent_logs", "data_erasure_requests"],
    period: "3 years after account closure",
    years: 3,
    basis: "Proof of DPDP compliance — demonstrating consent existed is itself a legal obligation",
  },
  {
    key: "notifications",
    category: "In-app notifications & alerts",
    tables: ["notifications"],
    period: "1 year after creation",
    years: 1,
    basis: "Transient operational alerts (fee/leave/attendance/results) — not a system of record; the underlying records are retained under their own policy",
  },
  {
    key: "admissions-prospects",
    category: "Prospective applicant data (admission enquiries & applications)",
    tables: ["admission_enquiries", "admissions"],
    period: "3 years after the admission cycle; converted applicants migrate to identity-profile",
    years: 3,
    basis: "Lead nurturing and audit of the admission process; data of applicants who enrol becomes part of their student identity record (identity-profile)",
  },
  {
    key: "notices",
    category: "Notice board announcements",
    tables: ["notices"],
    period: "Until expiry; then up to 1 year for reference",
    years: 1,
    basis: "Institutional announcements (minimal personal data — only the poster's id). Auto-expire via expires_at; retained briefly for reference",
  },
  {
    key: "parents",
    category: "Parent accounts & parent-student links",
    tables: ["parents", "parent_student_links"],
    period: "While the linked child is enrolled; erased on approved erasure request",
    years: null,
    basis: "Parent/guardian contact for academic communication and fee notices; DPDP right to erasure applies",
  },
  {
    key: "feedback",
    category: "Student feedback & faculty ratings (anonymous)",
    tables: ["feedback_forms", "feedback_responses", "feedback_submissions"],
    period: "5 years after the academic year",
    years: 5,
    basis: "NAAC Criterion 2.6 (student satisfaction) & teaching-quality evidence. Responses store NO student identity; the participation ledger (feedback_submissions) records only that a student submitted, never linked to their answers",
  },
  {
    key: "iqac",
    category: "IQAC meeting & action-taken records",
    tables: ["iqac_meetings", "iqac_action_items"],
    period: "Retained permanently as part of the institutional governance record",
    years: null,
    basis: "NAAC Criterion 6.1 evidence (IQAC meetings, agendas, minutes & action-taken reports) required across accreditation cycles; minimal personal data (staff references only)",
  },
  {
    key: "subscription-billing",
    category: "SaaS subscription & billing records (plans, subscriptions, invoices)",
    tables: ["subscription_plans", "institution_subscriptions", "subscription_invoices"],
    period: "7 years after the financial year they belong to",
    years: 7,
    basis: "Income Tax Act 1961 & GST record-keeping for the platform's own SaaS revenue (plans hold no personal data; invoices link to the institution, not an individual)",
  },
  {
    key: "industry-connect",
    category: "Industry MOUs & partnership activity records",
    tables: ["mou_partners", "industry_interactions"],
    period: "Retained permanently as part of the institutional partnership record",
    years: null,
    basis: "NAAC Criterion 7.1 (Institutional Values & Social Responsibility) evidence and ongoing/renewable partnership history; contact details retained while the MOU is on record",
  },
  {
    key: "lms",
    category: "E-learning records (study materials, assignments & submissions)",
    tables: ["study_materials", "lms_assignments", "lms_submissions"],
    period: "Duration of enrolment + 3 years after the academic year",
    years: 3,
    basis: "Internal-assessment evidence (NAAC Criterion 2.5) and re-evaluation window; uploaded student submission files are a record of assessed work",
  },
  {
    key: "online-exams",
    category: "Online examination records (attempts, answers & integrity logs)",
    tables: ["online_exams", "online_exam_questions", "online_exam_sessions", "online_exam_answers", "online_exam_violations"],
    period: "Duration of enrolment + 3 years after the academic year",
    years: 3,
    basis: "Internal-assessment evidence (NAAC Criterion 2.5) and re-evaluation/integrity-dispute window; anti-cheating violation logs support fair-conduct audits",
  },
  {
    key: "certificates",
    category: "Certificate & document requests (bonafide, TC, experience letters, etc.)",
    tables: ["certificate_requests"],
    period: "7 years after issuance",
    years: 7,
    basis: "Issued certificates are official institutional records subject to verification requests; UGC/NAAC document-retention norms",
  },
  {
    key: "transport",
    category: "Transport records (vehicles, drivers, routes & student allocations)",
    tables: ["vehicles", "bus_routes", "transport_allocations"],
    period: "While the vehicle/route is in service; allocations kept for the academic year + 1 year",
    years: 1,
    basis: "Operational fleet management and student safety/boarding records; driver contact details are retained only while the driver is engaged",
  },
  {
    key: "staff-attendance",
    category: "Staff daily attendance records",
    tables: ["staff_attendance"],
    period: "5 years (payroll & LOP audit window)",
    years: 5,
    basis: "Payroll accuracy / Loss-of-Pay computation, leave reconciliation and NAAC Criterion 2.4 teacher-attendance evidence",
  },
  {
    key: "research",
    category: "Research records (projects, publications & grants)",
    tables: ["research_projects", "publications"],
    period: "Retained permanently as part of the institutional research record",
    years: null,
    basis: "NAAC Criterion 3 (Research, Innovation & Extension) & NIRF reporting; publications are a permanent academic-output record",
  },
  {
    key: "disciplinary",
    category: "Disciplinary & anti-ragging records (incidents & committee actions)",
    tables: ["disciplinary_incidents", "disciplinary_actions"],
    period: "7 years after resolution; anonymous reports store no complainant identity",
    years: 7,
    basis: "UGC anti-ragging regulations (2009) & NAAC Criterion 6.2 grievance/disciplinary evidence; anonymous reports never store the reporter's identity",
  },
  {
    key: "grievances",
    category: "Grievance redressal records (complaints & resolutions)",
    tables: ["grievances"],
    period: "7 years after resolution; anonymous grievances store no complainant identity",
    years: 7,
    basis: "NAAC Criterion 6.2 (grievance redressal mechanism evidence) & UGC norms; anonymous submissions (harassment/ragging) never store the complainant's identity",
  },
  {
    key: "scholarships",
    category: "Scholarship records (schemes, applications & proof documents)",
    tables: ["scholarship_schemes", "scholarship_applications"],
    period: "8 years after disbursement",
    years: 8,
    basis: "Government scholarship audit requirements (central/state scheme reconciliation) & financial-aid record-keeping",
  },
  {
    key: "placements",
    category: "Placement records (companies, drives & student registrations)",
    tables: ["companies", "placement_drives", "placement_registrations"],
    period: "Duration of enrolment + 5 years",
    years: 5,
    basis: "NIRF Criterion 5.2 (Student Progression) reporting & placement verification requests",
  },
  {
    key: "staff-appraisals",
    category: "Staff appraisal records (self-appraisals, scores & activity proofs)",
    tables: ["staff_appraisals", "staff_appraisal_activities"],
    period: "7 years after the appraisal period",
    years: 7,
    basis: "NAAC Criterion 2.4 (faculty performance evidence) & UGC career-advancement / promotion record-keeping",
  },
  {
    key: "alumni",
    category: "Alumni records (graduate directory & batch announcements)",
    tables: ["alumni", "alumni_announcements"],
    period: "Retained while the alumni relationship is active; erased on approved erasure request",
    years: null,
    basis: "Ongoing alumni engagement, transcript/verification requests and institutional development (NIRF/NAAC alumni-outcome evidence); DPDP right to erasure applies",
  },
  {
    key: "staff-career",
    category: "Staff career lifecycle records (joining, promotions, increments, transfers, offboarding)",
    tables: ["staff_career_events"],
    period: "Retained permanently as part of the institutional service record",
    years: null,
    basis: "NAAC Criterion 2.4 (faculty stability evidence), service-record/pension verification, and statutory record-keeping for promotion/increment audit trails",
  },
  {
    key: "recruitment",
    category: "Staff recruitment data (job postings & applicant CVs)",
    tables: ["job_postings", "job_applications"],
    period: "3 years after the hiring cycle; hired applicants' contact data migrates to identity-profile",
    years: 3,
    basis: "Audit trail for hiring decisions (equal-opportunity compliance, NAAC Criterion 2.4 faculty quality evidence); hired staff data becomes part of the staff identity record",
  },
];

/** Consent types captured by the platform (mirrors the DB CHECK constraint). */
export const CONSENT_TYPES = [
  "platform_terms",
  "data_processing",
  "marketing_comms",
  "biometric_nfc",
  "medical_records",
  "photo_usage",
] as const;

export type ConsentType = (typeof CONSENT_TYPES)[number];

export const CONSENT_TYPE_META: Record<
  ConsentType,
  { label: string; description: string; required: boolean }
> = {
  platform_terms: {
    label: "Platform Terms of Use",
    description:
      "I agree to AURA's terms of use for accessing my institution's portal.",
    required: true,
  },
  data_processing: {
    label: "Processing of Personal Data",
    description:
      "I consent to my institution processing my personal data (identity, academic, attendance and fee records) to provide educational services.",
    required: true,
  },
  biometric_nfc: {
    label: "NFC Card Attendance",
    description:
      "I consent to my NFC ID card identifier being used to record my attendance on campus.",
    required: false,
  },
  photo_usage: {
    label: "Photo Usage",
    description:
      "I consent to my photograph being used on ID cards, notice boards and institutional reports.",
    required: false,
  },
  marketing_comms: {
    label: "Updates & Announcements",
    description:
      "I would like to receive non-essential updates and event announcements from my institution.",
    required: false,
  },
  medical_records: {
    label: "Medical Records",
    description:
      "I consent to the campus infirmary maintaining my medical visit records.",
    required: false,
  },
};

/** Consent types shown in the first-login banner, in display order. */
export const BANNER_CONSENT_TYPES: ConsentType[] = [
  "platform_terms",
  "data_processing",
  "biometric_nfc",
  "photo_usage",
  "marketing_comms",
];

/** DPDP Act 2023: erasure requests must be resolved within 72 hours. */
export const ERASURE_SLA_HOURS = 72;
