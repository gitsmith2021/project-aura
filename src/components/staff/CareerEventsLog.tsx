"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  UserCog, Plus, Search, Download, ChevronRight, TrendingUp, ArrowRightLeft, LogOut,
} from "lucide-react";
import {
  CAREER_EVENT_TYPES, CAREER_EVENT_LABELS, CAREER_EVENT_COLORS,
  careerStats, filterCareerEvents, careerEventsCSV,
  type CareerEventType, type StaffCareerEvent,
} from "@/lib/staffCareer";
import { CareerEventDrawer } from "./CareerEventDrawer";

type StaffOption = { id: string; full_name: string; designation: string | null };
type DeptOption = { id: string; name: string };

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

export function CareerEventsLog({
  institutionId, instSlug, staffOptions, departmentOptions, initial,
}: {
  institutionId: string;
  instSlug: string;
  staffOptions: StaffOption[];
  departmentOptions: DeptOption[];
  initial: StaffCareerEvent[];
}) {
  const [eventType, setEventType] = useState<CareerEventType | "all">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => careerStats(initial), [initial]);
  const filtered = useMemo(() => filterCareerEvents(initial, { eventType, search }), [initial, eventType, search]);

  function exportCSV() {
    const blob = new Blob([careerEventsCSV(filtered)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `staff-career-events-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const selectCls = "px-2.5 py-1.5 text-[12px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500";

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCog size={22} className="text-purple-600" /> Staff Career Lifecycle
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            Joining, confirmation, promotions, increments, transfers and offboarding — full audit trail.
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700">
          <Plus size={15} /> Record Event
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<UserCog size={18} className="text-purple-600" />} label="Total Events" value={stats.total} accent="bg-purple-100 dark:bg-purple-950/40" />
        <StatCard icon={<TrendingUp size={18} className="text-teal-600" />} label="Promotions" value={stats.promotions} accent="bg-teal-100 dark:bg-teal-950/40" />
        <StatCard icon={<ArrowRightLeft size={18} className="text-amber-600" />} label="Increments" value={stats.increments} accent="bg-amber-100 dark:bg-amber-950/40" />
        <StatCard icon={<LogOut size={18} className="text-rose-600" />} label="Offboarded" value={stats.offboarded} accent="bg-rose-100 dark:bg-rose-950/40" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff, order number…"
            className="w-full pl-8 pr-3 py-1.5 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <select className={selectCls} value={eventType} onChange={(e) => setEventType(e.target.value as CareerEventType | "all")}>
          <option value="all">All event types</option>
          {CAREER_EVENT_TYPES.map((t) => <option key={t} value={t}>{CAREER_EVENT_LABELS[t]}</option>)}
        </select>
        <button onClick={exportCSV} disabled={filtered.length === 0} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
          <Download size={14} /> NAAC CSV
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Date</th>
              <th className="text-left font-medium px-4 py-2.5">Staff</th>
              <th className="text-left font-medium px-4 py-2.5">Department</th>
              <th className="text-left font-medium px-4 py-2.5">Event</th>
              <th className="text-left font-medium px-4 py-2.5">Change</th>
              <th className="text-right font-medium px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No career events match these filters.</td></tr>
            ) : filtered.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                  {new Date(e.effective_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{e.staff?.full_name ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{e.staff?.departments?.name ?? "—"}</td>
                <td className="px-4 py-2.5"><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CAREER_EVENT_COLORS[e.event_type]}`}>{CAREER_EVENT_LABELS[e.event_type]}</span></td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                  {e.previous_value || e.new_value ? `${e.previous_value ?? "—"} → ${e.new_value ?? "—"}` : "—"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link href={`/institutions/${instSlug}/staff/career/${e.staff_id}`} className="inline-flex items-center gap-1 text-[12px] font-medium text-purple-600 hover:text-purple-700">
                    Timeline <ChevronRight size={13} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <CareerEventDrawer
          institutionId={institutionId}
          staffOptions={staffOptions}
          departmentOptions={departmentOptions}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
