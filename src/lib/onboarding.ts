// Arch A4 — Institution Onboarding Wizard: pure logic shared by the wizard UI
// (src/components/onboarding/*) and its unit tests. No React, no Supabase —
// everything here is deterministic and side-effect free so it can be tested in
// isolation (Dev Rule 18).

export type OnboardingStepId =
  | "welcome"
  | "departments"
  | "academic-year"
  | "fees"
  | "staff"
  | "done";

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  subtitle: string;
  /** Welcome/Done are framing screens; only actionable steps count toward progress. */
  actionable: boolean;
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: "welcome",       title: "Welcome",        subtitle: "Let's set up your institution",     actionable: false },
  { id: "departments",   title: "Departments",    subtitle: "Add your academic departments",      actionable: true  },
  { id: "academic-year", title: "Academic Year",  subtitle: "Set the current academic session",   actionable: true  },
  { id: "fees",          title: "Fee Structures", subtitle: "Configure tuition & other fees",      actionable: true  },
  { id: "staff",         title: "Staff",          subtitle: "Import your teaching & office staff", actionable: true  },
  { id: "done",          title: "All set",        subtitle: "Your campus is ready",                actionable: false },
];

/** Live counts of what the institution has configured so far. */
export type OnboardingState = {
  departments: number;
  hasAcademicYear: boolean;
  feeStructures: number;
  staff: number;
};

const ACTIONABLE_COUNT = ONBOARDING_STEPS.filter((s) => s.actionable).length; // 4

/** Whether a given actionable step has at least its minimum data. */
export function isStepComplete(step: OnboardingStepId, s: OnboardingState): boolean {
  switch (step) {
    case "departments":   return s.departments > 0;
    case "academic-year": return s.hasAcademicYear;
    case "fees":          return s.feeStructures > 0;
    case "staff":         return s.staff > 0;
    default:              return true; // framing screens are always "complete"
  }
}

/** Setup completeness as a 0–100 integer across the four actionable steps. */
export function onboardingProgress(s: OnboardingState): number {
  const done = ONBOARDING_STEPS.filter(
    (step) => step.actionable && isStepComplete(step.id, s)
  ).length;
  return Math.round((done / ACTIONABLE_COUNT) * 100);
}

// ── Staff CSV import ──────────────────────────────────────────────────────────

export type ParsedStaffRow = {
  full_name: string;
  email: string | null;
  designation: string | null;
  department: string | null;
  staff_type: "teaching" | "non_teaching";
};

export type StaffCsvResult = {
  rows: ParsedStaffRow[];
  errors: string[];
};

// Header aliases → canonical field. Lets admins paste exports from varied systems.
const HEADER_ALIASES: Record<string, keyof ParsedStaffRow> = {
  "name": "full_name",
  "full name": "full_name",
  "full_name": "full_name",
  "staff name": "full_name",
  "email": "email",
  "email id": "email",
  "e-mail": "email",
  "designation": "designation",
  "role": "designation",
  "title": "designation",
  "department": "department",
  "dept": "department",
  "type": "staff_type",
  "staff type": "staff_type",
  "staff_type": "staff_type",
};

/** Split one CSV line, honouring double-quoted fields that may contain commas. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } // escaped quote
        else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function normalizeStaffType(raw: string | undefined): "teaching" | "non_teaching" {
  const v = (raw ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  return v === "non_teaching" || v === "nonteaching" || v === "office" ? "non_teaching" : "teaching";
}

/**
 * Parse a pasted/uploaded staff CSV into validated rows.
 *
 * - First non-empty line is treated as a header; unknown columns are ignored.
 * - `full_name` is required; a row without one is reported (not silently dropped).
 * - Emails are validated loosely; an invalid email is reported and the row skipped.
 */
export function parseStaffCsv(csv: string): StaffCsvResult {
  const rows: ParsedStaffRow[] = [];
  const errors: string[] = [];

  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { rows, errors: ["The file is empty."] };

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const fieldAt: (keyof ParsedStaffRow | null)[] = header.map((h) => HEADER_ALIASES[h] ?? null);

  if (!fieldAt.includes("full_name")) {
    return { rows, errors: ['Missing a "name" (or "full_name") column in the header row.'] };
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const rec: Partial<Record<keyof ParsedStaffRow, string>> = {};
    fieldAt.forEach((field, idx) => {
      if (field) rec[field] = cells[idx] ?? "";
    });

    const full_name = (rec.full_name ?? "").trim();
    if (!full_name) {
      errors.push(`Row ${i + 1}: missing name — skipped.`);
      continue;
    }

    const email = (rec.email ?? "").trim();
    if (email && !emailRe.test(email)) {
      errors.push(`Row ${i + 1} (${full_name}): invalid email "${email}" — skipped.`);
      continue;
    }

    rows.push({
      full_name,
      email: email || null,
      designation: (rec.designation ?? "").trim() || null,
      department: (rec.department ?? "").trim() || null,
      staff_type: normalizeStaffType(rec.staff_type),
    });
  }

  return { rows, errors };
}
