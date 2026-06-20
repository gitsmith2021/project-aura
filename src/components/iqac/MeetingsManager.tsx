"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { createMeeting, type MeetingRow } from "@/actions/iqacMeetings";
import { MEETING_STATUSES, MEETING_STATUS_LABELS, NAAC_MIN_MEETINGS_PER_YEAR, type MeetingStatus, type MeetingStats } from "@/lib/iqac";
import { MeetingCard } from "./MeetingCard";

const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

type Staff = { id: string; full_name: string };
type Year = { id: string; label: string; is_current: boolean };

export function MeetingsManager({ institutionId, initial, stats, staff, years }: {
  institutionId: string; initial: MeetingRow[]; stats: MeetingStats; staff: Staff[]; years: Year[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingNumber, setMeetingNumber] = useState(String(initial.length + 1));
  const [agenda, setAgenda] = useState("");
  const [chairedBy, setChairedBy] = useState("");
  const [status, setStatus] = useState<MeetingStatus>("scheduled");
  const [academicYearId, setAcademicYearId] = useState(years.find((y) => y.is_current)?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!agenda.trim()) { setError("Agenda is required."); return; }
    if (!meetingDate) { setError("Meeting date is required."); return; }
    setBusy(true); setError(null);
    const res = await createMeeting({
      institutionId, academicYearId: academicYearId || null, meetingDate,
      meetingNumber: Math.max(1, Number(meetingNumber) || 1), agenda, chairedBy: chairedBy || null, status,
    });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOpen(false); setAgenda(""); router.refresh();
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><CalendarDays size={22} className="text-violet-600" /> IQAC Meetings &amp; Actions</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Agendas, minutes and action-taken reports — NAAC Criterion 6.1 evidence.</p>
        </div>
        <button onClick={() => { setOpen(true); setError(null); setMeetingNumber(String(initial.length + 1)); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"><Plus size={15} /> New Meeting</button>
      </div>

      <div className={`rounded-xl border p-4 flex items-center gap-2 text-[13px] ${stats.compliant ? "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300" : "border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300"}`}>
        {stats.compliant ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
        {stats.total} meeting{stats.total !== 1 ? "s" : ""} recorded — {stats.compliant ? `meets the NAAC minimum of ${NAAC_MIN_MEETINGS_PER_YEAR}/year` : `NAAC expects at least ${NAAC_MIN_MEETINGS_PER_YEAR} per academic year`}. {stats.minutesPending > 0 && `${stats.minutesPending} awaiting minutes.`}
      </div>

      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No IQAC meetings recorded yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {initial.map((m) => <MeetingCard key={m.id} institutionId={institutionId} meeting={m} />)}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><CalendarDays size={18} className="text-violet-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">New IQAC Meeting</h2></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Meeting #</label><input type="number" min={1} className={inputCls} value={meetingNumber} onChange={(e) => setMeetingNumber(e.target.value)} /></div>
                <div><label className={labelCls}>Date <span className="text-rose-500">*</span></label><input type="date" className={inputCls} value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} /></div>
              </div>
              <div><label className={labelCls}>Academic year</label>
                <select className={inputCls} value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
                  <option value="">—</option>
                  {years.map((y) => <option key={y.id} value={y.id}>{y.label}{y.is_current ? " (current)" : ""}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Agenda <span className="text-rose-500">*</span></label><textarea className={inputCls + " h-24 resize-none"} value={agenda} onChange={(e) => setAgenda(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Chaired by</label>
                  <select className={inputCls} value={chairedBy} onChange={(e) => setChairedBy(e.target.value)}>
                    <option value="">—</option>
                    {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Status</label>
                  <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as MeetingStatus)}>
                    {MEETING_STATUSES.map((s) => <option key={s} value={s}>{MEETING_STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={save} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">{busy ? "Saving…" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
