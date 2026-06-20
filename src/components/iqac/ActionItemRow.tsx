"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, CalendarClock, AlertTriangle, Trash2 } from "lucide-react";
import { updateActionStatus, deleteActionItem, type ActionItem } from "@/actions/iqacMeetings";
import { ACTION_STATUSES, ACTION_STATUS_LABELS, ACTION_STATUS_STYLES, isActionOverdue, type ActionStatus } from "@/lib/iqac";

function fmt(d: string) { return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }

export function ActionItemRow({ institutionId, meetingId, item }: { institutionId: string; meetingId: string; item: ActionItem }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const overdue = isActionOverdue(item.dueDate, item.status);

  async function setStatus(status: ActionStatus) {
    setBusy(true);
    const res = await updateActionStatus({ institutionId, meetingId, id: item.id, status });
    setBusy(false);
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }
  async function remove() {
    if (!confirm("Delete this action item?")) return;
    const res = await deleteActionItem({ institutionId, meetingId, id: item.id });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-slate-800 dark:text-slate-200">{item.description}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
          {item.assignedToName && <span className="inline-flex items-center gap-1"><User size={11} /> {item.assignedToName}</span>}
          {item.dueDate && <span className={`inline-flex items-center gap-1 ${overdue ? "text-rose-500 font-medium" : ""}`}>{overdue ? <AlertTriangle size={11} /> : <CalendarClock size={11} />} {fmt(item.dueDate)}{overdue ? " · overdue" : ""}</span>}
        </div>
      </div>
      <select value={item.status} disabled={busy} onChange={(e) => setStatus(e.target.value as ActionStatus)}
        className={`text-[11px] font-medium rounded-full px-2 py-1 border-0 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer ${ACTION_STATUS_STYLES[item.status]}`}>
        {ACTION_STATUSES.map((s) => <option key={s} value={s}>{ACTION_STATUS_LABELS[s]}</option>)}
      </select>
      <button onClick={remove} className="p-1.5 rounded-md text-slate-300 hover:text-rose-500 shrink-0"><Trash2 size={14} /></button>
    </div>
  );
}
