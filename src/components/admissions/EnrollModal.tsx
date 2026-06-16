"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, GraduationCap, Loader2, Check, Copy } from "lucide-react";
import { enrollStudent } from "@/actions/admissions";
import type { Admission } from "@/lib/admissions";

export function EnrollModal({ institutionId, application, onClose }: {
  institutionId: string; application: Admission; onClose: () => void;
}) {
  const router = useRouter();
  const [studentYear, setStudentYear] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ email: string; password: string; rollNo: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async () => {
    setSaving(true); setError(null);
    const res = await enrollStudent({ institutionId, applicationId: application.id, studentYear: parseInt(studentYear, 10) || 1 });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    setDone(res.data);
    router.refresh();
  };

  const copy = () => {
    if (!done) return;
    navigator.clipboard.writeText(`Login: ${done.email}\nTemp password: ${done.password}\nRoll No: ${done.rollNo}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Enroll {application.applicant_name}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>

        {done ? (
          <div className="p-5 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-3"><Check size={24} className="text-emerald-600 dark:text-emerald-400" /></div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Student enrolled</p>
            <p className="text-[11px] text-slate-400 mb-4">Share these login credentials with the student.</p>
            <div className="text-left rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 p-3 text-xs space-y-1 font-mono">
              <p><span className="text-slate-400">Roll No:</span> {done.rollNo}</p>
              <p><span className="text-slate-400">Login:</span> {done.email}</p>
              <p><span className="text-slate-400">Password:</span> {done.password}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={copy} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}</button>
              <button type="button" onClick={onClose} className="flex-1 px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-md hover:bg-indigo-700">Done</button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This creates a student record + login account for <span className="font-semibold text-slate-700 dark:text-slate-200">{application.applicant_email}</span>, generates a roll number, and marks the application enrolled.
              </p>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Joining year of study</label>
                <select value={studentYear} onChange={(e) => setStudentYear(e.target.value)} className="w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200">
                  {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
              <button type="button" onClick={submit} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700 disabled:opacity-50">{saving ? <Loader2 size={13} className="animate-spin" /> : <GraduationCap size={13} />} Enroll student</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
