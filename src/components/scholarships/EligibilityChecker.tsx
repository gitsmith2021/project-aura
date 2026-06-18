"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";
import { checkEligibility, type EligibilityCriteria, type StudentEligibilityContext } from "@/lib/scholarships";

/**
 * Auto-checks a student profile against a scheme's eligibility criteria.
 * Category is enforced strictly; marks/income are advisory (verified from proof
 * documents) and only flagged when a value is known.
 */
export function EligibilityChecker({
  criteria,
  student,
  compact = false,
}: {
  criteria: EligibilityCriteria | null | undefined;
  student: StudentEligibilityContext;
  compact?: boolean;
}) {
  const { eligible, reasons } = checkEligibility(criteria, student);

  if (eligible) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle2 size={11} /> Eligible
      </span>
    );
  }

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" title={reasons.join("; ")}>
        <AlertTriangle size={11} /> Check criteria
      </span>
    );
  }

  return (
    <div className="inline-flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 w-fit">
        <AlertTriangle size={11} /> Not eligible
      </span>
      <ul className="text-[11px] text-amber-600 dark:text-amber-400/80 list-disc ml-4">
        {reasons.map((r) => <li key={r}>{r}</li>)}
      </ul>
    </div>
  );
}
