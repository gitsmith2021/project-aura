// Phase 5G — Scholarship Management domain model + pure helpers.

export type SchemeType =
  | "government_central" | "government_state" | "institutional"
  | "private" | "sports" | "merit" | "minority" | "sc_st_obc";

export type ScholarshipStatus = "applied" | "verified" | "approved" | "rejected" | "disbursed";

/** Mirrors the fee_concessions.concession_type CHECK. */
export type ConcessionType = "staff_ward" | "management_quota" | "merit" | "hardship" | "sports_quota" | "other";

export type EligibilityCriteria = {
  min_marks?: number | null;
  categories?: string[] | null;   // e.g. ["SC","ST","OBC"] — empty/absent = all
  income_limit?: number | null;   // annual family income ceiling (₹)
};

export type ScholarshipScheme = {
  id: string;
  institution_id: string;
  name: string;
  scheme_type: SchemeType;
  description: string | null;
  eligibility_criteria: EligibilityCriteria | null;
  amount_per_student: number | null;
  renewable: boolean;
  application_deadline: string | null;
  is_active: boolean;
  created_at: string;
  application_count?: number;
};

export type ScholarshipApplication = {
  id: string;
  institution_id: string;
  scheme_id: string;
  student_id: string;
  academic_year_id: string | null;
  application_date: string;
  documents_url: { name: string; url: string }[] | null;
  status: ScholarshipStatus;
  disbursed_amount: number | null;
  disbursed_at: string | null;
  admin_notes: string | null;
  created_at: string;
  scholarship_schemes?: { name: string; scheme_type: SchemeType; amount_per_student: number | null } | null;
  students?: { full_name: string; roll_no: string | null; category: string | null } | null;
};

// ── Labels & colours ──────────────────────────────────────────────────────────

export const SCHEME_TYPE_LABELS: Record<SchemeType, string> = {
  government_central: "Govt — Central",
  government_state: "Govt — State",
  institutional: "Institutional",
  private: "Private / Trust",
  sports: "Sports Quota",
  merit: "Merit",
  minority: "Minority",
  sc_st_obc: "SC / ST / OBC",
};

export const SCHEME_TYPE_COLORS: Record<SchemeType, string> = {
  government_central: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  government_state:   "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
  institutional:      "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  private:            "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300",
  sports:             "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  merit:              "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  minority:           "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  sc_st_obc:          "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
};

export const SCHEME_TYPES = Object.keys(SCHEME_TYPE_LABELS) as SchemeType[];

export const STATUS_LABELS: Record<ScholarshipStatus, string> = {
  applied: "Applied", verified: "Verified", approved: "Approved", rejected: "Rejected", disbursed: "Disbursed",
};

export const STATUS_COLORS: Record<ScholarshipStatus, string> = {
  applied:   "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  verified:  "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  approved:  "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  rejected:  "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  disbursed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

/** Ordered non-terminal flow (rejected is terminal, excluded). */
export const STATUS_PIPELINE: ScholarshipStatus[] = ["applied", "verified", "approved", "disbursed"];

export function nextStatus(s: ScholarshipStatus): ScholarshipStatus | null {
  if (s === "rejected" || s === "disbursed") return null;
  const i = STATUS_PIPELINE.indexOf(s);
  return i >= 0 && i < STATUS_PIPELINE.length - 1 ? STATUS_PIPELINE[i + 1] : null;
}

// ── Eligibility ───────────────────────────────────────────────────────────────

export type StudentEligibilityContext = {
  category: string | null;
  marks?: number | null;   // null/undefined = unknown (advisory, not a blocker)
  income?: number | null;
};

export type EligibilityResult = { eligible: boolean; reasons: string[] };

/**
 * Category is enforced strictly (we hold it on the student record). Min-marks and
 * income-limit only block when a value is known — otherwise they're advisory and
 * verified from the uploaded proof documents during the verification step.
 */
export function checkEligibility(
  criteria: EligibilityCriteria | null | undefined,
  ctx: StudentEligibilityContext
): EligibilityResult {
  const reasons: string[] = [];
  if (criteria) {
    const cats = criteria.categories ?? [];
    if (cats.length > 0 && (!ctx.category || !cats.includes(ctx.category))) {
      reasons.push(`Reserved for ${cats.join(" / ")} category students`);
    }
    if (criteria.min_marks != null && ctx.marks != null && ctx.marks < criteria.min_marks) {
      reasons.push(`Requires minimum ${criteria.min_marks}% marks`);
    }
    if (criteria.income_limit != null && ctx.income != null && ctx.income > criteria.income_limit) {
      reasons.push(`Family income exceeds ₹${criteria.income_limit.toLocaleString("en-IN")} limit`);
    }
  }
  return { eligible: reasons.length === 0, reasons };
}

// ── Fee integration ───────────────────────────────────────────────────────────

/** Map a scholarship scheme to the closest fee_concessions.concession_type. */
export function concessionTypeForScheme(scheme: SchemeType): ConcessionType {
  if (scheme === "sports") return "sports_quota";
  if (scheme === "merit") return "merit";
  return "other";
}

// ── Formatting & deadlines ────────────────────────────────────────────────────

export function formatINR(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function isDeadlinePassed(deadline: string | null, today: string): boolean {
  if (!deadline) return false;
  return new Date(deadline).getTime() < new Date(today).getTime();
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export type ScholarshipStats = {
  total: number;
  pending: number;        // applied + verified
  approved: number;       // approved (not yet disbursed)
  disbursed: number;      // count disbursed
  rejected: number;
  totalDisbursed: number; // sum of disbursed_amount
};

export function scholarshipStats(
  apps: Pick<ScholarshipApplication, "status" | "disbursed_amount">[]
): ScholarshipStats {
  const s: ScholarshipStats = { total: 0, pending: 0, approved: 0, disbursed: 0, rejected: 0, totalDisbursed: 0 };
  for (const a of apps) {
    s.total++;
    if (a.status === "applied" || a.status === "verified") s.pending++;
    else if (a.status === "approved") s.approved++;
    else if (a.status === "rejected") s.rejected++;
    else if (a.status === "disbursed") {
      s.disbursed++;
      s.totalDisbursed += a.disbursed_amount ?? 0;
    }
  }
  s.totalDisbursed = Math.round(s.totalDisbursed * 100) / 100;
  return s;
}

// ── CSV export ────────────────────────────────────────────────────────────────

function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function applicationsCSV(apps: ScholarshipApplication[]): string {
  const header = ["Student", "Roll No", "Category", "Scheme", "Type", "Status", "Disbursed Amount", "Applied On"].join(",");
  const lines = apps.map((a) =>
    [
      a.students?.full_name ?? "",
      a.students?.roll_no ?? "",
      a.students?.category ?? "",
      a.scholarship_schemes?.name ?? "",
      a.scholarship_schemes ? SCHEME_TYPE_LABELS[a.scholarship_schemes.scheme_type] : "",
      STATUS_LABELS[a.status],
      a.disbursed_amount ?? "",
      a.application_date,
    ].map(csvCell).join(",")
  );
  return [header, ...lines].join("\n");
}
