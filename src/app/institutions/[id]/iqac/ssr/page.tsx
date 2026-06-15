"use client";

import { use, useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Landmark, Loader2, AlertCircle, RefreshCw, Download, ChevronDown,
  CheckCircle2, CircleDashed, Hourglass, FileSpreadsheet, Printer, Globe2,
} from "lucide-react";
import {
  aggregateSSRData, getAISHEData, getNIRFData,
  type SSRReport, type SSRCriterionReport,
} from "@/actions/ssrBuilder";
import { downloadWorkbook, type Sheet } from "@/lib/excelXml";

const intFmt = new Intl.NumberFormat("en-IN");

function ringColor(pct: number): string {
  if (pct >= 70) return "#10b981";
  if (pct >= 40) return "#f59e0b";
  return "#f43f5e";
}

/** SVG completeness ring (no chart lib needed for a single value). */
function ProgressRing({ pct, size = 64 }: { pct: number; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={ringColor(pct)} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
        className="transition-[stroke-dashoffset] duration-700 ease-out"
      />
      <text
        x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        className="rotate-90 origin-center fill-slate-800 font-bold"
        style={{ fontSize: size / 4.2 }}
      >
        {pct}%
      </text>
    </svg>
  );
}

function CriterionCard({ criterion }: { criterion: SSRCriterionReport }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-3.5 flex items-center gap-4 text-left hover:bg-slate-50/60 transition-colors">
        <ProgressRing pct={criterion.completeness} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">Criterion {criterion.number}</p>
          <h3 className="text-sm font-bold text-slate-900 truncate">{criterion.title}</h3>
          <p className="text-[11px] text-slate-400 truncate">{criterion.description}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] font-semibold">
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 size={10} /> {criterion.liveWithData} with evidence
            </span>
            {criterion.liveEmpty > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <CircleDashed size={10} /> {criterion.liveEmpty} no data yet
              </span>
            )}
            {criterion.pendingModules > 0 && (
              <span className="flex items-center gap-1 text-slate-400">
                <Hourglass size={10} /> {criterion.pendingModules} module{criterion.pendingModules === 1 ? "" : "s"} pending
              </span>
            )}
          </div>
        </div>
        <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {criterion.sources.map((source) => (
            <div key={source.key} className="px-4 py-2.5 flex items-center gap-3">
              {source.status === "pending" ? (
                <Hourglass size={13} className="text-slate-300 shrink-0" />
              ) : (source.count ?? 0) > 0 ? (
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              ) : (
                <CircleDashed size={13} className="text-amber-500 shrink-0" />
              )}
              <p className="text-xs text-slate-700 flex-1">{source.label}</p>
              {source.status === "pending" ? (
                <span className="text-[10px] text-slate-400 italic shrink-0" title={source.phase}>
                  {source.phase?.split("—")[0].trim()}
                </span>
              ) : source.countError ? (
                <span className="text-[10px] text-rose-500 font-semibold shrink-0" title={source.countError}>
                  count failed
                </span>
              ) : (
                <span className={`text-xs font-bold tabular-nums shrink-0 ${(source.count ?? 0) > 0 ? "text-slate-900" : "text-amber-600"}`}>
                  {intFmt.format(source.count ?? 0)} record{(source.count ?? 0) === 1 ? "" : "s"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SSRBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: institutionId } = use(params);

  const [report, setReport] = useState<SSRReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"workbook" | "aishe" | "nirf" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await aggregateSSRData(institutionId);
    if (res.success) setReport(res.data);
    else setError(res.error);
    setLoading(false);
  }, [institutionId]);

  useEffect(() => { load(); }, [load]);

  /** SSR evidence workbook — one sheet per criterion, NAAC column layout. */
  const exportWorkbook = () => {
    if (!report) return;
    setExporting("workbook");
    const sheets: Sheet[] = [
      {
        name: "Overview",
        rows: [
          ["NAAC SSR Evidence Workbook", ""],
          ["Generated", new Date(report.generatedAt).toLocaleString("en-IN")],
          ["Overall readiness", `${report.overallCompleteness}%`],
          [],
          ["Criterion", "Title", "Readiness %", "Sources with evidence", "Live, no data", "Modules pending"],
          ...report.criteria.map((c) => [
            `Criterion ${c.number}`, c.title, c.completeness, c.liveWithData, c.liveEmpty, c.pendingModules,
          ]),
        ],
      },
      ...report.criteria.map((c) => ({
        name: `Criterion ${c.number}`,
        rows: [
          ["Evidence Source (NAAC metric)", "Status", "Evidence Records", "Pending Roadmap Phase"],
          ...c.sources.map((s) => [
            s.label,
            s.status === "pending" ? "Module pending" : (s.count ?? 0) > 0 ? "Evidence available" : "No data entered",
            s.status === "pending" ? null : s.count ?? 0,
            s.status === "pending" ? s.phase ?? "" : "",
          ]),
        ] as Sheet["rows"],
      })),
    ];
    downloadWorkbook("naac-ssr-evidence-workbook.xls", sheets);
    setExporting(null);
  };

  /** AISHE annual return — enrollment/staff/finance sheets from live data. */
  const exportAISHE = async () => {
    setExporting("aishe");
    const res = await getAISHEData(institutionId);
    if (!res.success) { setError(res.error); setExporting(null); return; }
    const d = res.data;
    const warn =
      d.students.notRecorded.gender > 0 || d.students.notRecorded.category > 0
        ? `WARNING: ${d.students.notRecorded.gender} students missing gender, ${d.students.notRecorded.category} missing category — backfill before filing the AISHE return`
        : "All gender/category fields recorded";
    downloadWorkbook("aishe-annual-return.xls", [
      {
        name: "Enrollment",
        rows: [
          ["AISHE Annual Return — Student Enrollment", ""],
          ["Institution", d.institutionName],
          ["Generated", new Date(d.generatedAt).toLocaleString("en-IN")],
          ["Data quality", warn],
          [],
          ["Total enrolled students", d.students.total],
          ["Persons with Disability (PwD)", d.students.pwd],
          [],
          ["By Gender", "Count"],
          ...d.students.byGender.map((g): (string | number)[] => [g.label, g.count]),
          [],
          ["By Social Category", "Count"],
          ...d.students.byCategory.map((c): (string | number)[] => [c.label, c.count]),
          [],
          ["By Programme", "Count"],
          ...d.students.byProgramme.map((p): (string | number)[] => [p.label, p.count]),
          [],
          ["By Year of Study", "Count"],
          ...d.students.byYear.map((y): (string | number)[] => [y.label, y.count]),
        ],
      },
      {
        name: "Staff",
        rows: [
          ["Teaching Staff", "Count"],
          ["Total teaching staff", d.staff.teachingTotal],
          [],
          ["By Gender", "Count"],
          ...d.staff.byGender.map((g): (string | number)[] => [g.label, g.count]),
          [],
          ["By Qualification", "Count"],
          ...d.staff.byQualification.map((q): (string | number)[] => [q.label, q.count]),
        ],
      },
      {
        name: "Finance",
        rows: [
          ["Head", "Amount (INR)"],
          ["Income — fee collections (completed)", d.finance.incomeFees],
          ["Expenditure — salary disbursements (processed)", d.finance.expenditureSalary],
          ["Expenditure — other logged expenses", d.finance.expenditureOther],
        ],
      },
      {
        name: "Pending Fields",
        rows: [
          ["AISHE Field", "Available After"],
          ...d.pendingFields.map((p): (string | number)[] => [p.field, p.phase]),
        ],
      },
    ]);
    setExporting(null);
  };

  /** NIRF data extract — available parameters + pending ones flagged. */
  const exportNIRF = async () => {
    setExporting("nirf");
    const res = await getNIRFData(institutionId);
    if (!res.success) { setError(res.error); setExporting(null); return; }
    const d = res.data;
    downloadWorkbook("nirf-data-extract.xls", [
      {
        name: "Teaching-Learning",
        rows: [
          ["NIRF Data Extract", ""],
          ["Institution", d.institutionName],
          ["Generated", new Date(d.generatedAt).toLocaleString("en-IN")],
          [],
          ["Parameter", "Value"],
          ["Enrolled students", d.teachingLearning.students],
          ["Teaching staff", d.teachingLearning.teachingStaff],
          ["Faculty–student ratio (students per teacher)", d.teachingLearning.facultyStudentRatio ?? "No staff recorded"],
        ],
      },
      {
        name: "Graduation Outcome",
        rows: [
          ["Parameter", "Value"],
          ["Promotion / progression events", d.graduationOutcome.promotionEvents],
          ["Exam results recorded", d.graduationOutcome.examResults],
          ["Arrear results", d.graduationOutcome.arrears],
        ],
      },
      {
        name: "Outreach & Inclusivity",
        rows: [
          ["Parameter", "Value"],
          ["Internships logged", d.outreach.internships],
          ["Guest lectures / expert talks", d.outreach.guestLectures],
          ["Women enrollment % (of recorded genders)", d.outreach.womenEnrollmentPct ?? "Gender not recorded yet"],
        ],
      },
      {
        name: "Pending Parameters",
        rows: [
          ["NIRF Parameter", "Available After"],
          ...d.pendingParameters.map((p): (string | number)[] => [p.parameter, p.phase]),
        ],
      },
    ]);
    setExporting(null);
  };

  /** Print-friendly readiness report — browser print dialog → Save as PDF. */
  const printReport = () => {
    if (!report) return;
    const rows = report.criteria
      .map(
        (c) => `
      <h2>Criterion ${c.number} — ${c.title} <span class="pct">${c.completeness}%</span></h2>
      <table>
        <tr><th>Evidence source</th><th>Status</th><th>Records</th></tr>
        ${c.sources
          .map(
            (s) => `<tr>
          <td>${s.label}</td>
          <td>${s.status === "pending" ? `Module pending — ${s.phase ?? ""}` : (s.count ?? 0) > 0 ? "Evidence available" : "No data entered"}</td>
          <td class="num">${s.status === "pending" ? "—" : s.count ?? 0}</td>
        </tr>`
          )
          .join("")}
      </table>`
      )
      .join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>NAAC SSR Readiness Report</title>
      <style>
        body { font-family: Georgia, serif; color: #1e293b; margin: 40px; }
        h1 { font-size: 22px; margin-bottom: 2px; }
        .sub { color: #64748b; font-size: 12px; margin-bottom: 24px; }
        h2 { font-size: 14px; margin: 22px 0 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
        .pct { float: right; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #e2e8f0; }
        th { text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; color: #64748b; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        @media print { body { margin: 12mm; } }
      </style></head><body>
      <h1>NAAC SSR Readiness Report</h1>
      <p class="sub">Overall readiness ${report.overallCompleteness}% · generated ${new Date(report.generatedAt).toLocaleString("en-IN")} · completeness = sources with evidence ÷ all mapped sources (pending modules included)</p>
      ${rows}
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const exportCSV = () => {
    if (!report) return;
    const lines: string[] = [
      `NAAC SSR Evidence Summary,generated ${new Date(report.generatedAt).toLocaleString("en-IN")}`,
      `Overall readiness,${report.overallCompleteness}%`,
      "",
      "Criterion,Title,Evidence Source,Status,Records / Pending Phase",
      ...report.criteria.flatMap((c) =>
        c.sources.map((s) =>
          [
            c.number,
            `"${c.title}"`,
            `"${s.label.replace(/"/g, '""')}"`,
            s.status === "pending" ? "Module pending" : (s.count ?? 0) > 0 ? "Evidence available" : "No data entered",
            s.status === "pending" ? `"${s.phase ?? ""}"` : s.count ?? 0,
          ].join(",")
        )
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `naac-ssr-evidence-summary.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="px-6 pt-6 pb-6 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <Landmark size={18} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">NAAC SSR Builder</h1>
              <p className="text-xs text-slate-500">
                Criterion-wise evidence readiness for the Self-Study Report — completeness = sources with evidence ÷ all mapped sources (pending modules included)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-colors">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button onClick={exportCSV} disabled={!report}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors">
              <Download size={13} /> Evidence Summary CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 mb-4">
            <AlertCircle size={13} className="shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={22} className="animate-spin text-violet-500" /></div>
        ) : report ? (
          <div className="space-y-5">
            {/* Overall readiness banner */}
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-5">
              <ProgressRing pct={report.overallCompleteness} size={80} />
              <div>
                <h2 className="text-sm font-bold text-slate-900">Overall SSR Readiness</h2>
                <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                  {report.overallCompleteness >= 70
                    ? "Strong evidence coverage — review the per-criterion gaps below before compiling the SSR."
                    : report.overallCompleteness >= 40
                    ? "Moderate coverage. Amber items are live modules awaiting data entry; grey items unlock as their roadmap phases ship."
                    : "Early stage — most evidence will accumulate as modules go live and daily usage grows."}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Generated {new Date(report.generatedAt).toLocaleString("en-IN")} · counts are lifetime evidence rows
                </p>
              </div>
            </div>

            {/* Criterion cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {report.criteria.map((criterion) => (
                <CriterionCard key={criterion.number} criterion={criterion} />
              ))}
            </div>

            {/* ── Export hub (roadmap 7F-sub) ── */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Export Hub</h3>
              <p className="text-[11px] text-slate-400 mb-3">
                Multi-sheet Excel workbooks (.xls) generated from live data — pending-module fields are labelled
                with their roadmap phase, never silently zeroed.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                <button onClick={exportWorkbook} disabled={!report || exporting !== null}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50/40 disabled:opacity-50 px-3 py-2.5 text-left transition-colors">
                  {exporting === "workbook" ? <Loader2 size={16} className="animate-spin text-violet-600 shrink-0" /> : <FileSpreadsheet size={16} className="text-violet-600 shrink-0" />}
                  <span>
                    <span className="block text-xs font-semibold text-slate-800">SSR Evidence Workbook</span>
                    <span className="block text-[10px] text-slate-400">One sheet per criterion</span>
                  </span>
                </button>
                <button onClick={exportAISHE} disabled={exporting !== null}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50/40 disabled:opacity-50 px-3 py-2.5 text-left transition-colors">
                  {exporting === "aishe" ? <Loader2 size={16} className="animate-spin text-violet-600 shrink-0" /> : <Globe2 size={16} className="text-sky-600 shrink-0" />}
                  <span>
                    <span className="block text-xs font-semibold text-slate-800">AISHE Annual Return</span>
                    <span className="block text-[10px] text-slate-400">Enrollment · staff · finance</span>
                  </span>
                </button>
                <button onClick={exportNIRF} disabled={exporting !== null}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50/40 disabled:opacity-50 px-3 py-2.5 text-left transition-colors">
                  {exporting === "nirf" ? <Loader2 size={16} className="animate-spin text-violet-600 shrink-0" /> : <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />}
                  <span>
                    <span className="block text-xs font-semibold text-slate-800">NIRF Data Extract</span>
                    <span className="block text-[10px] text-slate-400">Available parameters + gaps</span>
                  </span>
                </button>
                <button onClick={printReport} disabled={!report}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50/40 disabled:opacity-50 px-3 py-2.5 text-left transition-colors">
                  <Printer size={16} className="text-slate-600 shrink-0" />
                  <span>
                    <span className="block text-xs font-semibold text-slate-800">Readiness Report (PDF)</span>
                    <span className="block text-[10px] text-slate-400">Print dialog → Save as PDF</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
