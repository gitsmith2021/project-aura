"use client";

import { useState } from "react";
import { PlusCircle, Stethoscope, CalendarClock, TrendingUp, RefreshCw } from "lucide-react";
import { getTodaysVisits, getPendingFollowUps, type MedicalVisit } from "@/actions/infirmary";
import { computeInfirmaryStats, followUpStatus, followUpBadgeClass, parseMedicines, medicineLabel } from "@/lib/infirmary";
import { VisitDrawer } from "./VisitDrawer";

type Props = {
  institutionId: string;
  initialVisits: MedicalVisit[];
  initialFollowUps: MedicalVisit[];
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function StatCard({ label, value, sub, icon }: { label: string; value: number | string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-none mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function InfirmaryDashboard({ institutionId, initialVisits, initialFollowUps }: Props) {
  const [visits, setVisits] = useState<MedicalVisit[]>(initialVisits);
  const [followUps, setFollowUps] = useState<MedicalVisit[]>(initialFollowUps);
  const [showDrawer, setShowDrawer] = useState(false);
  const [loading, setLoading] = useState(false);

  const stats = computeInfirmaryStats([...visits, ...followUps]);

  const refresh = async () => {
    setLoading(true);
    const [vRes, fRes] = await Promise.all([
      getTodaysVisits(institutionId),
      getPendingFollowUps(institutionId),
    ]);
    if (vRes.success) setVisits(vRes.data);
    if (fRes.success) setFollowUps(fRes.data);
    setLoading(false);
  };

  return (
    <div className="px-6 pt-6 pb-10 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Infirmary</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowDrawer(true)}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusCircle size={14} />
            Log Visit
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Today's Visits" value={stats.todayVisits} icon={<Stethoscope size={16} />} />
        <StatCard label="Pending Follow-ups" value={stats.pendingFollowUps} sub="today + overdue" icon={<CalendarClock size={16} />} />
        <StatCard label="Referrals this month" value={stats.referralsThisMonth} icon={<TrendingUp size={16} />} />
        <StatCard label="Total this month" value={stats.totalThisMonth} icon={<Stethoscope size={16} />} />
      </div>

      {/* Today's visits */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
          Today&apos;s Visits ({visits.length})
        </h2>
        {visits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 py-12 text-center">
            <Stethoscope size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs text-slate-400">No visits recorded today.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Time</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Patient</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Symptoms</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Diagnosis</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Medicines</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Follow-up</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Attended By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visits.map((v) => {
                  const meds = parseMedicines(v.medicines_dispensed);
                  const fStatus = followUpStatus(v.follow_up_date);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmt(v.visit_date)}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{v.patient_name ?? "—"}</p>
                        {v.roll_no && <p className="text-slate-400 text-[10px]">{v.roll_no}</p>}
                        <span className={`inline-flex mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${v.patient_type === "student" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"}`}>
                          {v.patient_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 max-w-[160px]">
                        <p className="line-clamp-2">{v.symptoms}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 max-w-[140px]">
                        <p className="line-clamp-2">{v.diagnosis ?? "—"}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                        {meds.length > 0 ? (
                          <ul className="space-y-0.5">
                            {meds.map((m, i) => <li key={i} className="text-[10px]">{medicineLabel(m)}</li>)}
                          </ul>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {v.follow_up_date ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${followUpBadgeClass(fStatus)}`}>
                            {v.follow_up_date}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{v.attended_by ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pending follow-ups */}
      {followUps.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CalendarClock size={14} />
            Pending Follow-ups ({followUps.length})
          </h2>
          <div className="overflow-x-auto rounded-xl border border-amber-200 dark:border-amber-800/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800/40">
                <tr>
                  <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Patient</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Last Visit</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Diagnosis</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Follow-up Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 dark:divide-amber-900/20">
                {followUps.map((v) => {
                  const fStatus = followUpStatus(v.follow_up_date);
                  return (
                    <tr key={v.id} className="hover:bg-amber-50/50 dark:hover:bg-amber-950/10">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{v.patient_name ?? "—"}</p>
                        {v.roll_no && <p className="text-slate-400 text-[10px]">{v.roll_no}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{fmtDate(v.visit_date)}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{v.diagnosis ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${followUpBadgeClass(fStatus)}`}>
                          {fStatus === "overdue" ? "Overdue — " : fStatus === "today" ? "Today — " : ""}
                          {v.follow_up_date}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showDrawer && (
        <VisitDrawer
          institutionId={institutionId}
          onClose={() => setShowDrawer(false)}
          onSaved={() => { setShowDrawer(false); refresh(); }}
        />
      )}
    </div>
  );
}
