"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createJobApplication } from "@/actions/recruitment";

export function AddApplicantPanel({
  institutionId,
  jobPostingId,
}: {
  institutionId: string;
  jobPostingId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [employer, setEmployer] = useState("");
  const [expYears, setExpYears] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(""); setEmail(""); setPhone(""); setEmployer("");
    setExpYears(""); setCvUrl(""); setNotes(""); setError(null);
  }

  async function handleAdd() {
    if (!name.trim() || !email.trim()) { setError("Name and email are required."); return; }
    setBusy(true);
    setError(null);
    const result = await createJobApplication({
      institutionId,
      jobPostingId,
      applicantName: name,
      applicantEmail: email,
      applicantPhone: phone || null,
      currentEmployer: employer || null,
      experienceYears: expYears ? parseFloat(expYears) : null,
      cvUrl: cvUrl || null,
      adminNotes: notes || null,
    });
    setBusy(false);
    if (!result.success) { setError(result.error); return; }
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-[13px] font-medium hover:bg-purple-700 transition-colors"
      >
        <Plus size={15} />
        Add Applicant
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setOpen(false); reset(); }} />
          <div className="relative w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Add Applicant</h2>
              <button type="button" onClick={() => { setOpen(false); reset(); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && (
                <p className="text-[12px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>
              )}
              {[
                { label: "Full Name *", value: name, set: setName, placeholder: "Applicant name" },
                { label: "Email *", value: email, set: setEmail, placeholder: "applicant@example.com" },
                { label: "Phone", value: phone, set: setPhone, placeholder: "+91 98765 43210" },
                { label: "Current Employer", value: employer, set: setEmployer, placeholder: "Current or last employer" },
                { label: "CV / Resume URL", value: cvUrl, set: setCvUrl, placeholder: "https://drive.google.com/…" },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">{f.label}</label>
                  <input
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={f.value}
                    onChange={e => f.set(e.target.value)}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
              <div>
                <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Experience (years)</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={expYears}
                  onChange={e => setExpYears(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Initial screening notes..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <button type="button" onClick={() => { setOpen(false); reset(); }} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleAdd}
                className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? "Adding…" : "Add to Pipeline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
