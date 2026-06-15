"use client";

import { Heart, AlertTriangle, Phone, Droplets, ClipboardList, CalendarClock } from "lucide-react";
import { followUpStatus, followUpBadgeClass, parseMedicines, medicineLabel } from "@/lib/infirmary";
import type { MedicalRecord, MedicalVisit } from "@/actions/infirmary";

type Props = {
  record: MedicalRecord | null;
  visits: MedicalVisit[];
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-slate-800 dark:text-slate-100">{value || "Not recorded"}</span>
    </div>
  );
}

const BLOOD_GROUP_COLOR: Record<string, string> = {
  "A+": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "A-": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "B+": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "B-": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "AB+": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "AB-": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "O+": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "O-": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export function MyHealthView({ record, visits }: Props) {
  const pendingFollowUps = visits.filter((v) => {
    const s = followUpStatus(v.follow_up_date);
    return s === "today" || s === "overdue" || s === "upcoming";
  });

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">My Health Record</h1>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Your infirmary visits and medical profile on file.</p>
      </div>

      {/* Medical Profile */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Heart size={15} className="text-red-500" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Health Profile</h2>
        </div>

        {!record ? (
          <p className="text-xs text-slate-400 italic">No medical profile on file. Visit the campus infirmary to register your health information.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="flex items-center gap-3 col-span-2">
              <Droplets size={14} className="text-red-500 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Blood Group</p>
                {record.blood_group ? (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold mt-0.5 ${BLOOD_GROUP_COLOR[record.blood_group] ?? "bg-slate-100 text-slate-700"}`}>
                    {record.blood_group}
                  </span>
                ) : (
                  <p className="text-sm text-slate-400 italic">Not recorded</p>
                )}
              </div>
            </div>

            {record.known_allergies && (
              <div className="col-span-2 flex gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg p-3">
                <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Known Allergies</p>
                  <p className="text-xs text-amber-800 dark:text-amber-200 mt-0.5">{record.known_allergies}</p>
                </div>
              </div>
            )}

            <InfoRow label="Chronic Conditions" value={record.chronic_conditions} />
            <InfoRow label="Insurance Policy" value={record.insurance_policy} />

            {(record.emergency_contact_name || record.emergency_contact_phone) && (
              <div className="col-span-2 flex gap-3 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                <Phone size={14} className="text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Emergency Contact</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mt-0.5">{record.emergency_contact_name}</p>
                  {record.emergency_contact_phone && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{record.emergency_contact_phone}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pending follow-ups alert */}
      {pendingFollowUps.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock size={14} className="text-amber-600 dark:text-amber-400" />
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Follow-up required</p>
          </div>
          {pendingFollowUps.map((v) => {
            const fStatus = followUpStatus(v.follow_up_date);
            return (
              <div key={v.id} className="flex items-center justify-between text-xs mt-1">
                <span className="text-amber-700 dark:text-amber-300">{v.diagnosis ?? v.symptoms}</span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${followUpBadgeClass(fStatus)}`}>
                  {v.follow_up_date}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Visit history */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList size={15} className="text-indigo-500" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Visit History</h2>
        </div>

        {visits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 py-10 text-center">
            <p className="text-xs text-slate-400">No infirmary visits on record.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visits.map((v) => {
              const meds = parseMedicines(v.medicines_dispensed);
              const fStatus = followUpStatus(v.follow_up_date);
              return (
                <div key={v.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{fmtDate(v.visit_date)}</p>
                    {v.attended_by && (
                      <p className="text-[10px] text-slate-400">Dr. {v.attended_by}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Symptoms</p>
                      <p className="text-slate-700 dark:text-slate-200 mt-0.5">{v.symptoms}</p>
                    </div>
                    {v.diagnosis && (
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Diagnosis</p>
                        <p className="text-slate-700 dark:text-slate-200 mt-0.5">{v.diagnosis}</p>
                      </div>
                    )}
                    {v.treatment_given && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Treatment</p>
                        <p className="text-slate-700 dark:text-slate-200 mt-0.5">{v.treatment_given}</p>
                      </div>
                    )}
                    {meds.length > 0 && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Medicines</p>
                        <ul className="mt-0.5 space-y-0.5">
                          {meds.map((m, i) => (
                            <li key={i} className="text-slate-700 dark:text-slate-200 text-[11px]">• {medicineLabel(m)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {v.referred_to && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-red-500 font-semibold uppercase tracking-wider">Referred To</p>
                        <p className="text-red-600 dark:text-red-400 mt-0.5">{v.referred_to}</p>
                      </div>
                    )}
                    {v.follow_up_date && (
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Follow-up</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${followUpBadgeClass(fStatus)}`}>
                          {v.follow_up_date}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
