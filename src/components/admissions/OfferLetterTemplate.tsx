"use client";

import { X, Printer } from "lucide-react";
import type { MeritRow } from "@/lib/admissionsCRM";

/**
 * Printable provisional offer / admission letter. Rendered as a full-screen
 * overlay; `window.print()` prints only the letter (everything else is
 * `print:hidden`). Statutory wording kept generic — institutions edit the
 * printed copy as needed.
 */
export function OfferLetterTemplate({
  institutionName, candidate, intakeYear, onClose,
}: {
  institutionName: string;
  candidate: MeritRow;
  intakeYear: number;
  onClose: () => void;
}) {
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const programLabel = candidate.program_applied === "PG" ? "Post Graduate" : "Under Graduate";

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 print:bg-white print:p-0 print:block">
      <div className="relative w-full max-w-2xl bg-white text-slate-900 rounded-xl shadow-2xl print:shadow-none print:rounded-none print:max-w-none">
        {/* toolbar — hidden when printing */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-slate-200 print:hidden">
          <span className="text-xs font-semibold text-slate-500">Offer letter preview</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-md hover:bg-indigo-700"><Printer size={13} /> Print</button>
            <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100"><X size={16} /></button>
          </div>
        </div>

        {/* letter body */}
        <div className="p-10 print:p-12">
          <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
            <h1 className="text-2xl font-bold tracking-tight">{institutionName}</h1>
            <p className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">Office of Admissions</p>
          </div>

          <div className="flex justify-between text-xs text-slate-500 mb-6">
            <span>Ref: ADM/{intakeYear}/{String(candidate.rank).padStart(4, "0")}</span>
            <span>Date: {today}</span>
          </div>

          <p className="text-sm font-semibold mb-1">To,</p>
          <p className="text-sm mb-6">{candidate.applicant_name}</p>

          <p className="text-sm font-bold underline mb-4">Subject: Provisional Offer of Admission — {programLabel} Programme</p>

          <p className="text-sm leading-relaxed mb-4">Dear {candidate.applicant_name},</p>

          <p className="text-sm leading-relaxed mb-4">
            We are pleased to inform you that, based on your academic performance
            {candidate.marks_percentage != null ? ` (qualifying marks: ${candidate.marks_percentage}%)` : ""}
            {candidate.department ? ` and your application to the Department of ${candidate.department}` : ""},
            you have been provisionally offered admission to the <span className="font-semibold">{programLabel}</span> programme
            for the academic intake year <span className="font-semibold">{intakeYear}</span>.
          </p>

          <p className="text-sm leading-relaxed mb-4">
            This offer is provisional and subject to (a) verification of your original documents,
            (b) payment of the prescribed admission confirmation fee as per the institution&apos;s
            fee structure, and (c) fulfilment of all eligibility criteria stipulated by the
            affiliating university and statutory regulatory bodies.
          </p>

          <p className="text-sm leading-relaxed mb-8">
            To confirm your seat, please report to the admissions office with this letter and the
            confirmation fee on or before the date communicated to you. Failure to do so may result
            in this offer being withdrawn and the seat allotted to the next candidate on the merit list.
          </p>

          <div className="mt-12">
            <p className="text-sm">Yours sincerely,</p>
            <div className="mt-10">
              <p className="text-sm font-semibold border-t border-slate-400 inline-block pt-1">Admissions Officer</p>
              <p className="text-xs text-slate-500">{institutionName}</p>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 mt-10 text-center">
            This is a system-generated provisional offer letter. It is valid only with the official seal and signature of the institution.
          </p>
        </div>
      </div>
    </div>
  );
}
