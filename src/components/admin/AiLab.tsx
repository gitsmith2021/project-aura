"use client";

import { useState } from "react";
import { FlaskConical, Play, Loader2, ChevronRight, Clock, Gauge } from "lucide-react";
import { useInstitution } from "@/context/InstitutionContext";
import { traceAura } from "@/actions/intelligenceDev";
import type { AuraAnswer, Trace, TraceStage } from "@/lib/intelligence/types";

// CF-3.1 — Developer Lab UI. Renders the full execution trace for a question so
// developers can see exactly how Aura arrived at an answer. Internal tool.

const pct = (n?: number) => (n === undefined ? "—" : `${Math.round(n * 100)}%`);
const confTone = (n?: number) =>
  n === undefined ? "text-slate-400"
  : n >= 0.85 ? "text-emerald-600 dark:text-emerald-400"
  : n >= 0.6 ? "text-amber-600 dark:text-amber-400"
  : "text-rose-600 dark:text-rose-400";

const SAMPLES = [
  "List staff drawing salary less than ₹10,000",
  "Give me a list of second-year computer science students",
  "Fee collection over the last 12 months",
  "Students by department",
  "Compare admissions this year vs last year",
];

export function AiLab() {
  const { selectedId } = useInstitution();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ answer: AuraAnswer; trace: Trace } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(question: string) {
    if (!selectedId) { setErr("Select an institution in the top bar first."); return; }
    if (!question.trim()) return;
    setQ(question); setBusy(true); setErr(null); setRes(null);
    const r = await traceAura(selectedId, question);
    setBusy(false);
    if (r.ok) setRes({ answer: r.answer, trace: r.trace });
    else setErr(r.error);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/15 text-violet-600"><FlaskConical size={18} /></div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-slate-100">Aura Intelligence — Developer Lab</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Inspect every pipeline stage for a question. SUPER_ADMIN only · internal.</p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); run(q); }}>
        <div className="relative">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask any question to trace…"
            className="w-full pl-4 pr-28 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 text-slate-900 dark:text-slate-100" />
          <button type="submit" disabled={busy || !q.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-bold">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Trace
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((s) => <button key={s} onClick={() => run(s)} className="px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700">{s}</button>)}
      </div>

      {err && <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{err}</div>}
      {busy && <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin text-violet-500" /> Tracing…</div>}

      {res && (
        <div className="space-y-4">
          {/* Header metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric icon={<Gauge size={14} />} label="Overall confidence" value={pct(res.trace.overallConfidence)} tone={confTone(res.trace.overallConfidence)} />
            <Metric icon={<Clock size={14} />} label="Total time" value={`${res.trace.totalMs} ms`} />
            <Metric label="Path" value={res.trace.path} />
            <Metric label="Result" value={res.answer.ok ? res.answer.view.responseType : res.answer.reason} />
          </div>

          {/* Stage trace */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">Execution trace · {res.trace.traceId.slice(0, 8)}</div>
            <ol className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {res.trace.stages.map((s, i) => <StageRow key={i} stage={s} />)}
            </ol>
          </div>

          {/* Answer payload */}
          <details className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <summary className="cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300">Answer payload (JSON)</summary>
            <pre className="mt-3 text-[11px] text-slate-600 dark:text-slate-400 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(res.answer, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

function StageRow({ stage }: { stage: TraceStage }) {
  const [open, setOpen] = useState(false);
  const hasDetail = stage.detail && Object.keys(stage.detail).length > 0;
  return (
    <li>
      <button onClick={() => hasDetail && setOpen((o) => !o)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${hasDetail ? "hover:bg-slate-50/60 dark:hover:bg-slate-800/30" : ""}`}>
        <ChevronRight size={13} className={`text-slate-300 transition-transform ${open ? "rotate-90" : ""} ${hasDetail ? "" : "opacity-0"}`} />
        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 w-24">{stage.stage}</span>
        <span className="text-[11px] tabular-nums text-slate-400 w-16">{stage.ms} ms</span>
        {stage.confidence !== undefined && <span className={`text-[11px] font-bold tabular-nums ${confTone(stage.confidence)}`}>{pct(stage.confidence)}</span>}
        <span className="ml-auto text-[11px] text-slate-400 truncate max-w-[40%]">{hasDetail ? summarizeDetail(stage.detail!) : ""}</span>
      </button>
      {open && hasDetail && (
        <pre className="px-4 pb-3 text-[11px] text-slate-500 dark:text-slate-400 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(stage.detail, null, 2)}</pre>
      )}
    </li>
  );
}

function summarizeDetail(d: Record<string, unknown>): string {
  const keys = Object.keys(d);
  if ("entity" in d) return `entity: ${d.entity}`;
  if ("responseType" in d) return `${d.responseType}`;
  if ("rows" in d) return `rows: ${JSON.stringify(d.rows)}`;
  if ("models" in d) return `models: ${(d.models as string[] | undefined)?.join(", ")}`;
  return keys.slice(0, 2).join(", ");
}

function Metric({ icon, label, value, tone }: { icon?: React.ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{icon}{label}</p>
      <p className={`text-base font-black mt-0.5 ${tone ?? "text-slate-900 dark:text-slate-100"}`}>{value}</p>
    </div>
  );
}
