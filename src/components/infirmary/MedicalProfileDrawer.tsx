"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { upsertMedicalRecord, type MedicalRecord } from "@/actions/infirmary";
import { BLOOD_GROUPS } from "@/lib/infirmary";

type Props = {
  institutionId: string;
  record: MedicalRecord | null;
  studentId: string;
  studentName: string;
  onClose: () => void;
  onSaved: (updated: MedicalRecord) => void;
};

export function MedicalProfileDrawer({
  institutionId,
  record,
  studentId,
  studentName,
  onClose,
  onSaved,
}: Props) {
  const [bloodGroup, setBloodGroup] = useState(record?.blood_group ?? "");
  const [allergies, setAllergies] = useState(record?.known_allergies ?? "");
  const [conditions, setConditions] = useState(record?.chronic_conditions ?? "");
  const [contactName, setContactName] = useState(record?.emergency_contact_name ?? "");
  const [contactPhone, setContactPhone] = useState(record?.emergency_contact_phone ?? "");
  const [insurance, setInsurance] = useState(record?.insurance_policy ?? "");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setBusy(true); setError(null);
    const res = await upsertMedicalRecord({
      institutionId,
      studentId,
      bloodGroup: bloodGroup || undefined,
      knownAllergies: allergies || undefined,
      chronicConditions: conditions || undefined,
      emergencyContactName: contactName || undefined,
      emergencyContactPhone: contactPhone || undefined,
      insurancePolicy: insurance || undefined,
    });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    onSaved({
      id: res.data.id,
      institution_id: institutionId,
      student_id: studentId,
      blood_group: bloodGroup || null,
      known_allergies: allergies || null,
      chronic_conditions: conditions || null,
      emergency_contact_name: contactName || null,
      emergency_contact_phone: contactPhone || null,
      insurance_policy: insurance || null,
      updated_at: new Date().toISOString(),
    });
  };

  const inputCls = "w-full h-8 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500";
  const textareaCls = "w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none";
  const labelCls = "block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1";

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-50 w-full max-w-md bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Medical Profile</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{studentName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          <div>
            <label className={labelCls}>Blood Group</label>
            <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className={inputCls}>
              <option value="">— Not recorded —</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Known Allergies</label>
            <textarea
              rows={2}
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="e.g. Penicillin, Sulfa drugs, Peanuts"
              className={textareaCls}
            />
          </div>

          <div>
            <label className={labelCls}>Chronic Conditions</label>
            <textarea
              rows={2}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="e.g. Asthma, Diabetes Type 1, Epilepsy"
              className={textareaCls}
            />
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Emergency Contact</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Contact Name</label>
                <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Parent / Guardian name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Contact Phone</label>
                <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+91 98765 43210" className={inputCls} />
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Insurance Policy Number</label>
            <input value={insurance} onChange={(e) => setInsurance(e.target.value)} placeholder="e.g. HDFC-ERGO-2025-XXXXXX" className={inputCls} />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button onClick={handleSave} disabled={busy} className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {busy ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </aside>
    </div>
  );
}
