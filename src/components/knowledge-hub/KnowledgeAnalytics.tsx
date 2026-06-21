"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Download, BrainCircuit, Activity, Users, FolderTree, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import {
  uploadsByMonth, uploadsByCategory, uploadsByDepartment, topContributors,
  naacCoverage, departmentParticipation, knowledgeHealthScore, analyticsCsv,
} from "@/lib/knowledgeAnalytics";
import type { KnowledgeResource } from "@/actions/knowledgeHub";

type Props = { institutionId: string; resources: KnowledgeResource[]; facultyCount: number };

const VIOLET = "#7C3AED";
const SLATE = "#94A3B8";
const ROSE = "#F43F5E";
const EMERALD = "#10B981";

export function KnowledgeAnalytics({ institutionId, resources, facultyCount }: Props) {
  const health = useMemo(() => knowledgeHealthScore(resources, facultyCount), [resources, facultyCount]);
  const byMonth = useMemo(() => uploadsByMonth(resources, 12), [resources]);
  const byCategory = useMemo(() => uploadsByCategory(resources).filter((c) => c.count > 0), [resources]);
  const byDept = useMemo(() => uploadsByDepartment(resources).slice(0, 8), [resources]);
  const contributors = useMemo(() => topContributors(resources, 8), [resources]);
  const naac = useMemo(() => naacCoverage(resources), [resources]);
  const participation = useMemo(() => departmentParticipation(resources, facultyCount), [resources, facultyCount]);
  const totalDownloads = useMemo(() => resources.reduce((s, r) => s + r.download_count, 0), [resources]);

  const exportCsv = () => {
    const blob = new Blob([analyticsCsv(resources, facultyCount)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "knowledge-hub-analytics.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const scoreColor = health.score >= 70 ? EMERALD : health.score >= 40 ? VIOLET : ROSE;

  return (
    <div className="w-full p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/institutions/${institutionId}/knowledge-hub`} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowLeft size={18} /></Link>
          <div className="flex items-center gap-2">
            <BrainCircuit size={20} className="text-violet-600" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Knowledge Hub Analytics</h1>
          </div>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"><Download size={15} /> Export CSV</button>
      </div>

      {/* Health score + top stats */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:col-span-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Knowledge Health Score</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-extrabold" style={{ color: scoreColor }}>{health.score}</span>
            <span className="text-sm text-slate-400 pb-1">/ 100</span>
          </div>
          <div className="mt-3 space-y-2">
            {([["Volume", health.volume], ["Diversity", health.diversity], ["Currency", health.currency], ["Participation", health.participation]] as const).map(([label, v]) => (
              <div key={label}>
                <div className="flex justify-between text-[11px] text-slate-500"><span>{label}</span><span>{v}%</span></div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${v}%`, background: scoreColor }} /></div>
              </div>
            ))}
          </div>
        </div>
        <Stat icon={<FolderTree size={16} />} label="Total resources" value={String(resources.length)} />
        <Stat icon={<Activity size={16} />} label="Total downloads" value={String(totalDownloads)} />
        <Stat icon={<Users size={16} />} label="Faculty participation" value={`${participation.pct}%`} sub={`${participation.uploaders} of ${participation.facultyCount}`} />
        <Stat icon={<FolderTree size={16} />} label="Categories covered" value={`${byCategory.length} / 7`} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Uploads — last 12 months">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={byMonth} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: SLATE }} tickFormatter={(m: string) => m.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: SLATE }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke={VIOLET} fill={VIOLET} fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="By category">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byCategory} layout="vertical" margin={{ top: 4, right: 12, left: 24, bottom: 0 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: SLATE }} />
              <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 10, fill: SLATE }} />
              <Tooltip />
              <Bar dataKey="count" fill={VIOLET} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="By department (top 8)">
          {byDept.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byDept} margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="department" tick={{ fontSize: 9, fill: SLATE }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: SLATE }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="NAAC evidence coverage" hint="bars in red are below the recommended minimum">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={naac} margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="criterion" tickFormatter={(c: string) => `C${c}`} tick={{ fontSize: 10, fill: SLATE }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: SLATE }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {naac.map((c) => <Cell key={c.criterion} fill={c.gap ? ROSE : EMERALD} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Contributors + NAAC gaps */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top contributors">
          {contributors.length === 0 ? <Empty /> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {contributors.map((c, i) => (
                <li key={c.name} className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-700 dark:text-slate-200 truncate"><span className="text-slate-400 mr-2">{i + 1}.</span>{c.name}</span>
                  <span className="text-[11px] text-slate-400 shrink-0">{c.uploads} uploads · {c.downloads} ↓</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="NAAC gap alerts">
          {naac.filter((c) => c.gap).length === 0 ? (
            <p className="text-sm text-emerald-600">All criteria meet the recommended minimum. 🎉</p>
          ) : (
            <ul className="space-y-1.5">
              {naac.filter((c) => c.gap).map((c) => (
                <li key={c.criterion} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  <span className="truncate">{c.label}</span>
                  <span className="text-[11px] text-slate-400 ml-auto shrink-0">{c.count} doc{c.count === 1 ? "" : "s"}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className="flex items-center gap-1.5 text-slate-400">{icon}<span className="text-xs font-semibold uppercase tracking-wide">{label}</span></div>
      <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{value}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="mb-2">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{title}</h3>
        {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-slate-400 py-6 text-center">No data yet.</p>;
}
