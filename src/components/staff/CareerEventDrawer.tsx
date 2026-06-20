"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, UserCog, Upload } from "lucide-react";
import {
  CAREER_EVENT_TYPES, CAREER_EVENT_LABELS, type CareerEventType,
} from "@/lib/staffCareer";
import { recordCareerEvent } from "@/actions/staffCareer";
import { uploadDocument } from "@/lib/storage";

type StaffOption = { id: string; full_name: string; designation: string | null };
type DeptOption = { id: string; name: string };

const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500";
const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

export function CareerEventDrawer({
  institutionId, staffOptions, departmentOptions, lockedStaffId, onClose,
}: {
  institutionId: string;
  staffOptions: StaffOption[];
  departmentOptions: DeptOption[];
  /** When set, the staff picker is hidden and this id is always used (per-staff timeline page). */
  lockedStaffId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [staffId, setStaffId] = useState(lockedStaffId ?? "");
  const [eventType, setEventType] = useState<CareerEventType>("promotion");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [newBasicSalary, setNewBasicSalary] = useState("");
  const [newDesignation, setNewDesignation] = useState("");
  const [newDepartmentId, setNewDepartmentId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!staffId) { setError("Select a staff member."); return; }
    setBusy(true); setError(null);

    let documentUrl: string | null = null;
    if (file) {
      const up = await uploadDocument("staff-career-docs", file, staffId);
      if (!up.success) { setBusy(false); setError(up.error); return; }
      documentUrl = up.url;
    }

    const res = await recordCareerEvent({
      institutionId,
      staffId,
      eventType,
      effectiveDate,
      orderNumber: orderNumber || null,
      documentUrl,
      remarks: remarks || null,
      newBasicSalary: eventType === "increment" ? parseFloat(newBasicSalary) : undefined,
      newDesignation: eventType === "promotion" ? newDesignation : undefined,
      newDepartmentId: eventType === "transfer" ? newDepartmentId : undefined,
    });

    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <UserCog size={18} className="text-purple-500" />
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Record Career Event</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}

          {!lockedStaffId && (
            <div>
              <label className={labelCls}>Staff Member <span className="text-rose-500">*</span></label>
              <select className={inputCls} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                <option value="">Select staff…</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}{s.designation ? ` — ${s.designation}` : ""}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Event Type</label>
              <select className={inputCls} value={eventType} onChange={(e) => setEventType(e.target.value as CareerEventType)}>
                {CAREER_EVENT_TYPES.map((t) => <option key={t} value={t}>{CAREER_EVENT_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Effective Date</label>
              <input type="date" className={inputCls} value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            </div>
          </div>

          {eventType === "increment" && (
            <div>
              <label className={labelCls}>New Basic Salary (₹) <span className="text-rose-500">*</span></label>
              <input type="number" min="0" step="0.01" className={inputCls} value={newBasicSalary} onChange={(e) => setNewBasicSalary(e.target.value)} placeholder="e.g. 52000" />
              <p className="text-[11px] text-slate-400 mt-1">Deactivates the current salary structure and creates a new one effective on this date.</p>
            </div>
          )}

          {eventType === "promotion" && (
            <div>
              <label className={labelCls}>New Designation <span className="text-rose-500">*</span></label>
              <input className={inputCls} value={newDesignation} onChange={(e) => setNewDesignation(e.target.value)} placeholder="e.g. Associate Professor" />
            </div>
          )}

          {eventType === "transfer" && (
            <div>
              <label className={labelCls}>New Department <span className="text-rose-500">*</span></label>
              <select className={inputCls} value={newDepartmentId} onChange={(e) => setNewDepartmentId(e.target.value)}>
                <option value="">Select department…</option>
                {departmentOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}

          {(eventType === "resignation" || eventType === "retirement" || eventType === "termination") && (
            <p className="text-[12px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg">
              This will deactivate the staff member&#39;s account (is_active = false) effective immediately.
            </p>
          )}

          <div>
            <label className={labelCls}>Order / Reference Number</label>
            <input className={inputCls} value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="e.g. HR/2026/0142" />
          </div>

          <div>
            <label className={labelCls}>Scanned Order / Letter (optional)</label>
            <label className="flex items-center gap-2 px-3 py-2 text-[12px] rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              <Upload size={14} />
              {file ? file.name : "Choose file…"}
              <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          <div>
            <label className={labelCls}>Remarks</label>
            <textarea className={`${inputCls} min-h-[80px]`} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional context…" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
          <button onClick={submit} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
            {busy ? "Saving…" : "Record Event"}
          </button>
        </div>
      </div>
    </div>
  );
}
