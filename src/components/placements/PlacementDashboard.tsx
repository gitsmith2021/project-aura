"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Plus, X, Building2, BarChart3, ChevronRight, Calendar } from "lucide-react";
import {
  DRIVE_STATUS_LABELS, DRIVE_STATUS_COLORS, formatLPA,
  type PlacementDrive, type Company, type PlacementStats,
} from "@/lib/placements";
import { createDrive } from "@/actions/placements";
import { PlacementStatsCards } from "./PlacementStatsCard";

type Dept = { id: string; name: string };
type AY = { id: string; label: string; is_current: boolean };

export function PlacementDashboard({
  institutionId, instSlug, drives, companies, departments, academicYears, stats,
}: {
  institutionId: string; instSlug: string;
  drives: PlacementDrive[]; companies: Company[]; departments: Dept[]; academicYears: AY[]; stats: PlacementStats;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [driveDate, setDriveDate] = useState(new Date().toISOString().slice(0, 10));
  const [ctc, setCtc] = useState("");
  const [ayId, setAyId] = useState(academicYears.find((y) => y.is_current)?.id ?? "");
  const [minCgpa, setMinCgpa] = useState("");
  const [noBacklogs, setNoBacklogs] = useState(false);
  const [eligDepts, setEligDepts] = useState<string[]>([]);
  const [stages, setStages] = useState("Resume Screening, Aptitude, Technical, HR");
  const [exclusive, setExclusive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDept(id: string) {
    setEligDepts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleCreate() {
    if (!companyId) { setError("Select a company."); return; }
    if (!jobRole.trim()) { setError("Job role is required."); return; }
    setBusy(true); setError(null);
    const res = await createDrive({
      institutionId, companyId, jobRole, driveDate,
      ctcOffered: ctc ? Number(ctc) : null,
      academicYearId: ayId || null,
      eligibility: {
        min_cgpa: minCgpa ? Number(minCgpa) : null,
        no_backlogs: noBacklogs,
        departments: eligDepts,
      },
      processStages: stages.split(",").map((s) => s.trim()).filter(Boolean),
      isExclusive: exclusive,
    });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOpen(false);
    setCompanyId(""); setJobRole(""); setCtc(""); setMinCgpa(""); setNoBacklogs(false); setEligDepts([]);
    router.refresh();
  }

  const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500";
  const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";
  const noCompanies = companies.length === 0;

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase size={22} className="text-purple-600" /> Placement Cell
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Drives, company outreach and NIRF placement statistics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/institutions/${instSlug}/placements/companies`} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            <Building2 size={15} /> Companies
          </Link>
          <Link href={`/institutions/${instSlug}/placements/statistics`} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            <BarChart3 size={15} /> Statistics
          </Link>
          <button onClick={() => { setOpen(true); setError(null); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700">
            <Plus size={15} /> New Drive
          </button>
        </div>
      </div>

      <PlacementStatsCards stats={stats} />

      {drives.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">
          No placement drives yet. {noCompanies && "Add a company first, then "}create a drive to get started.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Company / Role</th>
                <th className="text-left font-medium px-4 py-2.5">Date</th>
                <th className="text-center font-medium px-4 py-2.5">CTC</th>
                <th className="text-center font-medium px-4 py-2.5">Registered</th>
                <th className="text-left font-medium px-4 py-2.5">Status</th>
                <th className="text-right font-medium px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {drives.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-900 dark:text-white">{d.companies?.name ?? "—"}</div>
                    <div className="text-[11px] text-slate-400">{d.job_role}</div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1"><Calendar size={12} className="text-slate-400" />{new Date(d.drive_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{formatLPA(d.ctc_offered)}</td>
                  <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{d.registration_count ?? 0}</td>
                  <td className="px-4 py-2.5"><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${DRIVE_STATUS_COLORS[d.status]}`}>{DRIVE_STATUS_LABELS[d.status]}</span></td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/institutions/${instSlug}/placements/drives/${d.id}`} className="inline-flex items-center gap-1 text-[12px] font-medium text-purple-600 hover:text-purple-700">
                      Manage <ChevronRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New drive drawer */}
      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><Briefcase size={18} className="text-purple-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">New Placement Drive</h2></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              {noCompanies && <p className="text-[12px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg">No companies yet — add one from the Companies page first.</p>}
              <div>
                <label className={labelCls}>Company <span className="text-rose-500">*</span></label>
                <select className={inputCls} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                  <option value="">Select a company</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Job Role <span className="text-rose-500">*</span></label>
                <input className={inputCls} value={jobRole} onChange={(e) => setJobRole(e.target.value)} placeholder="e.g. Software Engineer" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Drive Date</label><input type="date" className={inputCls} value={driveDate} onChange={(e) => setDriveDate(e.target.value)} /></div>
                <div><label className={labelCls}>CTC (LPA)</label><input type="number" step="0.01" className={inputCls} value={ctc} onChange={(e) => setCtc(e.target.value)} placeholder="e.g. 8.5" /></div>
              </div>
              <div>
                <label className={labelCls}>Academic Year</label>
                <select className={inputCls} value={ayId} onChange={(e) => setAyId(e.target.value)}>
                  <option value="">Not linked</option>
                  {academicYears.map((y) => <option key={y.id} value={y.id}>{y.label}{y.is_current ? " (current)" : ""}</option>)}
                </select>
              </div>

              <div className="pt-1 border-t border-slate-100 dark:border-slate-800" />
              <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Eligibility</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Min CGPA</label><input type="number" step="0.01" className={inputCls} value={minCgpa} onChange={(e) => setMinCgpa(e.target.value)} placeholder="e.g. 7.0" /></div>
                <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300 mt-6">
                  <input type="checkbox" checked={noBacklogs} onChange={(e) => setNoBacklogs(e.target.checked)} className="accent-purple-600" /> No active backlogs
                </label>
              </div>
              <div>
                <label className={labelCls}>Eligible departments <span className="text-slate-400 font-normal">(none = all)</span></label>
                <div className="flex flex-wrap gap-1.5">
                  {departments.map((d) => (
                    <button type="button" key={d.id} onClick={() => toggleDept(d.id)}
                      className={`text-[11px] px-2 py-1 rounded-full border ${eligDepts.includes(d.id) ? "bg-purple-600 text-white border-purple-600" : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Process stages <span className="text-slate-400 font-normal">(comma-separated)</span></label>
                <input className={inputCls} value={stages} onChange={(e) => setStages(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={exclusive} onChange={(e) => setExclusive(e.target.checked)} className="accent-purple-600" />
                Exclusive — already-placed students can&apos;t register
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={handleCreate} disabled={busy || noCompanies} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                {busy ? "Creating…" : "Create Drive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
