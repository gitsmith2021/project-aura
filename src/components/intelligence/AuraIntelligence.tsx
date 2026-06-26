"use client";

import { useEffect, useState } from "react";
import {
  Sparkles, ArrowRight, ArrowLeft, Lightbulb, History, Loader2,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, AreaChart, Area,
} from "recharts";
import { useInstitution } from "@/context/InstitutionContext";
import { askAura, getLauncher, getRecentQuestions } from "@/actions/intelligence";
import { formatValue } from "@/lib/intelligence/composer";
import type { AuraAnswer, ComputedWidget, Role } from "@/lib/intelligence/types";

const COLORS = ["#7c3aed", "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6", "#3b82f6", "#a855f7"];

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Administrator", INST_ADMIN: "Chairman", PRINCIPAL: "Principal",
  IQAC: "Coordinator", HOD: "HOD", STAFF: "Faculty", STUDENT: "Student", PARENT: "Parent",
};
const TONE_TEXT: Record<string, string> = {
  good: "text-emerald-600 dark:text-emerald-400", warn: "text-amber-600 dark:text-amber-400",
  bad: "text-rose-600 dark:text-rose-400", default: "text-slate-900 dark:text-slate-100",
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function AuraIntelligence() {
  const { selectedId } = useInstitution();
  const [role, setRole] = useState<Role | null>(null);
  const [samples, setSamples] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AuraAnswer | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    getLauncher(selectedId).then((l) => { setRole(l.role); setSamples(l.samples); });
    getRecentQuestions(selectedId).then(setRecent);
  }, [selectedId]);

  async function ask(q: string) {
    if (!selectedId || !q.trim()) return;
    setQuestion(q);
    setLoading(true);
    const res = await askAura(selectedId, q);
    setAnswer(res);
    setLoading(false);
    getRecentQuestions(selectedId).then(setRecent);
  }

  function reset() { setAnswer(null); setQuestion(""); }

  if (!selectedId) {
    return <Frame><Center>Select an institution to begin.</Center></Frame>;
  }

  // ── Answer view ────────────────────────────────────────────────────────────
  if (answer || loading) {
    return (
      <Frame>
        <div className="max-w-5xl mx-auto w-full">
          <button onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4">
            <ArrowLeft size={14} /> Ask another question
          </button>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-1">You asked</p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">{question}</h1>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 size={26} className="animate-spin text-violet-500" />
              <p className="text-sm">Aura is analysing your institution…</p>
            </div>
          ) : answer && answer.ok ? (
            <AnswerDashboard answer={answer} onAsk={ask} />
          ) : answer ? (
            <NoAnswer message={answer.message} suggestions={answer.suggestions ?? []} onAsk={ask} />
          ) : null}
        </div>
      </Frame>
    );
  }

  // ── Launcher (calm) ────────────────────────────────────────────────────────
  return (
    <Frame>
      <div className="max-w-2xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 mb-5">
          <Sparkles size={22} className="text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          {greeting()}{role ? `, ${ROLE_LABEL[role] ?? ""}` : ""}.
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 mb-7">What would you like to know today?</p>

        <form onSubmit={(e) => { e.preventDefault(); ask(question); }} className="w-full">
          <div className="relative">
            <input
              autoFocus value={question} onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask Aura anything about your institution…"
              className="w-full pl-5 pr-14 py-4 text-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 text-slate-900 dark:text-slate-100"
            />
            <button type="submit" disabled={!question.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors">
              <ArrowRight size={18} />
            </button>
          </div>
        </form>

        {recent.length > 0 && (
          <div className="w-full mt-8 text-left">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2"><History size={12} /> Recent questions</p>
            <div className="flex flex-wrap gap-2">
              {recent.map((q) => <Suggestion key={q} text={q} onClick={() => ask(q)} />)}
            </div>
          </div>
        )}

        {samples.length > 0 && (
          <div className="w-full mt-6 text-left">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2"><Lightbulb size={12} /> Try asking</p>
            <div className="flex flex-wrap gap-2">
              {samples.map((q) => <Suggestion key={q} text={q} onClick={() => ask(q)} />)}
            </div>
          </div>
        )}
      </div>
    </Frame>
  );
}

// ── Answer dashboard ─────────────────────────────────────────────────────────────
function AnswerDashboard({ answer, onAsk }: { answer: Extract<AuraAnswer, { ok: true }>; onAsk: (q: string) => void }) {
  const { dashboard, summary, followups, title } = answer;
  if (dashboard.empty) {
    return <NoAnswer message="There's no data for that yet — once records exist, this dashboard will populate." suggestions={followups} onAsk={onAsk} />;
  }
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-[10px] font-bold uppercase tracking-wider">{title}</span>
      </div>

      {/* KPIs */}
      {dashboard.kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {dashboard.kpis.map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k.label}</p>
              <p className={`text-2xl font-black mt-1 tabular-nums ${TONE_TEXT[k.tone] ?? TONE_TEXT.default}`}>{k.display}</p>
            </div>
          ))}
        </div>
      )}

      {/* Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {dashboard.widgets.map((w, i) => (
          <div key={i} className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm ${w.span === 2 ? "lg:col-span-2" : ""}`}>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-3">{w.title}</p>
            <Widget widget={w} />
          </div>
        ))}
      </div>

      {/* Executive summary */}
      <div className="rounded-2xl border border-violet-200 dark:border-violet-900/50 bg-gradient-to-br from-violet-50 to-indigo-50/60 dark:from-violet-950/30 dark:to-indigo-950/20 p-5">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-2"><Sparkles size={12} /> Executive Summary</p>
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{summary}</p>
      </div>

      {/* Follow-ups */}
      {followups.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">You may also want to ask</p>
          <div className="flex flex-wrap gap-2">
            {followups.map((q) => <Suggestion key={q} text={q} onClick={() => onAsk(q)} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Widget renderer ──────────────────────────────────────────────────────────────
function Widget({ widget: w }: { widget: ComputedWidget }) {
  const label = (v: unknown) => w.labelMap?.[String(v)] ?? String(v ?? "—");

  if (w.type === "table") {
    const cols = w.columns ?? [];
    if (w.rows.length === 0) return <Empty />;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead><tr className="border-b border-slate-100 dark:border-slate-800">
            {cols.map((c) => <th key={c.key} className={`px-2 py-1.5 font-bold text-slate-400 uppercase tracking-wider text-[10px] ${c.format === "currency" || c.format === "number" ? "text-right" : ""}`}>{c.label}</th>)}
          </tr></thead>
          <tbody>
            {w.rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50">
                {cols.map((c) => <td key={c.key} className={`px-2 py-1.5 text-slate-600 dark:text-slate-300 ${c.format === "currency" || c.format === "number" ? "text-right tabular-nums" : ""}`}>{fmtCell(r[c.key], c.format)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (w.rows.length === 0) return <Empty />;

  if (w.type === "ranking") {
    const max = Math.max(...w.rows.map((r) => num(r[w.value!])), 1);
    return (
      <div className="space-y-1.5">
        {w.rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-32 truncate text-xs text-slate-600 dark:text-slate-300" title={label(r[w.category!])}>{label(r[w.category!])}</span>
            <div className="flex-1 h-4 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded bg-violet-500" style={{ width: `${(num(r[w.value!]) / max) * 100}%` }} />
            </div>
            <span className="w-12 text-right text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">{num(r[w.value!]).toLocaleString("en-IN")}</span>
          </div>
        ))}
      </div>
    );
  }

  const data = w.rows.map((r) => ({ name: label(r[w.category!]), value: num(r[w.value!]) }));

  if (w.type === "pie" || w.type === "donut") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={w.type === "donut" ? 52 : 0} outerRadius={80} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => Number(v).toLocaleString("en-IN")} />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (w.type === "line" || w.type === "area") {
    const Chart = w.type === "line" ? LineChart : AreaChart;
    return (
      <ResponsiveContainer width="100%" height={220}>
        <Chart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" width={36} />
          <Tooltip />
          {w.type === "line"
            ? <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} dot={false} />
            : <Area type="monotone" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.15} />}
        </Chart>
      </ResponsiveContainer>
    );
  }
  // bar
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
        <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" width={36} />
        <Tooltip formatter={(v) => Number(v).toLocaleString("en-IN")} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── small bits ──────────────────────────────────────────────────────────────────
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
function fmtCell(v: unknown, format?: string) {
  if (v === null || v === undefined || v === "") return "—";
  if (format === "currency") return formatValue(num(v), "currency");
  if (format === "number") return formatValue(num(v), "number");
  return String(v);
}

function NoAnswer({ message, suggestions, onAsk }: { message: string; suggestions: string[]; onAsk: (q: string) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{message}</p>
      <div className="flex flex-wrap gap-2">{suggestions.map((q) => <Suggestion key={q} text={q} onClick={() => onAsk(q)} />)}</div>
    </div>
  );
}

function Suggestion({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 hover:text-violet-700 dark:hover:text-violet-300 transition-colors">
      {text}
    </button>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="px-5 sm:px-8 py-6 w-full h-[calc(100vh-56px)] overflow-y-auto custom-scrollbar bg-slate-50/60 dark:bg-slate-950/20">{children}</div>;
}
function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center h-full text-sm text-slate-400">{children}</div>;
}
function Empty() {
  return <div className="flex items-center justify-center h-[180px] text-xs text-slate-400">No data</div>;
}
