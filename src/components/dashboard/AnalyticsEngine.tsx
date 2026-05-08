"use client";

import { useMemo } from "react";
import { Users, UserCheck, BookOpen, Activity } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import type { TooltipProps } from "recharts";
import { College } from "./CollegeCard";

// ─── Sparkline ───────────────────────────────────────────────────────────────
const MOCK_TRENDS = {
  students: [72, 78, 75, 84, 80, 91, 100],
  staff:    [68, 71, 70, 76, 74, 82, 100],
  depts:    [60, 65, 68, 72, 75, 88, 100],
  util:     [88, 84, 92, 90, 94, 91, 100],
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 52, H = 18;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <polyline
        points={pts}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
    </svg>
  );
}

// ─── Dark Tooltips ────────────────────────────────────────────────────────────
function BarTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(10,8,25,0.92)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(124,58,237,0.25)",
      borderRadius: "10px",
      padding: "7px 12px",
      boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
    }}>
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#C4B5FD" }}>{payload[0].value?.toLocaleString()}<span style={{ fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>students</span></p>
    </div>
  );
}

function DonutTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const colorMap: Record<string, string> = { Students: "#C4B5FD", Staff: "#5EEAD4" };
  return (
    <div style={{
      background: "rgba(10,8,25,0.92)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(124,58,237,0.25)",
      borderRadius: "10px",
      padding: "7px 12px",
      boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
    }}>
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{payload[0].name}</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: colorMap[payload[0].name as string] ?? "#C4B5FD" }}>{payload[0].value?.toLocaleString()}</p>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface AnalyticsEngineProps {
  colleges: College[];
  loading: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AnalyticsEngine({ colleges, loading }: AnalyticsEngineProps) {
  const stats = useMemo(() => {
    let totalStudents = 0, totalStaff = 0, totalDepartments = 0, activeInstitutions = 0;
    colleges.forEach(c => {
      totalStudents    += c.studentsCount    || 0;
      totalStaff       += c.staffCount       || 0;
      totalDepartments += c.departmentsCount || 0;
      if (c.status === "active" || !c.status) activeInstitutions++;
    });
    return {
      totalStudents, totalStaff, totalDepartments,
      utilization: colleges.length > 0 ? Math.round((activeInstitutions / colleges.length) * 100) : 0,
    };
  }, [colleges]);

  const barChartData = useMemo(() =>
    colleges
      .filter(c => ["Bishop Thorp", "Bishop Heber", "Bishops"].some(n => c.name.includes(n)))
      .map(c => ({
        name: c.name.includes("Thorp") ? "Thorp" : c.name.includes("Heber") ? "Heber" : "Nursing",
        students: c.studentsCount || 0,
      })),
    [colleges]
  );

  const donutData = useMemo(() => [
    { name: "Students", value: stats.totalStudents },
    { name: "Staff",    value: stats.totalStaff    },
  ], [stats]);

  const totalPeople = stats.totalStudents + stats.totalStaff;
  const COLORS = ["#7C3AED", "#14B8A6"];

  const kpis = [
    { label: "Total Enrollment",   value: stats.totalStudents.toLocaleString(), icon: Users,     iconColor: "text-violet-500", bg: "bg-violet-50",  trend: MOCK_TRENDS.students, trendColor: "#7C3AED" },
    { label: "Faculty Strength",   value: stats.totalStaff.toLocaleString(),    icon: UserCheck, iconColor: "text-teal-500",   bg: "bg-teal-50",    trend: MOCK_TRENDS.staff,    trendColor: "#14B8A6" },
    { label: "Academic Diversity", value: stats.totalDepartments.toLocaleString(), icon: BookOpen, iconColor: "text-blue-500", bg: "bg-blue-50",   trend: MOCK_TRENDS.depts,    trendColor: "#3B82F6" },
    { label: "System Utilization", value: `${stats.utilization}%`,              icon: Activity,  iconColor: "text-orange-500", bg: "bg-orange-50",  trend: MOCK_TRENDS.util,     trendColor: "#F97316" },
  ];

  // ── Skeleton ──
  if (loading) {
    return (
      <div className="mb-5 space-y-3 shrink-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-white/80 rounded-xl border border-slate-100 p-3 h-[62px] animate-pulse flex items-center gap-3"
              style={{ animationDelay: `${i * 70}ms` }}>
              <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0" />
              <div className="flex-1">
                <div className="h-2 bg-slate-100 rounded w-20 mb-2" />
                <div className="h-4 bg-slate-100 rounded w-10" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[0, 1].map(i => (
            <div key={i} className="bg-white/80 rounded-xl border border-slate-100 p-4 h-48 animate-pulse"
              style={{ animationDelay: `${(i + 4) * 70}ms` }}>
              <div className="h-3 bg-slate-100 rounded w-36 mb-4" />
              <div className="h-32 bg-slate-50 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 space-y-3 shrink-0">
      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className="aura-fade-in relative overflow-hidden bg-white/75 backdrop-blur-sm rounded-xl border border-slate-100/90 p-3 flex items-center gap-2.5 shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
            style={{ animationDelay: `${i * 55}ms` }}
          >
            <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
              <kpi.icon className={`${kpi.iconColor} w-[15px] h-[15px]`} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9.5px] text-slate-400 font-medium uppercase tracking-widest truncate leading-none mb-0.5">{kpi.label}</p>
              <p className="text-[18px] font-bold text-slate-800 leading-tight tracking-tight">{kpi.value}</p>
            </div>
            <div className="absolute right-2 bottom-2 pointer-events-none">
              <Sparkline data={kpi.trend} color={kpi.trendColor} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* Bar Chart */}
        <div
          className="aura-fade-in bg-white/75 backdrop-blur-sm rounded-xl border border-slate-100/90 p-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
          style={{ animationDelay: "240ms" }}
        >
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Student Enrollment</p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="auraBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#7C3AED" stopOpacity={1} />
                    <stop offset="100%" stopColor="#C4B5FD" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  dy={6}
                />
                <YAxis
                  axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fill: "#CBD5E1" }}
                />
                <Tooltip content={<BarTooltipContent />} cursor={false} />
                <Bar dataKey="students" fill="url(#auraBarGrad)" radius={[99, 99, 99, 99]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div
          className="aura-fade-in bg-white/75 backdrop-blur-sm rounded-xl border border-slate-100/90 p-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
          style={{ animationDelay: "300ms" }}
        >
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Staff / Student Ratio</p>
          <div className="flex items-center gap-5">
            {/* Donut */}
            <div className="relative shrink-0" style={{ width: 148, height: 148 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%" cy="50%"
                    innerRadius={48} outerRadius={64}
                    paddingAngle={5}
                    cornerRadius={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[17px] font-bold text-slate-800 leading-none tracking-tight">{totalPeople.toLocaleString()}</span>
                <span className="text-[8.5px] text-slate-400 uppercase tracking-[0.12em] mt-0.5">Total</span>
              </div>
            </div>

            {/* Custom legend with mini progress bars */}
            <div className="flex flex-col gap-3 flex-1">
              {donutData.map((entry, i) => {
                const pct = totalPeople > 0 ? Math.round((entry.value / totalPeople) * 100) : 0;
                return (
                  <div key={entry.name}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS[i] }} />
                        <span className="text-[11px] text-slate-500">{entry.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-semibold text-slate-700">{entry.value.toLocaleString()}</span>
                        <span className="text-[9px] text-slate-400 ml-1">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: COLORS[i], transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
