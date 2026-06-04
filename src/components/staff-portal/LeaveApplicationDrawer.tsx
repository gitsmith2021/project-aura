"use client";

import { useState } from "react";
import { X, CalendarOff } from "lucide-react";
import { applyForLeave } from "@/actions/staffPortal";
import type { LeaveType } from "@/types/staffPortal";

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "sick",       label: "Sick Leave" },
  { value: "casual",     label: "Casual Leave" },
  { value: "earned",     label: "Earned Leave" },
  { value: "maternity",  label: "Maternity Leave" },
  { value: "paternity",  label: "Paternity Leave" },
  { value: "other",      label: "Other" },
];

type Props = {
  isOpen:        boolean;
  staffId:       string;
  institutionId: string;
  onClose:       () => void;
  onSuccess:     () => void;
};

function daysBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  const a = new Date(from), b = new Date(to);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1);
}

export function LeaveApplicationDrawer({ isOpen, staffId, institutionId, onClose, onSuccess }: Props) {
  const [leaveType, setLeaveType] = useState<LeaveType>("casual");
  const [fromDate,  setFromDate]  = useState("");
  const [toDate,    setToDate]    = useState("");
  const [reason,    setReason]    = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const days = daysBetween(fromDate, toDate);

  function reset() {
    setLeaveType("casual"); setFromDate(""); setToDate(""); setReason(""); setError("");
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!fromDate || !toDate) { setError("Please select both dates."); return; }
    if (reason.trim().length < 10) { setError("Reason must be at least 10 characters."); return; }

    setLoading(true);
    const result = await applyForLeave({ staffId, institutionId, leave_type: leaveType, from_date: fromDate, to_date: toDate, reason });
    setLoading(false);

    if (!result.success) { setError(result.error); return; }
    reset(); onSuccess(); onClose();
  }

  const inp = "w-full px-3 py-2 bg-white/60 dark:bg-slate-800/60 border border-white/30 dark:border-slate-700/50 rounded-lg text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 transition-colors";
  const lbl = "block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5";

  return (
    <div className={`fixed inset-0 z-50 flex justify-end ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`} onClick={handleClose} />

      <div className={`relative w-full max-w-md h-full flex flex-col bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-l border-white/20 dark:border-slate-800 shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/20 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 border border-amber-200/60 dark:border-amber-700/40 flex items-center justify-center">
              <CalendarOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Apply for Leave</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Submit a leave request</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form id="leave-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-xs text-red-600 dark:text-red-400">{error}</div>
          )}

          <div>
            <label className={lbl}>Leave Type <span className="text-violet-500 normal-case font-normal">*</span></label>
            <select value={leaveType} onChange={e => setLeaveType(e.target.value as LeaveType)} required className={inp + " appearance-none cursor-pointer"}>
              {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>From Date <span className="text-violet-500 normal-case font-normal">*</span></label>
              <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); if (toDate && e.target.value > toDate) setToDate(e.target.value); }} required className={inp} />
            </div>
            <div>
              <label className={lbl}>To Date <span className="text-violet-500 normal-case font-normal">*</span></label>
              <input type="date" value={toDate} min={fromDate} onChange={e => setToDate(e.target.value)} required className={inp} />
            </div>
          </div>

          {days > 0 && (
            <div className="px-3 py-2 rounded-lg bg-violet-50/80 dark:bg-violet-900/20 border border-violet-200/60 dark:border-violet-800/40 text-xs text-violet-700 dark:text-violet-300">
              <strong>{days} day{days !== 1 ? "s" : ""}</strong> leave requested
            </div>
          )}

          <div>
            <label className={lbl}>Reason <span className="text-violet-500 normal-case font-normal">* (min 10 chars)</span></label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              placeholder="Please describe the reason for your leave request…"
              required
              className={inp + " resize-none"}
            />
            <p className={`text-[10px] mt-1 ${reason.length >= 10 ? "text-emerald-500" : "text-slate-400"}`}>
              {reason.length} characters
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-white/20 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md flex justify-end gap-2.5">
          <button type="button" onClick={handleClose} className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          <button type="submit" form="leave-form" disabled={loading} className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 border border-violet-700 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center gap-1.5 shadow-sm">
            {loading && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}
