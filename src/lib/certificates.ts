// ─────────────────────────────────────────────────────────────
// Certificate & Document Generator — pure domain helpers (Phase 6C)
// Certificate typing, numbering, status metadata and the formal
// body-text templates rendered into printable documents.
// ─────────────────────────────────────────────────────────────

export type CertificateType =
  | "bonafide" | "transfer_certificate" | "character_certificate" | "noc" | "course_completion"
  | "offer_letter" | "experience_certificate" | "relieving_letter" | "salary_certificate" | "service_certificate";

export type RequesterType = "student" | "staff";

export const STUDENT_CERT_TYPES: CertificateType[] = [
  "bonafide", "transfer_certificate", "character_certificate", "noc", "course_completion",
];

export const STAFF_CERT_TYPES: CertificateType[] = [
  "offer_letter", "experience_certificate", "relieving_letter", "salary_certificate", "service_certificate",
];

export const CERTIFICATE_LABELS: Record<CertificateType, string> = {
  bonafide: "Bonafide Certificate",
  transfer_certificate: "Transfer Certificate",
  character_certificate: "Character Certificate",
  noc: "No Objection Certificate",
  course_completion: "Course Completion Certificate",
  offer_letter: "Offer Letter",
  experience_certificate: "Experience Certificate",
  relieving_letter: "Relieving Letter",
  salary_certificate: "Salary Certificate",
  service_certificate: "Service Certificate",
};

/** Short prefix used in the issued certificate number. */
export const CERTIFICATE_PREFIX: Record<CertificateType, string> = {
  bonafide: "BON",
  transfer_certificate: "TC",
  character_certificate: "CC",
  noc: "NOC",
  course_completion: "CMP",
  offer_letter: "OL",
  experience_certificate: "EXP",
  relieving_letter: "RL",
  salary_certificate: "SAL",
  service_certificate: "SVC",
};

export function isStudentCertificate(type: CertificateType): boolean {
  return STUDENT_CERT_TYPES.includes(type);
}

export function requesterOf(type: CertificateType): RequesterType {
  return isStudentCertificate(type) ? "student" : "staff";
}

// ── Status metadata ───────────────────────────────────────────────────────────

export type CertStatus = "requested" | "approved" | "issued" | "rejected";

export const CERT_STATUSES: CertStatus[] = ["requested", "approved", "issued", "rejected"];

export const STATUS_LABELS: Record<CertStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  issued: "Issued",
  rejected: "Rejected",
};

export const STATUS_STYLES: Record<CertStatus, string> = {
  requested: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  approved: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  issued: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

// ── Numbering ─────────────────────────────────────────────────────────────────

/** e.g. ("BON", 2026, 7) → "BON/2026/0007". */
export function formatCertificateNo(prefix: string, year: number, seq: number): string {
  return `${prefix}/${year}/${String(seq).padStart(4, "0")}`;
}

// ── Body templates ────────────────────────────────────────────────────────────

export type CertContext = {
  holderName: string;
  institution: string;
  /** student fields */
  rollNo?: string | null;
  program?: string | null;
  department?: string | null;
  year?: number | null;
  /** staff fields */
  designation?: string | null;
  employeeId?: string | null;
  qualification?: string | null;
  joiningDate?: string | null;     // long-formatted
  relievingDate?: string | null;   // long-formatted
  /** common */
  purpose?: string | null;
  issuedDate?: string | null;      // long-formatted
};

export function certificateTitle(type: CertificateType): string {
  return CERTIFICATE_LABELS[type].toUpperCase();
}

function studentDescriptor(ctx: CertContext): string {
  const bits: string[] = [];
  if (ctx.rollNo) bits.push(`bearing Roll No. ${ctx.rollNo}`);
  if (ctx.program) bits.push(ctx.program);
  if (ctx.year) bits.push(`Year ${ctx.year}`);
  if (ctx.department) bits.push(`Department of ${ctx.department}`);
  return bits.length ? ` (${bits.join(", ")})` : "";
}

/** Formal prose paragraphs for a certificate, auto-filled from ctx. */
export function certificateBody(type: CertificateType, ctx: CertContext): string[] {
  const who = ctx.holderName;
  const inst = ctx.institution;
  const desc = studentDescriptor(ctx);
  const purposeLine = ctx.purpose ? `This certificate is issued for the purpose of ${ctx.purpose}.` : "This certificate is issued on request.";

  switch (type) {
    case "bonafide":
      return [
        `This is to certify that ${who}${desc} is a bonafide student of ${inst}.`,
        purposeLine,
      ];
    case "transfer_certificate":
      return [
        `This is to certify that ${who}${desc} was a bonafide student of ${inst}.`,
        `The student's conduct and character during the period of study were found to be satisfactory. No dues are pending against the student.`,
        purposeLine,
      ];
    case "character_certificate":
      return [
        `This is to certify that ${who}${desc} has been a student of ${inst}.`,
        `To the best of our knowledge, the student bore a good moral character throughout the period of study.`,
        purposeLine,
      ];
    case "noc":
      return [
        `This is to certify that ${inst} has No Objection to ${who}${desc} pursuing the activity stated below.`,
        purposeLine,
      ];
    case "course_completion":
      return [
        `This is to certify that ${who}${desc} has successfully completed the prescribed course of study at ${inst}.`,
        purposeLine,
      ];
    case "offer_letter":
      return [
        `Dear ${who},`,
        `We are pleased to offer you the position of ${ctx.designation ?? "—"} at ${inst}${ctx.joiningDate ? `, with effect from ${ctx.joiningDate}` : ""}.`,
        `Your appointment is governed by the terms and conditions of service of the institution. We welcome you to the team and look forward to your contribution.`,
      ];
    case "experience_certificate":
      return [
        `This is to certify that ${who}${ctx.employeeId ? ` (Employee ID: ${ctx.employeeId})` : ""} served at ${inst} as ${ctx.designation ?? "—"}${ctx.joiningDate ? ` from ${ctx.joiningDate}` : ""}${ctx.relievingDate ? ` to ${ctx.relievingDate}` : ""}.`,
        `During the tenure, the conduct and performance were found to be satisfactory. We wish them success in future endeavours.`,
      ];
    case "relieving_letter":
      return [
        `This is to certify that ${who}${ctx.employeeId ? ` (Employee ID: ${ctx.employeeId})` : ""}, ${ctx.designation ?? "—"}, has been relieved from the services of ${inst}${ctx.relievingDate ? ` with effect from the close of working hours on ${ctx.relievingDate}` : ""}.`,
        `All dues and responsibilities have been settled and handed over as applicable.`,
      ];
    case "salary_certificate":
      return [
        `This is to certify that ${who}${ctx.employeeId ? ` (Employee ID: ${ctx.employeeId})` : ""} is employed at ${inst} as ${ctx.designation ?? "—"}${ctx.joiningDate ? ` since ${ctx.joiningDate}` : ""} and is drawing a salary as per the institution's pay structure.`,
        purposeLine,
      ];
    case "service_certificate":
      return [
        `This is to certify that ${who}${ctx.employeeId ? ` (Employee ID: ${ctx.employeeId})` : ""} has rendered service at ${inst} as ${ctx.designation ?? "—"}${ctx.joiningDate ? ` from ${ctx.joiningDate}` : ""}${ctx.relievingDate ? ` to ${ctx.relievingDate}` : ""}.`,
        `The service rendered was found to be satisfactory.`,
      ];
  }
}

/** "2026-06-19" → "19 June 2026"; passthrough/empty handling. */
export function formatLongDate(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}
