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
