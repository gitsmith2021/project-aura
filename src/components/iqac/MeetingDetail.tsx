"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, User, Save, Plus, ListChecks, Trash2, Loader2 } from "lucide-react";
import { updateMeeting, deleteMeeting, addActionItem, type MeetingDetail as MeetingDetailT } from "@/actions/iqacMeetings";
import { MEETING_STATUSES, MEETING_STATUS_LABELS, actionStats, type MeetingStatus } from "@/lib/iqac";
import { ActionItemRow } from "./ActionItemRow";

const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500";

type Staff = { id: string; full_name: string };

function fmt(d: string) { return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }); }

export function MeetingDetail({ institutionId, meeting, staff }: { institutionId: string; meeting: MeetingDetailT; staff: Staff[] }) {
  const router = useRouter();
  const [minutes, setMinutes] = useState(meeting.minutes ?? "");
  const [status, setStatus] = useState<MeetingStatus>(meeting.status);
  const [savingMinutes, setSavingMinutes] = useState(false);

  // add action
  const [adding, setAdding] = useState(false);
  const [desc, setDesc] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busyAdd, setBusyAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = actionStats(meeting.items.map((i) => ({ status: i.status })));

  async function saveMinutes() {
    setSavingMinutes(true);
    const res = await updateMeeting({
      institutionId, id: meeting.id, meetingDate: meeting.meetingDate, meetingNumber: meeting.meetingNumber,
      agenda: meeting.agenda, minutes, chairedBy: meeting.chairedById, status, academicYearId: meeting.academicYearId,
    });
    setSavingMinutes(false);
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }
  async function addItem() {
    if (!desc.trim()) { setError("Description is required."); return; }
    setBusyAdd(true); setError(null);
    const res = await addActionItem({ institutionId, meetingId: meeting.id, description: desc, assignedTo: assignedTo || null, dueDate: dueDate || null });
    setBusyAdd(false);
    if (!res.success) { setError(res.error); return; }
    setAdding(false); setDesc(""); setAssignedTo(""); setDueDate(""); router.refresh();
  }
  async function removeMeeting() {
    if (!confirm(`Delete IQAC Meeting #${meeting.meetingNumber}? Its action items will be removed.`)) return;
    const res = await deleteMeeting({ institutionId, id: meeting.id });
    if (!res.success) { alert(res.error); return; }
    router.push(`/institutions/${institutionId}/iqac/meetings`);
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <Link href={`/institutions/${institutionId}/iqac/meetings`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-violet-600 mb-2"><ArrowLeft size={13} /> All meetings</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">IQAC Meeting #{meeting.meetingNumber}</h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-3">
              <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {fmt(meeting.meetingDate)}</span>
              {meeting.chairedByName && <span className="inline-flex items-center gap-1"><User size={13} /> {meeting.chairedByName}</span>}
            </p>
          </div>
          <button onClick={removeMeeting} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 size={13} /> Delete</button>
        </div>
      </div>

      {/* Agenda */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Agenda</p>
        <p className="text-[13px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{meeting.agenda}</p>
      </div>

      {/* Minutes */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Minutes</p>
          <div className="flex items-center gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value as MeetingStatus)} className="text-[12px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500">
              {MEETING_STATUSES.map((s) => <option key={s} value={s}>{MEETING_STATUS_LABELS[s]}</option>)}
            </select>
            <button onClick={saveMinutes} disabled={savingMinutes} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">{savingMinutes ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save</button>
          </div>
        </div>
        <textarea value={minutes} onChange={(e) => setMinutes(e.target.value)} className={inputCls + " h-40 resize-y"} placeholder="Record the minutes of the meeting…" />
      </div>

      {/* Action items */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-slate-900 dark:text-white flex items-center gap-1.5"><ListChecks size={15} className="text-violet-500" /> Action items <span className="text-[11px] text-slate-400 font-normal">({stats.completed}/{stats.total} resolved · {stats.resolvedPct}%)</span></p>
          <button onClick={() => { setAdding((v) => !v); setError(null); }} className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"><Plus size={13} /> Add</button>
        </div>

        {adding && (
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
            {error && <p className="text-[12px] text-rose-600">{error}</p>}
            <input className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Action to be taken" />
            <div className="grid grid-cols-2 gap-2">
              <select className={inputCls} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                <option value="">Unassigned</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
              <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">Cancel</button>
              <button onClick={addItem} disabled={busyAdd} className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">{busyAdd ? "Adding…" : "Add item"}</button>
            </div>
          </div>
        )}

        {meeting.items.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-slate-400">No action items yet.</p>
        ) : (
          meeting.items.map((i) => <ActionItemRow key={i.id} institutionId={institutionId} meetingId={meeting.id} item={i} />)
        )}
      </div>
    </div>
  );
}
