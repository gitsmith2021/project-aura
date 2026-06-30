"use client";

import { useEffect, useState } from "react";
import { BarChart3, Loader2, Clock, Gauge, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { getIntelligenceMetrics } from "@/actions/intelligenceAnalytics";
import type { IntelligenceMetrics as Metrics, Tally } from "@/lib/intelligence/metrics";

// CF-3.1 — internal performance + usage dashboard. SUPER_ADMIN only.

const pctTone = (n: number, good = 80) => (n >= good ? "text-emerald-600 dark:text-emerald-400" : n >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400");

export function IntelligenceMetrics() {
  const [m, setM] = useState<Metrics | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIntelligenceMetrics().then((r) => {
      if (r.ok) setM(r.metrics); else setErr(r.error);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/15 text-violet-600"><BarChart3 size={18} /></div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-slate-100">Aura Intelligence — Metrics</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Performance + usage across the last {m?.total ?? 0} questions · internal.</p>
        </div>
      </div>

      {loading && <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin text-violet-500" /> Loading…</div>}
      {err && <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{err}</div>}
      {m && m.total === 0 && <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-6 text-sm text-slate-400 text-center">No questions logged yet — ask Aura a few questions, then return.</div>}

      {m && m.total > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <Metric icon={<BarChart3 size={13} />} label="Questions" value={m.total.toLocaleString("en-IN")} />
            <Metric icon={<Clock size={13} />} label="Avg latency" value={`${m.avgLatencyMs} ms`} />
            <Metric icon={<Clock size={13} />} label="p95 latency" value={`${m.p95LatencyMs} ms`} />
            <Metric icon={<Gauge size={13} />} label="Avg confidence" value={`${Math.round(m.avgConfidence * 100)}%`} tone={pctTone(m.avgConfidence * 100, 80)} />
            <Metric icon={<CheckCircle2 size={13} />} label="Answered" value={`${m.successRate}%`} tone={pctTone(m.successRate)} />
            <Metric icon={<HelpCircle size={13} />} label="Clarified" value={`${m.clarifyRate}%`} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Panel title="Most common questions">{m.topQuestions.map((t) => <Bar key={t.key} t={t} max={m.topQuestions[0]?.n ?? 1} />)}</Panel>
            <Panel title="Response types">{m.topResponseTypes.map((t) => <Bar key={t.key} t={t} max={m.topResponseTypes[0]?.n ?? 1} />)}</Panel>
            <Panel title="Slowest questions">
              {m.slowest.map((s, i) => <Row key={i} left={s.question} right={`${s.latencyMs} ms`} />)}
              {m.slowest.length === 0 && <Empty />}
            </Panel>
            <Panel title="Weakest recognitions (lowest confidence)" hint={<XCircle size={12} className="text-rose-400" />}>
              {m.weakest.map((s, i) => <Row key={i} left={s.question} right={`${Math.round(s.confidence * 100)}%`} rightTone={pctTone(s.confidence * 100, 80)} />)}
              {m.weakest.length === 0 && <Empty />}
            </Panel>
            <Panel title="Top intents (template path)">
              {m.topIntents.map((t) => <Bar key={t.key} t={t} max={m.topIntents[0]?.n ?? 1} />)}
              {m.topIntents.length === 0 && <Empty />}
            </Panel>
            <Panel title="Failure / clarification">
              <Row left="Could not answer (no match)" right={`${m.failRate}%`} rightTone={pctTone(100 - m.failRate)} />
              <Row left="Asked for clarification" right={`${m.clarifyRate}%`} />
              <Row left="Produced a visualization" right={`${m.successRate}%`} rightTone={pctTone(m.successRate)} />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ icon, label, value, tone }: { icon?: React.ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{icon}{label}</p>
      <p className={`text-lg font-black mt-0.5 tabular-nums ${tone ?? "text-slate-900 dark:text-slate-100"}`}>{value}</p>
    </div>
  );
}
function Panel({ title, hint, children }: { title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">{title}{hint}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Bar({ t, max }: { t: Tally; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-40 truncate text-xs text-slate-600 dark:text-slate-300" title={t.key}>{t.key}</span>
      <div className="flex-1 h-3.5 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded bg-violet-500" style={{ width: `${(t.n / max) * 100}%` }} /></div>
      <span className="w-8 text-right text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">{t.n}</span>
    </div>
  );
}
function Row({ left, right, rightTone }: { left: string; right: string; rightTone?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="truncate text-slate-600 dark:text-slate-300" title={left}>{left}</span>
      <span className={`font-bold tabular-nums shrink-0 ${rightTone ?? "text-slate-700 dark:text-slate-200"}`}>{right}</span>
    </div>
  );
}
function Empty() { return <p className="text-xs text-slate-400">No data yet.</p>; }
