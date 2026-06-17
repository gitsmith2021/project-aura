"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap, Users, Briefcase, Link2, Download, UserPlus, DownloadCloud,
  Megaphone, Search, Pencil, X, MapPin, Building2, Layers,
} from "lucide-react";
import {
  alumniStats, employmentRate, filterAlumni, alumniToCSV, graduationYearToBatch,
  programLabel, type Alumnus,
} from "@/lib/alumni";
import { importGraduates, setAlumniActive } from "@/actions/alumni";
import { AlumniDrawer } from "./AlumniDrawer";

type Dept = { id: string; name: string };

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{label}</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
      </div>
    </div>
  );
}

export function AlumniDirectoryView({
  institutionId,
  instSlug,
  departments,
  initial,
}: {
  institutionId: string;
  instSlug: string;
  departments: Dept[];
  initial: Alumnus[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [year, setYear] = useState<number | "all">("all");
  const [deptId, setDeptId] = useState<string | "all">("all");
  const [program, setProgram] = useState<string | "all">("all");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");
  const [editing, setEditing] = useState<Alumnus | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importYear, setImportYear] = useState<number>(new Date().getFullYear());
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const deptName = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d.name])), [departments]);
  const years = useMemo(
    () => [...new Set(initial.map((a) => a.graduation_year))].sort((a, b) => b - a),
    [initial]
  );

  const stats = useMemo(() => alumniStats(initial), [initial]);
  const empRate = useMemo(() => employmentRate(initial), [initial]);

  const filtered = useMemo(
    () => filterAlumni(initial, { search, year, departmentId: deptId, program }),
    [initial, search, year, deptId, program]
  );

  function openAdd() { setDrawerMode("add"); setEditing(null); setDrawerOpen(true); }
  function openEdit(a: Alumnus) { setDrawerMode("edit"); setEditing(a); setDrawerOpen(true); }

  function exportCSV() {
    const csv = alumniToCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alumni-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function runImport() {
    setImportBusy(true);
    setImportMsg(null);
    const res = await importGraduates({ institutionId, graduationYear: Number(importYear) });
    setImportBusy(false);
    if (!res.success) { setImportMsg(res.error); return; }
    setImportMsg(`Imported ${res.data.imported} graduate${res.data.imported === 1 ? "" : "s"}${res.data.skipped ? ` · ${res.data.skipped} already present` : ""}.`);
    router.refresh();
  }

  async function toggleActive(a: Alumnus) {
    await setAlumniActive({ institutionId, id: a.id, isActive: !a.is_active });
    router.refresh();
  }

  const selectCls =
    "px-2.5 py-1.5 text-[12px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500";

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap size={22} className="text-purple-600" /> Alumni
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            Directory of graduates, their professional details, and batch outreach.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/institutions/${instSlug}/alumni/announcements`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Megaphone size={15} /> Announcements
          </Link>
          <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30">
            <DownloadCloud size={15} /> Import Graduates
          </button>
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700">
            <UserPlus size={15} /> Add Alumnus
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Users size={18} className="text-purple-600" />} label="Total Alumni" value={stats.total} accent="bg-purple-100 dark:bg-purple-950/40" />
        <StatCard icon={<Briefcase size={18} className="text-emerald-600" />} label="Employment Rate" value={`${empRate}%`} accent="bg-emerald-100 dark:bg-emerald-950/40" />
        <StatCard icon={<Layers size={18} className="text-blue-600" />} label="Graduating Batches" value={stats.batches} accent="bg-blue-100 dark:bg-blue-950/40" />
        <StatCard icon={<Link2 size={18} className="text-cyan-600" />} label="On LinkedIn" value={stats.withLinkedIn} accent="bg-cyan-100 dark:bg-cyan-950/40" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, employer, city…"
            className="w-full pl-8 pr-3 py-1.5 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select className={selectCls} value={String(year)} onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))}>
          <option value="all">All years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className={selectCls} value={deptId} onChange={(e) => setDeptId(e.target.value)}>
          <option value="all">All departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className={selectCls} value={program} onChange={(e) => setProgram(e.target.value)}>
          <option value="all">All programmes</option>
          <option value="UG">UG</option>
          <option value="PG">PG</option>
        </select>
        <button onClick={exportCSV} disabled={filtered.length === 0} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
          <Download size={14} /> CSV
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Name</th>
              <th className="text-left font-medium px-4 py-2.5">Batch</th>
              <th className="text-left font-medium px-4 py-2.5">Department</th>
              <th className="text-left font-medium px-4 py-2.5">Currently</th>
              <th className="text-left font-medium px-4 py-2.5">Location</th>
              <th className="text-right font-medium px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No alumni match these filters.</td></tr>
            ) : filtered.map((a) => (
              <tr key={a.id} className={`hover:bg-slate-50 dark:hover:bg-slate-900/40 ${a.is_active ? "" : "opacity-50"}`}>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    {a.full_name}
                    {a.profile_id && <span title="Has portal login" className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    {!a.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500">Inactive</span>}
                  </div>
                  {(a.email || a.roll_no) && (
                    <div className="text-[11px] text-slate-400">{[a.roll_no, a.email].filter(Boolean).join(" · ")}</div>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                  {a.batch ?? graduationYearToBatch(a.graduation_year, a.program)}
                  <div className="text-[11px] text-slate-400">{programLabel(a.program)}</div>
                </td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{a.department_id ? (deptName[a.department_id] ?? "—") : "—"}</td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                  {a.current_employer ? (
                    <div className="flex items-center gap-1.5">
                      <Building2 size={13} className="text-slate-400 shrink-0" />
                      <span>{a.current_employer}{a.current_designation ? ` · ${a.current_designation}` : ""}</span>
                    </div>
                  ) : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                  {a.city ? <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-slate-400" /> {a.city}</span> : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {a.linkedin_url && (
                      <a href={a.linkedin_url} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="p-1.5 rounded-lg text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/30">
                        <Link2 size={14} />
                      </a>
                    )}
                    <button onClick={() => openEdit(a)} title="Edit" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => toggleActive(a)} title={a.is_active ? "Deactivate" : "Reactivate"} className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                      {a.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit drawer */}
      <AlumniDrawer
        open={drawerOpen}
        mode={drawerMode}
        institutionId={institutionId}
        departments={departments}
        alumnus={editing}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Import Graduates drawer */}
      {importOpen && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setImportOpen(false)} />
          <div className="relative w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <DownloadCloud size={18} className="text-purple-500" />
                <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Import Graduates</h2>
              </div>
              <button onClick={() => setImportOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 px-5 py-4 space-y-4">
              <p className="text-[13px] text-slate-600 dark:text-slate-300">
                Pulls every student marked <span className="font-medium">graduated</span> (via Year Promotion) into the alumni
                directory, carrying over their login. Students already imported are skipped.
              </p>
              <div>
                <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Graduation year to tag</label>
                <input
                  type="number"
                  value={importYear}
                  onChange={(e) => setImportYear(Number(e.target.value))}
                  min={1900}
                  max={new Date().getFullYear() + 1}
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              {importMsg && (
                <p className="text-[12px] px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300">{importMsg}</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setImportOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                Close
              </button>
              <button onClick={runImport} disabled={importBusy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                {importBusy ? "Importing…" : "Run Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
