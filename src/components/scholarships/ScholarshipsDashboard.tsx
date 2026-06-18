"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award, Plus, Pencil, Trash2, ChevronRight, Users, IndianRupee, Clock, CheckCircle2, Calendar,
} from "lucide-react";
import {
  SCHEME_TYPE_LABELS, SCHEME_TYPE_COLORS, scholarshipStats, formatINR,
  type ScholarshipScheme, type ScholarshipApplication,
} from "@/lib/scholarships";
import { deleteScheme } from "@/actions/scholarships";
import { SchemeDrawer } from "./SchemeDrawer";

type AY = { id: string; label: string; is_current: boolean };

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

export function ScholarshipsDashboard({
  institutionId, instSlug, academicYears, schemes, applications,
}: {
  institutionId: string; instSlug: string; academicYears: AY[];
  schemes: ScholarshipScheme[]; applications: ScholarshipApplication[];
}) {
  void academicYears;
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [editing, setEditing] = useState<ScholarshipScheme | null>(null);

  const stats = useMemo(() => scholarshipStats(applications), [applications]);

  function openAdd() { setMode("add"); setEditing(null); setDrawerOpen(true); }
  function openEdit(s: ScholarshipScheme) { setMode("edit"); setEditing(s); setDrawerOpen(true); }
  async function remove(id: string) { await deleteScheme({ institutionId, id }); router.refresh(); }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award size={22} className="text-purple-600" /> Scholarships
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            Government &amp; institutional schemes with auto-eligibility and fee-linked disbursement.
          </p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700">
          <Plus size={15} /> New Scheme
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Clock size={18} className="text-amber-600" />} label="Pending Review" value={stats.pending} accent="bg-amber-100 dark:bg-amber-950/40" />
        <StatCard icon={<CheckCircle2 size={18} className="text-violet-600" />} label="Approved" value={stats.approved} accent="bg-violet-100 dark:bg-violet-950/40" />
        <StatCard icon={<Users size={18} className="text-emerald-600" />} label="Disbursed" value={stats.disbursed} accent="bg-emerald-100 dark:bg-emerald-950/40" />
        <StatCard icon={<IndianRupee size={18} className="text-blue-600" />} label="Total Disbursed" value={formatINR(stats.totalDisbursed)} accent="bg-blue-100 dark:bg-blue-950/40" />
      </div>

      {schemes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">
          No scholarship schemes yet. Create one so students can apply.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {schemes.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-slate-900 dark:text-white">{s.name}</p>
                  <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${SCHEME_TYPE_COLORS[s.scheme_type]}`}>{SCHEME_TYPE_LABELS[s.scheme_type]}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"><Pencil size={13} /></button>
                  <button onClick={() => remove(s.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600"><Trash2 size={13} /></button>
                </div>
              </div>

              <div className="mt-3 space-y-1 text-[12px] text-slate-600 dark:text-slate-300 flex-1">
                <p className="flex items-center gap-1.5"><IndianRupee size={12} className="text-slate-400" /> {formatINR(s.amount_per_student)} per student</p>
                {s.application_deadline && <p className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-400" /> Deadline {new Date(s.application_deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>}
                {s.eligibility_criteria?.categories && s.eligibility_criteria.categories.length > 0 && (
                  <p className="text-[11px] text-slate-400">For: {s.eligibility_criteria.categories.join(", ")}</p>
                )}
                {!s.is_active && <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500">Inactive</span>}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">{s.application_count ?? 0} application{(s.application_count ?? 0) === 1 ? "" : "s"}</span>
                <Link href={`/institutions/${instSlug}/scholarships/${s.id}`} className="inline-flex items-center gap-1 text-[12px] font-medium text-purple-600 hover:text-purple-700">
                  Manage <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <SchemeDrawer open={drawerOpen} mode={mode} institutionId={institutionId} scheme={editing} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
