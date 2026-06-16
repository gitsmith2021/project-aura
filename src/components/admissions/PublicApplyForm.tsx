"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, Upload, X, Check, Loader2, FileText } from "lucide-react";
import { submitApplication, type PublicInstitution } from "@/actions/admissions";
import { uploadDocument } from "@/lib/storage";
import { isValidEmail } from "@/lib/admissions";

const inputCls =
  "w-full h-10 px-3 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500";

const BUCKET = "admissions-documents";

export function PublicApplyForm({ institution }: { institution: PublicInstitution }) {
  const [f, setF] = useState({
    applicant_name: "", applicant_email: "", applicant_phone: "", program_applied: "UG" as "UG" | "PG",
    department_id: "", dob: "", address: "", previous_school: "", marks_percentage: "",
  });
  const [docs, setDocs] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const onUpload = async (file: File) => {
    setUploading(true); setError(null);
    const res = await uploadDocument(BUCKET, file, institution.slug);
    setUploading(false);
    if (!res.success) { setError(`Upload failed: ${res.error}. (Ask the institution to enable the documents bucket.)`); return; }
    setDocs((p) => [...p, { name: res.name, url: res.url }]);
  };

  const submit = async () => {
    setSaving(true); setError(null);
    const res = await submitApplication({
      institutionId: institution.id,
      applicant_name: f.applicant_name,
      applicant_email: f.applicant_email,
      applicant_phone: f.applicant_phone || null,
      program_applied: f.program_applied,
      department_id: f.department_id || null,
      dob: f.dob || null,
      address: f.address || null,
      previous_school: f.previous_school || null,
      marks_percentage: f.marks_percentage ? parseFloat(f.marks_percentage) : null,
      documents_url: docs.length ? docs : null,
    });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    setDoneId(res.data.id);
  };

  const valid = f.applicant_name.trim() && isValidEmail(f.applicant_email) && f.program_applied;

  if (doneId) {
    return (
      <div className="text-center py-10">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-4">
          <Check size={28} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Application submitted</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Thanks, {f.applicant_name.split(" ")[0]}. {institution.name} has received your application. You can track its status anytime.
        </p>
        <Link href={`/admissions/${institution.slug}/status`} className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">
          Check application status
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Section title="Personal details">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Full name *"><input value={f.applicant_name} onChange={(e) => set("applicant_name", e.target.value)} className={inputCls} /></Field>
          <Field label="Email *"><input type="email" value={f.applicant_email} onChange={(e) => set("applicant_email", e.target.value)} className={inputCls} /></Field>
          <Field label="Phone"><input value={f.applicant_phone} onChange={(e) => set("applicant_phone", e.target.value)} className={inputCls} /></Field>
          <Field label="Date of birth"><input type="date" value={f.dob} onChange={(e) => set("dob", e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Address"><textarea value={f.address} onChange={(e) => set("address", e.target.value)} rows={2} className={`${inputCls} h-auto py-2`} /></Field>
      </Section>

      <Section title="Academic details">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Program *">
            <select value={f.program_applied} onChange={(e) => set("program_applied", e.target.value)} className={inputCls}>
              <option value="UG">Undergraduate (UG)</option>
              <option value="PG">Postgraduate (PG)</option>
            </select>
          </Field>
          <Field label="Department">
            <select value={f.department_id} onChange={(e) => set("department_id", e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              {institution.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Previous school / college"><input value={f.previous_school} onChange={(e) => set("previous_school", e.target.value)} className={inputCls} /></Field>
          <Field label="Qualifying marks (%)"><input type="number" min={0} max={100} step="0.01" value={f.marks_percentage} onChange={(e) => set("marks_percentage", e.target.value)} className={inputCls} /></Field>
        </div>
      </Section>

      <Section title="Documents (optional)">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Add document
            <input type="file" accept="image/*,application/pdf" className="hidden" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(file); }} />
          </label>
          {docs.map((d, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <FileText size={12} /> {d.name}
              <button type="button" onClick={() => setDocs((p) => p.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-500"><X size={12} /></button>
            </span>
          ))}
        </div>
      </Section>

      {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2 mb-3">{error}</p>}

      <button type="button" onClick={submit} disabled={saving || !valid} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <GraduationCap size={16} />} Submit application
      </button>
      <p className="text-center text-[11px] text-slate-400 mt-3">
        Already applied? <Link href={`/admissions/${institution.slug}/status`} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Check your status</Link>
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
