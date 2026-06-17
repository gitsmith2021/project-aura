"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Check } from "lucide-react";
import { updateAlumniProfile } from "@/actions/alumni";
import type { Alumnus } from "@/lib/alumni";

export function AlumniProfileForm({ me }: { me: Alumnus }) {
  const router = useRouter();
  const [phone, setPhone] = useState(me.phone ?? "");
  const [employer, setEmployer] = useState(me.current_employer ?? "");
  const [designation, setDesignation] = useState(me.current_designation ?? "");
  const [linkedin, setLinkedin] = useState(me.linkedin_url ?? "");
  const [city, setCity] = useState(me.city ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await updateAlumniProfile({
      phone: phone || null,
      currentEmployer: employer || null,
      currentDesignation: designation || null,
      linkedinUrl: linkedin || null,
      city: city || null,
    });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  const inputCls =
    "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="space-y-5">
      {error && <p className="text-[12px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}

      <div>
        <label className={labelCls}>Current Employer</label>
        <input className={inputCls} value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="e.g. Tata Consultancy Services" />
      </div>
      <div>
        <label className={labelCls}>Designation / Role</label>
        <input className={inputCls} value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Senior Analyst" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>City</label>
          <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Bengaluru" />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelCls}>LinkedIn URL</label>
        <input className={inputCls} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button onClick={handleSave} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
          {saved ? <Check size={15} /> : <Save size={15} />}
          {busy ? "Saving…" : saved ? "Saved" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
