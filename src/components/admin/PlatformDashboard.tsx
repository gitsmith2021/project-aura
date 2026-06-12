"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2, Users, GraduationCap, IndianRupee, Radio, TrendingUp,
  Trophy, ArrowUpRight, ArrowDownRight, Minus, type LucideIcon,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { createClient } from "@/utils/supabase/client";
import { getActiveSessionsToday, type PlatformOverview } from "@/actions/superAdmin";

// ── Formatting (Indian locale — Dev Rule 8) ───────────────────────────────────
const intFmt = new Intl.NumberFormat("en-IN");

/** ₹1,23,456 → "₹1.23L"; crores as "₹x.xCr". Full value stays in the tooltip/title. */
function formatINRCompact(value: number): string {
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(value >= 10_00_00_000 ? 1 : 2)}Cr`;
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(value >= 10_00_000 ? 1 : 2)}L`;
  return `₹${intFmt.format(Math.round(value))}`;
}

function formatINRFull(value: number): string {
  return `₹${intFmt.format(Math.round(value))}`;
}

function formatLastActivity(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── GSAP count-up (Phase 7B premium enhancement) ──────────────────────────────
function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (!ref.current) return;
    if (prefersReducedMotion()) {
      ref.current.textContent = format(value);
      return;
    }
    const counter = { n: 0 };
    gsap.to(counter, {
      n: value,
      duration: 1.4,
      ease: "power2.out",
      onUpdate: () => {
        if (ref.current) ref.current.textContent = format(counter.n);
      },
    });
  }, [value]);

  // Server-render the final value so the page is meaningful without JS
  return <span ref={ref}>{format(value)}</span>;
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, format, sub, iconClass, live }: {
  icon: LucideIcon;
  label: string;
  value: number;
  format: (n: number) => string;
  sub?: React.ReactNode;
  iconClass: string;
  live?: boolean;
}) {
  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            {label}
            {live && (
              <span className="flex items-center gap-1 text-emerald-500 normal-case font-medium">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                live
              </span>
            )}
          </p>
          <p className="text-xl font-bold text-slate-900 dark:text-white leading-tight tabular-nums">
            <CountUp value={value} format={format} />
          </p>
          {sub && <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

// ── Collections delta (this month vs last) ────────────────────────────────────
function MonthDelta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return <span className="flex items-center gap-0.5"><Minus size={10} /> no prior month data</span>;
  }
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span className={`flex items-center gap-0.5 font-semibold ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
      {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {Math.abs(pct).toFixed(1)}% vs last month
    </span>
  );
}

// ── Chart tooltip (matches CollegeDashboard's DarkTooltip) ────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DarkTooltip({ active, payload, label, isCurrency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white rounded-lg px-3 py-2 text-xs shadow-xl border border-slate-700">
      <p className="font-semibold text-slate-300 mb-1">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.stroke || p.fill || p.color }} />
          {p.name}:{" "}
          <span className="font-bold">{isCurrency ? formatINRFull(p.value) : intFmt.format(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function PlatformDashboard({ initial }: { initial: PlatformOverview }) {
  const { totals, institutionGrowth, revenueByMonth, institutions } = initial;
  const [activeSessions, setActiveSessions] = useState(totals.activeSessionsToday);

  // Phase 7B premium enhancement: Supabase Realtime keeps "Active Sessions
  // Today" live. attendance is in the supabase_realtime publication; each
  // INSERT (a student marked present in a class) triggers a debounced
  // re-count through the SUPER_ADMIN-gated server action.
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel("admin-active-sessions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendance" },
        () => {
          // NFC marking inserts rows in bursts — coalesce before re-counting
          if (timer) clearTimeout(timer);
          timer = setTimeout(async () => {
            const res = await getActiveSessionsToday();
            if (res.success) setActiveSessions(res.data);
          }, 1500);
        }
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const topInstitutions = institutions.slice(0, 3).filter((i) => i.revenue > 0);

  return (
    <div className="space-y-6">
      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard
          icon={Building2} label="Institutions" value={totals.institutions} format={(n) => intFmt.format(Math.round(n))}
          iconClass="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
        />
        <KPICard
          icon={GraduationCap} label="Students" value={totals.students} format={(n) => intFmt.format(Math.round(n))}
          iconClass="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400"
        />
        <KPICard
          icon={Users} label="Staff" value={totals.staff} format={(n) => intFmt.format(Math.round(n))}
          iconClass="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
        />
        <KPICard
          icon={IndianRupee} label="Total Revenue" value={totals.revenue} format={formatINRCompact}
          sub={<span title={formatINRFull(totals.revenue)}>lifetime completed collections</span>}
          iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
        />
        <KPICard
          icon={TrendingUp} label="This Month" value={totals.collectionsThisMonth} format={formatINRCompact}
          sub={<MonthDelta current={totals.collectionsThisMonth} previous={totals.collectionsLastMonth} />}
          iconClass="bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-400"
        />
        <KPICard
          icon={Radio} label="Sessions Today" value={activeSessions} format={(n) => intFmt.format(Math.round(n))}
          sub="classes with attendance" live
          iconClass="bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Platform Growth</h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">New institutions onboarded per month</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={institutionGrowth} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Area type="monotone" dataKey="value" name="New institutions" stroke="#7c3aed" strokeWidth={2} fill="url(#growthFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Fee Collections</h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">Completed payments per month, all institutions</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByMonth} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatINRCompact(v)} width={70} />
                <Tooltip content={<DarkTooltip isCurrency />} />
                <Area type="monotone" dataKey="value" name="Collections" stroke="#10b981" strokeWidth={2} fill="url(#revenueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Top performers ── */}
      {topInstitutions.length > 0 && (
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Trophy size={14} className="text-amber-500" /> Top Institutions by Collections
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topInstitutions.map((inst, i) => (
              <div key={inst.id} className="flex items-center gap-3 rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2.5">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                    : i === 1
                    ? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    : "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400"
                }`}>
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{inst.name}</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold tabular-nums" title={formatINRFull(inst.revenue)}>
                    {formatINRCompact(inst.revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Institutions table ── */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">All Institutions</h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Sorted by lifetime collections · last activity = most recent completed payment</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-2 font-semibold">Institution</th>
                <th className="px-4 py-2 font-semibold">Type</th>
                <th className="px-4 py-2 font-semibold text-right">Students</th>
                <th className="px-4 py-2 font-semibold text-right">Staff</th>
                <th className="px-4 py-2 font-semibold text-right">Revenue</th>
                <th className="px-4 py-2 font-semibold">Last Activity</th>
                <th className="px-4 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {institutions.map((inst) => (
                <tr key={inst.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-violet-50/40 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/institutions/${inst.slug}`}
                      className="text-xs font-semibold text-slate-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                    >
                      {inst.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">{inst.collegeType ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 text-right tabular-nums">{intFmt.format(inst.students)}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 text-right tabular-nums">{intFmt.format(inst.staff)}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white text-right tabular-nums" title={formatINRFull(inst.revenue)}>
                    {formatINRCompact(inst.revenue)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">{formatLastActivity(inst.lastActivity)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      inst.status === "Active"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}>
                      {inst.status}
                    </span>
                  </td>
                </tr>
              ))}
              {institutions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">
                    No institutions registered yet.
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
