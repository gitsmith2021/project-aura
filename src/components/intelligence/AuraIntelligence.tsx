"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, ArrowRight, ArrowLeft, Lightbulb, History, Loader2,
  ChevronUp, ChevronDown, Download, FileSpreadsheet, Printer,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, AreaChart, Area,
} from "recharts";
import { useInstitution } from "@/context/InstitutionContext";
import { askAura, getLauncher, getRecentQuestions } from "@/actions/intelligence";
import { formatValue } from "@/lib/intelligence/composer";
import { toCSV, type ResultRow } from "@/lib/dataExplorer";
import { downloadWorkbook } from "@/lib/excelXml";
import type { AuraAnswer, Block, ComputedWidget, ComposedView, GridColumn, Role } from "@/lib/intelligence/types";

const COLORS = ["#7c3aed", "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6", "#3b82f6", "#a855f7"];
const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Administrator", INST_ADMIN: "Chairman", PRINCIPAL: "Principal",
  IQAC: "Coordinator", HOD: "HOD", STAFF: "Faculty", STUDENT: "Student", PARENT: "Parent",
};
const TONE_TEXT: Record<string, string> = {
  good: "text-emerald-600 dark:text-emerald-400", warn: "text-amber-600 dark:text-amber-400",
  bad: "text-rose-600 dark:text-rose-400", default: "text-slate-900 dark:text-slate-100",
};
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

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
    setQuestion(q); setLoading(true);
    const res = await askAura(selectedId, q);
    setAnswer(res); setLoading(false);
    getRecentQuestions(selectedId).then(setRecent);
  }
  const reset = () => { setAnswer(null); setQuestion(""); };

  if (!selectedId) return <Frame><Center>Select an institution to begin.</Center></Frame>;

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
            <AnswerView view={answer.view} followups={answer.followups} onAsk={ask} />
          ) : answer && !answer.ok && answer.reason === "clarify" ? (
            <Clarify message={answer.message} options={answer.clarify.options} onAsk={ask} />
          ) : answer ? (
            <NoAnswer message={answer.message} suggestions={"suggestions" in answer ? (answer.suggestions ?? []) : []} onAsk={ask} />
          ) : null}
        </div>
      </Frame>
    );
  }

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
            <input autoFocus value={question} onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask Aura anything about your institution…"
              className="w-full pl-5 pr-14 py-4 text-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 text-slate-900 dark:text-slate-100" />
            <button type="submit" disabled={!question.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors">
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
        {recent.length > 0 && (
          <div className="w-full mt-8 text-left">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2"><History size={12} /> Recent questions</p>
            <div className="flex flex-wrap gap-2">{recent.map((q) => <Suggestion key={q} text={q} onClick={() => ask(q)} />)}</div>
          </div>
        )}
        {samples.length > 0 && (
          <div className="w-full mt-6 text-left">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2"><Lightbulb size={12} /> Try asking</p>
            <div className="flex flex-wrap gap-2">{samples.map((q) => <Suggestion key={q} text={q} onClick={() => ask(q)} />)}</div>
          </div>
        )}
      </div>
    </Frame>
  );
}

// ── Visualization Composer — render the typed blocks ─────────────────────────────
function AnswerView({ view, followups, onAsk }: { view: ComposedView; followups: string[]; onAsk: (q: string) => void }) {
  if (view.empty) return <NoAnswer message="There's no data for that yet — once records exist, this answer will populate." suggestions={followups} onAsk={onAsk} />;
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-[10px] font-bold uppercase tracking-wider">{view.title}</span>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold uppercase tracking-wider">{view.responseType}</span>
      </div>
      {view.blocks.map((b, i) => <BlockView key={i} block={b} />)}
      {followups.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">You may also want to ask</p>
          <div className="flex flex-wrap gap-2">{followups.map((q) => <Suggestion key={q} text={q} onClick={() => onAsk(q)} />)}</div>
        </div>
      )}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "kpiStrip":
    case "comparison":
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {block.kpis.map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k.label}</p>
              <p className={`text-2xl font-black mt-1 tabular-nums ${TONE_TEXT[k.tone] ?? TONE_TEXT.default}`}>{k.display}</p>
              {k.delta && k.delta.pct !== null && (
                <p className={`text-[10px] font-bold mt-1 ${k.delta.dir === "up" ? "text-emerald-600 dark:text-emerald-400" : k.delta.dir === "down" ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`}>
                  {k.delta.dir === "up" ? "▲" : k.delta.dir === "down" ? "▼" : "▬"} {Math.abs(k.delta.pct)}% <span className="font-medium text-slate-400">{k.delta.label}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      );
    case "chart":
      return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-3">{block.widget.title}</p>
          <Widget widget={block.widget} />
        </div>
      );
    case "recordGrid":
      return <RecordGrid block={block} />;
    case "alerts":
      return <AlertsBlock items={block.items} />;
    case "forecast":
      return <ForecastBlock block={block} />;
    case "timeline":
      return <TimelineBlock block={block} />;
    case "heatmap":
      return <HeatmapBlock block={block} />;
    case "benchmark":
      return <BenchmarkBlock block={block} />;
    case "riskMatrix":
      return <RiskMatrixBlock block={block} />;
    case "summary":
      return (
        <div className="rounded-2xl border border-violet-200 dark:border-violet-900/50 bg-gradient-to-br from-violet-50 to-indigo-50/60 dark:from-violet-950/30 dark:to-indigo-950/20 p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-2"><Sparkles size={12} /> Executive Summary</p>
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{block.text}</p>
        </div>
      );
    case "recommendations":
      return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Recommendations</p>
          <ul className="space-y-1.5">{block.items.map((it) => <li key={it} className="text-sm text-slate-600 dark:text-slate-300 flex gap-2"><span className="text-violet-500">›</span>{it}</li>)}</ul>
        </div>
      );
    default:
      return null;
  }
}

// ── Record Grid — sortable, paginated, exportable (the "data is the hero" block) ─
function RecordGrid({ block }: { block: Extract<Block, { kind: "recordGrid" }> }) {
  const { columns, rows, title, total, capped } = block;
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const PAGE = 25;

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    const numeric = col?.format === "currency" || col?.format === "number";
    return [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = numeric ? num(av) - num(bv) : String(av ?? "").localeCompare(String(bv ?? ""));
      return dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, dir, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const view = sorted.slice(page * PAGE, page * PAGE + PAGE);
  const toggleSort = (k: string) => { if (sortKey === k) setDir((d) => (d === "asc" ? "desc" : "asc")); else { setSortKey(k); setDir("asc"); } };

  const headers = columns.map((c) => c.label);
  const matrix = sorted.map((r) => columns.map((c) => fmtCell(r[c.key], c.format)));

  const exportCSV = () => downloadBlob(`${slug(title)}.csv`, "text/csv", toCSV(sorted, columns.map((c) => c.key)));
  const exportXLS = () => downloadWorkbook(slug(title), [{ name: title.slice(0, 31), rows: [headers, ...matrix] }]);
  const exportPDF = () => printTable(title, headers, matrix);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-center justify-between gap-2 p-4 pb-2">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{title} <span className="text-slate-400 font-medium">· {total.toLocaleString("en-IN")} {total === 1 ? "record" : "records"}{capped ? "+" : ""}</span></p>
        <div className="flex items-center gap-1.5">
          <ExportBtn onClick={exportCSV} icon={<Download size={13} />} label="CSV" />
          <ExportBtn onClick={exportXLS} icon={<FileSpreadsheet size={13} />} label="Excel" />
          <ExportBtn onClick={exportPDF} icon={<Printer size={13} />} label="PDF" />
        </div>
      </div>
      <div className="overflow-x-auto px-2 pb-2">
        <table className="w-full text-left text-xs">
          <thead><tr className="border-b border-slate-100 dark:border-slate-800">
            {columns.map((c) => (
              <th key={c.key} onClick={() => toggleSort(c.key)}
                className={`px-2 py-2 font-bold text-slate-400 uppercase tracking-wider text-[10px] cursor-pointer select-none hover:text-slate-600 dark:hover:text-slate-200 ${c.format === "currency" || c.format === "number" ? "text-right" : ""}`}>
                <span className="inline-flex items-center gap-1">{c.label}{sortKey === c.key && (dir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}</span>
              </th>
            ))}
          </tr></thead>
          <tbody>
            {view.map((r, i) => (
              <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                {columns.map((c) => <td key={c.key} className={`px-2 py-1.5 text-slate-600 dark:text-slate-300 ${c.format === "currency" || c.format === "number" ? "text-right tabular-nums" : ""}`}>{fmtCell(r[c.key], c.format)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between p-3 text-xs text-slate-500">
          <span>Page {page + 1} of {pages}</span>
          <div className="flex gap-1.5">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">Prev</button>
            <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExportBtn({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-violet-700 dark:hover:text-violet-300 border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 transition-colors">
      {icon}{label}
    </button>
  );
}

// ── Chart renderer (reused for `chart` blocks) ───────────────────────────────────
function Widget({ widget: w }: { widget: ComputedWidget }) {
  const label = (v: unknown) => w.labelMap?.[String(v)] ?? String(v ?? "—");
  if (w.rows.length === 0) return <Empty />;
  if (w.type === "ranking") {
    const max = Math.max(...w.rows.map((r) => num(r[w.value!])), 1);
    return (
      <div className="space-y-1.5">
        {w.rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-32 truncate text-xs text-slate-600 dark:text-slate-300" title={label(r[w.category!])}>{label(r[w.category!])}</span>
            <div className="flex-1 h-4 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded bg-violet-500" style={{ width: `${(num(r[w.value!]) / max) * 100}%` }} /></div>
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
        <PieChart><Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={w.type === "donut" ? 52 : 0} outerRadius={80} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie><Tooltip formatter={(v) => Number(v).toLocaleString("en-IN")} /></PieChart>
      </ResponsiveContainer>
    );
  }
  if (w.type === "line" || w.type === "area" || w.type === "trend") {
    const Chart = w.type === "line" ? LineChart : AreaChart;
    return (
      <ResponsiveContainer width="100%" height={220}>
        <Chart data={data}><XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" /><YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" width={36} /><Tooltip />
          {w.type === "line" ? <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} dot={false} /> : <Area type="monotone" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.15} />}
        </Chart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}><XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" /><YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" width={36} /><Tooltip formatter={(v) => Number(v).toLocaleString("en-IN")} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── WS8 Response Pattern Library renderers ───────────────────────────────────────
const SEV: Record<string, string> = {
  good: "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  info: "border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-300",
  warn: "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300",
  critical: "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300",
};
function AlertsBlock({ items }: { items: { severity: string; text: string }[] }) {
  return (
    <div className="space-y-2">
      {items.map((a, i) => (
        <div key={i} className={`rounded-xl border px-4 py-2.5 text-sm font-medium flex items-center gap-2.5 ${SEV[a.severity] ?? SEV.info}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" /> {a.text}
        </div>
      ))}
    </div>
  );
}

function ForecastBlock({ block }: { block: Extract<Block, { kind: "forecast" }> }) {
  const data = block.points.map((p) => ({ name: p.period, actual: p.projected ? null : p.value, projected: p.projected ? p.value : null }));
  const lastActual = block.points.map((p) => p.projected).lastIndexOf(false);
  if (lastActual >= 0 && lastActual < data.length) data[lastActual].projected = block.points[lastActual].value; // join the lines
  const nProj = block.points.filter((p) => p.projected).length;
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-3">{block.title} <span className="text-slate-400 font-medium">· projection</span></p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" /><YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" width={40} /><Tooltip formatter={(v) => Number(v).toLocaleString("en-IN")} />
          <Line dataKey="actual" stroke="#7c3aed" strokeWidth={2} dot={false} connectNulls />
          <Line dataKey="projected" stroke="#7c3aed" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-slate-400 mt-1">Dashed = deterministic linear projection ({nProj} periods ahead). Not a guarantee.</p>
    </div>
  );
}

function TimelineBlock({ block }: { block: Extract<Block, { kind: "timeline" }> }) {
  const max = Math.max(...block.events.map((e) => num(e.value)), 1);
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-3">{block.title}</p>
      <div className="space-y-2 border-l-2 border-violet-200 dark:border-violet-900/50 pl-4">
        {block.events.map((e, i) => (
          <div key={i} className="relative">
            <span className="absolute -left-[1.35rem] top-1 w-2.5 h-2.5 rounded-full bg-violet-500" />
            <div className="flex items-center justify-between gap-2 text-xs"><span className="text-slate-600 dark:text-slate-300">{e.label}</span><span className="font-bold tabular-nums text-slate-700 dark:text-slate-200">{num(e.value).toLocaleString("en-IN")}</span></div>
            <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-0.5"><div className="h-full bg-violet-400" style={{ width: `${(num(e.value) / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatmapBlock({ block }: { block: Extract<Block, { kind: "heatmap" }> }) {
  const max = Math.max(...block.cells.map((c) => c.value), 1);
  const at = (x: number, y: number) => block.cells.find((c) => c.x === x && c.y === y)?.value ?? 0;
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm overflow-x-auto">
      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-3">{block.title}</p>
      <table className="text-[10px]"><tbody>
        {block.yLabels.map((yl, y) => (
          <tr key={y}>
            <td className="pr-2 text-right text-slate-500 whitespace-nowrap">{yl}</td>
            {block.xLabels.map((_, x) => { const v = at(x, y); return <td key={x} className="p-0.5"><div className="w-8 h-7 rounded flex items-center justify-center text-white font-bold" style={{ backgroundColor: `rgba(124,58,237,${0.15 + 0.85 * (v / max)})` }}>{v || ""}</div></td>; })}
          </tr>
        ))}
        <tr><td /> {block.xLabels.map((xl, x) => <td key={x} className="text-center text-slate-500 pt-1 truncate max-w-[2.5rem]">{xl}</td>)}</tr>
      </tbody></table>
    </div>
  );
}

function BenchmarkBlock({ block }: { block: Extract<Block, { kind: "benchmark" }> }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{block.title}</p>
      {block.items.map((it, i) => {
        const ratio = it.target > 0 ? Math.min(1.5, it.value / it.target) : 0;
        const ok = it.value >= it.target;
        return (
          <div key={i}>
            <div className="flex justify-between text-xs mb-1"><span className="text-slate-600 dark:text-slate-300">{it.label}</span><span className={`font-bold ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>{fmtCell(it.value, it.format)} <span className="text-slate-400 font-medium">/ {fmtCell(it.target, it.format)}</span></span></div>
            <div className="relative h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className={`h-full rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, ratio * 66.6)}%` }} /><span className="absolute top-0 h-full w-0.5 bg-slate-400" style={{ left: "66.6%" }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function RiskMatrixBlock({ block }: { block: Extract<Block, { kind: "riskMatrix" }> }) {
  const cellColor = (l: number, im: number) => { const s = l * im; return s >= 6 ? "bg-rose-500/80" : s >= 3 ? "bg-amber-500/70" : "bg-emerald-500/70"; };
  const items = (l: number, im: number) => block.items.filter((it) => it.likelihood === l && it.impact === im);
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-3">{block.title}</p>
      <div className="flex gap-2">
        <div className="flex flex-col justify-around text-[9px] text-slate-400 font-bold uppercase"><span>High</span><span>Med</span><span>Low</span></div>
        <div className="grid grid-cols-3 gap-1 flex-1">
          {[3, 2, 1].map((l) => [1, 2, 3].map((im) => (
            <div key={`${l}-${im}`} className={`rounded h-14 p-1 text-[9px] text-white overflow-hidden ${cellColor(l, im)}`}>{items(l, im).map((it, i) => <div key={i} className="truncate">{it.label}</div>)}</div>
          )))}
        </div>
      </div>
      <p className="text-[9px] text-slate-400 mt-1 text-center">Impact: Low → High →</p>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────────
function fmtCell(v: unknown, format?: string) {
  if (v === null || v === undefined || v === "") return "—";
  if (format === "currency") return formatValue(num(v), "currency");
  if (format === "number") return formatValue(num(v), "number");
  return String(v);
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "export";
function downloadBlob(filename: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function printTable(title: string, headers: string[], rows: string[][]) {
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  const w = window.open("", "_blank"); if (!w) return;
  w.document.write(`<!doctype html><title>${esc(title)}</title><style>body{font:12px system-ui,sans-serif;padding:24px;color:#0f172a}h1{font-size:16px}table{border-collapse:collapse;width:100%;margin-top:12px}th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}th{background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b}</style><h1>${esc(title)}</h1><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(String(c))}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 250);
}

// CF-3.1 — Clarification: when a value is ambiguous, Aura asks instead of guessing.
function Clarify({ message, options, onAsk }: { message: string; options: { label: string; ask: string }[]; onAsk: (q: string) => void }) {
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">{message}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.label} onClick={() => onAsk(o.ask)}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-800 dark:text-amber-200 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/40 hover:bg-amber-100 dark:hover:bg-amber-500/15 transition-colors">
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
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
  return <button onClick={onClick} className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 hover:text-violet-700 dark:hover:text-violet-300 transition-colors">{text}</button>;
}
function Frame({ children }: { children: React.ReactNode }) {
  return <div className="px-5 sm:px-8 py-6 w-full h-[calc(100vh-56px)] overflow-y-auto custom-scrollbar bg-slate-50/60 dark:bg-slate-950/20">{children}</div>;
}
function Center({ children }: { children: React.ReactNode }) { return <div className="flex items-center justify-center h-full text-sm text-slate-400">{children}</div>; }
function Empty() { return <div className="flex items-center justify-center h-[180px] text-xs text-slate-400">No data</div>; }

// Keep ResultRow/GridColumn referenced for type clarity in this module.
export type { ResultRow, GridColumn };
