"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardCheck, CheckCircle2, BarChart2, Loader2 } from "lucide-react";
import {
  STATUS_LABELS, STATUS_COLORS, MARKABLE_STATUSES, type StaffAttStatus,
} from "@/lib/staffAttendance";
import { getDailyRegister, markStaffAttendance, bulkMarkPresent, type RegisterRow } from "@/actions/staffAttendance";

export function DailyRegister({
  institutionId, instSlug, initialDate, initial,
}: {
  institutionId: string; instSlug: string; initialDate: string; initial: RegisterRow[];
}) {
  const [date, setDate] = useState(initialDate);
  const [rows, setRows] = useState<RegisterRow[]>(initial);
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function refetch(d: string) {
    setBusy(true);
    const res = await getDailyRegister(institutionId, d);
    setBusy(false);
    if (res.success) setRows(res.data);
  }

  async function changeDate(d: string) { setDate(d); setMsg(null); await refetch(d); }

  async function setStatus(staffId: string, status: StaffAttStatus, lateReason?: string | null) {
    setSavingId(staffId);
    setRows((prev) => prev.map((r) => (r.staffId === staffId ? { ...r, status, lateReason: lateReason ?? r.lateReason } : r)));
    await markStaffAttendance({ institutionId, staffId, date, status, lateReason: lateReason ?? null });
    setSavingId(null);
  }

  async function markAll() {
    setBusy(true); setMsg(null);
    const res = await bulkMarkPresent({ institutionId, date });
    if (res.success) setMsg(`Marked ${res.data.marked} staff present.`);
    await refetch(date);
    setBusy(false);
  }

  const marked = rows.filter((r) => r.status).length;
  const selectCls = "px-2 py-1 text-[12px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500";

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck size={22} className="text-purple-600" /> Staff Attendance
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            Daily campus attendance — mark everyone present, then set exceptions. Approved leave is auto-marked.
          </p>
        </div>
        <Link href={`/institutions/${instSlug}/staff-attendance/reports`} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
          <BarChart2 size={15} /> Monthly Reports
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input type="date" value={date} onChange={(e) => changeDate(e.target.value)} className="px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
        <button onClick={markAll} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Mark all present
        </button>
        <span className="text-[12px] text-slate-400">{marked}/{rows.length} marked</span>
        {msg && <span className="text-[12px] text-emerald-600">{msg}</span>}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Staff</th>
              <th className="text-left font-medium px-4 py-2.5">Department</th>
              <th className="text-left font-medium px-4 py-2.5">Status</th>
              <th className="text-left font-medium px-4 py-2.5">Set</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">No active staff found.</td></tr>
            ) : rows.map((r) => {
              const locked = r.status === "on_leave" || r.status === "holiday";
              return (
                <tr key={r.staffId} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-900 dark:text-white">{r.name}</div>
                    {r.designation && <div className="text-[11px] text-slate-400">{r.designation}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{r.department ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {r.status
                      ? <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                      : <span className="text-[11px] text-slate-400">Not marked</span>}
                    {savingId === r.staffId && <Loader2 size={11} className="inline ml-2 animate-spin text-slate-400" />}
                  </td>
                  <td className="px-4 py-2.5">
                    {locked ? (
                      <span className="text-[11px] text-slate-400 italic">{r.status === "on_leave" ? "Approved leave" : "Holiday"}</span>
                    ) : (
                      <select className={selectCls} value={r.status ?? ""} onChange={(e) => setStatus(r.staffId, e.target.value as StaffAttStatus)}>
                        <option value="" disabled>Set status</option>
                        {MARKABLE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
