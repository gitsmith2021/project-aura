"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, FlaskConical, Users, ClipboardList, Layers } from "lucide-react";
import { addLabExperiment, addLabBatch } from "@/actions/laboratories";
import { LAB_TYPE_COLORS, labTypeLabel, type Laboratory, type LabBatch, type LabExperiment } from "@/lib/laboratories";
import { ExperimentCard } from "./ExperimentCard";

const inputCls =
  "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";

export function LabDetail({
  lab, initialExperiments, initialBatches,
}: {
  lab: Laboratory;
  initialExperiments: LabExperiment[];
  initialBatches: LabBatch[];
}) {
  const institutionId = lab.institution_id;
  const [experiments, setExperiments] = useState<LabExperiment[]>(initialExperiments);
  const [batches, setBatches] = useState<LabBatch[]>(initialBatches);
  const [expOpen, setExpOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <Link href={`/institutions/${institutionId}/laboratories`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-purple-600 font-medium mb-4">
        <ArrowLeft size={13} /> All laboratories
      </Link>

      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center shrink-0">
            <FlaskConical size={20} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">{lab.name}</h1>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${LAB_TYPE_COLORS[lab.lab_type]}`}>
                {labTypeLabel(lab.lab_type)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {lab.departments?.name ?? "No department"}
              {lab.staff?.full_name ? ` · Assistant: ${lab.staff.full_name}` : ""}
              {lab.capacity != null ? ` · Capacity ${lab.capacity}` : ""}
            </p>
          </div>
        </div>
        <Link
          href={`/institutions/${institutionId}/laboratories/${lab.id}/sessions`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 border border-purple-700 shrink-0"
        >
          <ClipboardList size={14} /> Sessions &amp; Grading
        </Link>
      </div>

      {lab.description && (
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-6 max-w-3xl">{lab.description}</p>
      )}

      {/* Batches */}
      <section className="mb-7">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Layers size={13} /> Batches
          </h2>
          <button type="button" onClick={() => setBatchOpen(true)} className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            <Plus size={12} /> Add batch
          </button>
        </div>
        {batches.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No batches yet. Add a batch to schedule sessions.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {batches.map((b) => (
              <div key={b.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"><Users size={12} className="text-slate-400" /> {b.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{b.year_semester}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Experiment syllabus */}
      <section>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <FlaskConical size={13} /> Experiment Syllabus
          </h2>
          <button type="button" onClick={() => setExpOpen(true)} className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            <Plus size={12} /> Add experiment
          </button>
        </div>
        {experiments.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No experiments yet. Build the syllabus by adding experiments.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {experiments.map((e) => <ExperimentCard key={e.id} experiment={e} />)}
          </div>
        )}
      </section>

      {batchOpen && (
        <AddBatchDrawer
          labId={lab.id}
          institutionId={lab.institution_id}
          onClose={() => setBatchOpen(false)}
          onAdded={(b) => setBatches((prev) => [...prev, b])}
        />
      )}
      {expOpen && (
        <AddExperimentDrawer
          labId={lab.id}
          institutionId={lab.institution_id}
          onClose={() => setExpOpen(false)}
          onAdded={(e) => setExperiments((prev) => [...prev, e])}
        />
      )}
    </div>
  );
}

function Drawer({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <aside className="relative h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">{children}</div>
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">{footer}</div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function AddBatchDrawer({ labId, institutionId, onClose, onAdded }: {
  labId: string; institutionId: string; onClose: () => void; onAdded: (b: LabBatch) => void;
}) {
  const [name, setName] = useState("");
  const [yearSem, setYearSem] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setError(null);
    const res = await addLabBatch({ laboratoryId: labId, institutionId, name, year_semester: yearSem });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    onAdded(res.data); onClose();
  };

  return (
    <Drawer title="Add Batch" onClose={onClose} footer={
      <>
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
        <button type="button" onClick={submit} disabled={saving || !name.trim() || !yearSem.trim()} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Adding…" : "Add batch"}</button>
      </>
    }>
      <Field label="Batch name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. B.Sc Physics — Batch A" /></Field>
      <Field label="Year / Semester"><input value={yearSem} onChange={(e) => setYearSem(e.target.value)} className={inputCls} placeholder="e.g. II Year · Sem 3" /></Field>
      {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
    </Drawer>
  );
}

function AddExperimentDrawer({ labId, institutionId, onClose, onAdded }: {
  labId: string; institutionId: string; onClose: () => void; onAdded: (e: LabExperiment) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setError(null);
    const reqs = requirements.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    const res = await addLabExperiment({ laboratoryId: labId, institutionId, title, description: description || null, requirements: reqs });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    onAdded(res.data); onClose();
  };

  return (
    <Drawer title="Add Experiment" onClose={onClose} footer={
      <>
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
        <button type="button" onClick={submit} disabled={saving || !title.trim()} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Adding…" : "Add experiment"}</button>
      </>
    }>
      <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Determination of g using a simple pendulum" /></Field>
      <Field label="Description (optional)"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputCls} h-auto py-2`} /></Field>
      <Field label="Requirements (comma or line separated)">
        <textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={3} className={`${inputCls} h-auto py-2`} placeholder="e.g. Stopwatch, Metre scale, Pendulum bob, Stand & clamp" />
      </Field>
      {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
    </Drawer>
  );
}
