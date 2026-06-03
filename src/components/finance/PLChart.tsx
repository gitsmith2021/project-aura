"use client";

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { MonthlyPLData } from "@/types/finance";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtLakhs(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 10_00_000) return `₹${(v / 10_00_000).toFixed(1)}M`;
  if (abs >= 1_00_000)  return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000)     return `₹${(v / 1_000).toFixed(0)}k`;
  return `₹${v}`;
}

function fmtINR(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/60 rounded-xl p-3 shadow-xl min-w-[180px]">
      <p className="text-[11px] font-bold text-slate-300 mb-2 uppercase tracking-wide">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-[10px] text-slate-400 capitalize">{p.name}</span>
          </div>
          <span className={`text-[11px] font-semibold tabular-nums ${p.name === "net" ? (p.value >= 0 ? "text-violet-400" : "text-rose-400") : "text-slate-200"}`}>
            {fmtINR(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = { data: MonthlyPLData[] };

export function PLChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmtLakhs}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
          formatter={(value: string) => (
            <span style={{ color: "#94a3b8", textTransform: "capitalize" }}>{value}</span>
          )}
        />
        <Bar dataKey="income"   name="Income"   fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="salary"   name="Salary"   fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Line
          dataKey="net"
          name="net"
          type="monotone"
          stroke="#7c3aed"
          strokeWidth={2.5}
          dot={{ fill: "#7c3aed", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
