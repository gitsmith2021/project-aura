"use client";

import { useState, useCallback } from "react";
import { X, Search, Plus, Trash2 } from "lucide-react";
import {
  searchPatientsForInfirmary,
  logVisit,
  type InfirmaryPatientOption,
} from "@/actions/infirmary";
import { BLOOD_GROUPS } from "@/lib/infirmary";

type MedicineRow = { name: string; dosage: string; quantity: string };

type Props = {
  institutionId: string;
  onClose: () => void;
  onSaved: () => void;
};

export function VisitDrawer({ institutionId, onClose, onSaved }: Props) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<InfirmaryPatientOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [patient, setPatient] = useState<InfirmaryPatientOption | null>(null);

  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [referredTo, setReferredTo] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [attendedBy, setAttendedBy] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setOptions([]); return; }
    setSearching(true);
    const res = await searchPatientsForInfirmary(institutionId, q);
    setSearching(false);
    setOptions(res.success ? res.data : []);
  }, [institutionId]);

  const pickPatient = (p: InfirmaryPatientOption) => {
    setPatient(p);
    setQuery(p.name);
    setOptions([]);
  };

  const addMedicine = () => setMedicines((prev) => [...prev, { name: "", dosage: "", quantity: "" }]);
  const removeMedicine = (i: number) => setMedicines((prev) => prev.filter((_, idx) => idx !== i));
  const updateMedicine = (i: number, field: keyof MedicineRow, value: string) =>
    setMedicines((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));

  const handleSubmit = async () => {
    if (!patient) { setError("Please select a patient."); return; }
    if (!symptoms.trim()) { setError("Symptoms are required."); return; }
    setBusy(true); setError(null);

    const validMeds = medicines.filter((m) => m.name.trim());
    const res = await logVisit({
      institutionId,
      patientId: patient.profileId,
      patientType: patient.type,
      symptoms,
      diagnosis: diagnosis || undefined,
      treatmentGiven: treatment || undefined,
      medicinesDispensed: validMeds.length ? validMeds : undefined,
      referredTo: referredTo || undefined,
      followUpDate: followUpDate || undefined,
      attendedBy: attendedBy || undefined,
    });

    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    onSaved();
  };

  const inputCls = "w-full h-8 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500";
  const textareaCls = "w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none";
  const labelCls = "block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1";

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-50 w-full max-w-md bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Log Patient Visit</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Patient search */}
          <div>
            <label className={labelCls}>Patient <span className="text-red-500">*</span></label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => { setPatient(null); search(e.target.value); }}
                placeholder="Search student or staff name…"
                className={`${inputCls} pl-7`}
              />
              {options.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-10 mt-1 max-h-48 overflow-y-auto">
                  {options.map((o) => (
                    <button
                      key={o.profileId}
                      type="button"
                      onClick={() => pickPatient(o)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center gap-2"
                    >
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${o.type === "student" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"}`}>
                        {o.type}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-100">{o.name}</span>
                      {o.rollNo && <span className="text-slate-400">· {o.rollNo}</span>}
                    </button>
                  ))}
                </div>
              )}
              {searching && <p className="text-[10px] text-slate-400 mt-1">Searching…</p>}
            </div>
            {patient && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                ✓ {patient.name} ({patient.type})
              </p>
            )}
          </div>

          {/* Symptoms */}
          <div>
            <label className={labelCls}>Symptoms / Chief Complaint <span className="text-red-500">*</span></label>
            <textarea rows={2} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="e.g. Fever, headache, body aches since 2 days" className={textareaCls} />
          </div>

          {/* Diagnosis */}
          <div>
            <label className={labelCls}>Diagnosis</label>
            <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Viral fever" className={inputCls} />
          </div>

          {/* Treatment */}
          <div>
            <label className={labelCls}>Treatment Given</label>
            <textarea rows={2} value={treatment} onChange={(e) => setTreatment(e.target.value)} placeholder="e.g. Rest, ORS, Paracetamol 500mg" className={textareaCls} />
          </div>

          {/* Medicines */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls + " mb-0"}>Medicines Dispensed</label>
              <button type="button" onClick={addMedicine} className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:text-indigo-800">
                <Plus size={11} /> Add
              </button>
            </div>
            <div className="space-y-1.5">
              {medicines.map((m, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <input value={m.name} onChange={(e) => updateMedicine(i, "name", e.target.value)} placeholder="Name" className="flex-1 h-7 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200" />
                  <input value={m.dosage} onChange={(e) => updateMedicine(i, "dosage", e.target.value)} placeholder="Dosage" className="w-20 h-7 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200" />
                  <input value={m.quantity} onChange={(e) => updateMedicine(i, "quantity", e.target.value)} placeholder="Qty" className="w-14 h-7 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200" />
                  <button type="button" onClick={() => removeMedicine(i)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={11} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Referral */}
          <div>
            <label className={labelCls}>Referred To (External Hospital / Doctor)</label>
            <input value={referredTo} onChange={(e) => setReferredTo(e.target.value)} placeholder="e.g. City General Hospital — Dr. Sharma" className={inputCls} />
          </div>

          {/* Follow-up */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Follow-up Date</label>
              <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Attended By</label>
              <input value={attendedBy} onChange={(e) => setAttendedBy(e.target.value)} placeholder="Doctor / Nurse name" className={inputCls} />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={busy || !patient || !symptoms.trim()} className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {busy ? "Saving…" : "Log Visit"}
          </button>
        </div>
      </aside>
    </div>
  );
}
