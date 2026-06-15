"use client";

import Link from "next/link";
import {
  ArrowLeft, Building2, GraduationCap, Users, IndianRupee, Percent, Wallet,
  ExternalLink, UserCog, CalendarPlus,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";
import type { InstitutionAnalytics } from "@/actions/superAdmin";
import { KPICard, DarkTooltip } from "./PlatformDashboard";
import { formatINRCompact, formatINRFull, intFmt } from "./format";
import { getDeptColor } from "@/lib/deptColors";
import { fundingTypeShortLabel } from "@/lib/deptFunding";

function ChartCard({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">{subtitle}</p>
      <div className="h-56">{children}</div>
    </div>
  );
}

const AXIS_TICK = { fontSize: 10, fill: "#94a3b8" } as const;

/** Phase 7C — operator drill-down for a single institution. */
export function InstitutionAnalyticsView({ data }: { data: InstitutionAnalytics }) {
  const { institution, totals, enrollmentByYear, admissionsByMonth, attendanceTrend, revenueVsPayroll, departments } = data;

  return (
    <div className="space-y-6">
      {/* ── Header + quick actions ── */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-4">
        <Link
          href="/admin/institutions"
          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-violet-600 hover:border-violet-300 dark:text-slate-400 transition-colors shrink-0"
          title="Back to institutions"
        >
          <ArrowLeft size={15} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">{institution.name}</h2>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              institution.status === "Active"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}>
              {institution.status}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
            {institution.collegeType ?? "Institution"}
            <span aria-hidden>·</span>
            <CalendarPlus size={11} className="inline" /> onboarded{" "}
            {new Date(institution.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/institutions/${institution.slug}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors"
          >
            Open dashboard <ExternalLink size={12} />
          </Link>
          <span
            title="Impersonate admin — planned with Phase 7D security work (needs audited magic-link flow)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 text-xs font-semibold cursor-not-allowed select-none"
          >
            <UserCog size={12} /> Impersonate
          </span>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard
          icon={GraduationCap} label="Students" value={totals.students} format={(n) => intFmt.format(Math.round(n))}
          iconClass="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400"
        />
        <KPICard
          icon={Users} label="Staff" value={totals.staff} format={(n) => intFmt.format(Math.round(n))}
          iconClass="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
        />
        <KPICard
          icon={Building2} label="Departments" value={totals.departments} format={(n) => intFmt.format(Math.round(n))}
          iconClass="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
        />
        <KPICard
          icon={IndianRupee} label="Revenue" value={totals.revenue} format={formatINRCompact}
          sub={<span title={formatINRFull(totals.revenue)}>lifetime completed collections</span>}
          iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
        />
        <KPICard
          icon={Percent} label="Collection Rate" value={totals.collectionRate ?? 0}
          format={(n) => (totals.collectionRate == null ? "—" : `${n.toFixed(1)}%`)}
          sub={<span title={formatINRFull(totals.pending)}>{formatINRCompact(totals.pending)} pending</span>}
          iconClass="bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-400"
        />
        <KPICard
          icon={Wallet} label="Payroll / Revenue" value={totals.payrollRatio ?? 0}
          format={(n) => (totals.payrollRatio == null ? "—" : `${n.toFixed(1)}%`)}
          sub={<span title={formatINRFull(totals.payroll)}>{formatINRCompact(totals.payroll)} disbursed</span>}
          iconClass="bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Enrollment by Year" subtitle="Current students per year of study">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={enrollmentByYear} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
              <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: "#7c3aed", fillOpacity: 0.06 }} />
              <Bar dataKey="value" name="Students" radius={[6, 6, 0, 0]} fill="#7c3aed" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Admissions" subtitle="New students added per month, last 12 months">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={admissionsByMonth} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="admissionsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <Tooltip content={<DarkTooltip />} />
              <Area type="monotone" dataKey="value" name="New students" stroke="#0ea5e9" strokeWidth={2} fill="url(#admissionsFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Attendance Rate" subtitle="Marks recorded as present/late vs total, per month (last 6 months)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={attendanceTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip content={<DarkTooltip isPercent />} />
              <Area type="monotone" dataKey="rate" name="Attendance" stroke="#10b981" strokeWidth={2} fill="url(#attendanceFill)" connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue vs Payroll" subtitle="Completed collections vs processed salary disbursements, per month">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueVsPayroll} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
              <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatINRCompact(v)} width={70} />
              <Tooltip content={<DarkTooltip isCurrency />} cursor={{ fill: "#7c3aed", fillOpacity: 0.06 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]} fill="#10b981" />
              <Bar dataKey="payroll" name="Payroll" radius={[4, 4, 0, 0]} fill="#f43f5e" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Department breakdown ── */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Department Breakdown</h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Students and staff per department</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-2 font-semibold">Department</th>
                <th className="px-4 py-2 font-semibold">Funding</th>
                <th className="px-4 py-2 font-semibold text-right">Students</th>
                <th className="px-4 py-2 font-semibold text-right">Staff</th>
                <th className="px-4 py-2 font-semibold text-right">Student : Staff</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-violet-50/40 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: getDeptColor(dept.color ?? "violet").hex }} />
                      {dept.name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">{fundingTypeShortLabel(dept.fundingType ?? "AIDED")}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 text-right tabular-nums">{intFmt.format(dept.students)}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 text-right tabular-nums">{intFmt.format(dept.staff)}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 text-right tabular-nums">
                    {dept.staff > 0 ? `${(dept.students / dept.staff).toFixed(1)} : 1` : "—"}
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400">
                    No departments created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
