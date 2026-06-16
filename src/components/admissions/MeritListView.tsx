"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer, FileText } from "lucide-react";
import { rankApplicants, filterForMerit, meritListToCSV, type MeritRow } from "@/lib/admissionsCRM";
import { ADMISSION_STATUS_COLORS, ADMISSION_STATUS_LABELS, type Admission } from "@/lib/admissions";
import { OfferLetterTemplate } from "./OfferLetterTemplate";

type DeptOption = { id: string; name: string };

export function MeritListView({
  institutionId, institutionName, departments, applicants,
}: {
  institutionId: string;
  institutionName: string;
  departments: DeptOption[];
  applicants: Admission[];
}) {
  const [program, setProgram] = useState<"all" | "UG" | "PG">("all");
  const [departmentId, setDepartmentId] = useState<"all" | string>("all");
  const [offerFor, setOfferFor] = useState<MeritRow | null>(null);

  const intakeYear = new Date().getFullYear();

  const ranked = useMemo(() => {
    const filtered = filterForMerit(applicants, { program, departmentId });
    return rankApplicants(filtered);
  }, [applicants, program, departmentId]);

  const downloadCSV = () => {
    const csv = meritListToCSV(ranked);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `merit-list-${program}-${intakeYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const field = "h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500";

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <Link href={`/institutions/${institutionId}/admissions/crm`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium mb-4 print:hidden">
        <ArrowLeft size={13} /> Admissions CRM
      </Link>

      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap print:hidden">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Merit List</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Applicants ranked by qualifying marks — export for statutory noticeboard posting.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={downloadCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><Download size={14} /> CSV</button>
          <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700"><Printer size={14} /> Print</button>
        </div>
      </div>

      {/* filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap print:hidden">
        <select value={program} onChange={(e) => setProgram(e.target.value as "all" | "UG" | "PG")} className={field}>
          <option value="all">All programmes</option>
          <option value="UG">UG</option>
          <option value="PG">PG</option>
        </select>
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={field}>
          <option value="all">All departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <span className="text-[11px] text-slate-400">{ranked.length} applicant{ranked.length === 1 ? "" : "s"}</span>
      </div>

      {/* print header */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold">{institutionName}</h1>
        <p className="text-sm">Provisional Merit List — Intake {intakeYear}</p>
        <p className="text-xs text-slate-500">{program === "all" ? "All Programmes" : program}{departmentId !== "all" ? ` · ${departments.find((d) => d.id === departmentId)?.name ?? ""}` : ""}</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="text-left font-semibold px-3 py-2 w-14">Rank</th>
              <th className="text-left font-semibold px-3 py-2">Applicant</th>
              <th className="text-left font-semibold px-3 py-2">Programme</th>
              <th className="text-left font-semibold px-3 py-2">Department</th>
              <th className="text-right font-semibold px-3 py-2">Marks %</th>
              <th className="text-left font-semibold px-3 py-2">Status</th>
              <th className="text-right font-semibold px-3 py-2 print:hidden">Offer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {ranked.map((r) => (
              <tr key={r.id} className="bg-white dark:bg-slate-900">
                <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-300">{r.rank}</td>
                <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-medium">{r.applicant_name}</td>
                <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{r.program_applied}</td>
                <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{r.department ?? "—"}</td>
                <td className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-300">{r.marks_percentage != null ? `${r.marks_percentage}%` : "—"}</td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${ADMISSION_STATUS_COLORS[r.status]}`}>{ADMISSION_STATUS_LABELS[r.status]}</span>
                </td>
                <td className="px-3 py-2 text-right print:hidden">
                  {(r.status === "admitted" || r.status === "enrolled") && (
                    <button type="button" onClick={() => setOfferFor(r)} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
                      <FileText size={11} /> Offer letter
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {ranked.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-slate-400">No applicants match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {offerFor && (
        <OfferLetterTemplate
          institutionName={institutionName}
          candidate={offerFor}
          intakeYear={intakeYear}
          onClose={() => setOfferFor(null)}
        />
      )}
    </div>
  );
}
