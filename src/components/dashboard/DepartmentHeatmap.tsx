import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { TooltipProps } from "recharts";
import { getDeptColor } from "@/lib/deptColors";

interface DepartmentHeatmapProps {
  departments: { id: string; name: string; studentsCount: number; color?: string | null }[];
}

function HeatmapTooltip({ active, payload, label }: any) {
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

export function DepartmentHeatmap({ departments }: DepartmentHeatmapProps) {
  const chartData = useMemo(() => {
    return [...departments]
      .sort((a, b) => b.studentsCount - a.studentsCount)
      .map(d => ({
        name: d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name,
        fullName: d.name,
        students: d.studentsCount,
        color: getDeptColor(d.color).hex,
        bgColor: getDeptColor(d.color).bg2,
      }));
  }, [departments]);

  if (departments.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <p className="text-xs text-slate-400">No department data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white/75 backdrop-blur-sm rounded-xl border border-slate-100/90 p-5 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <h3 className="text-sm font-semibold text-slate-900 mb-1">Departmental Heatmap</h3>
      <p className="text-[11px] text-slate-500 mb-6">Student distribution across departments</p>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748B' }}
              width={100}
            />
            <Tooltip content={<HeatmapTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} />
            <Bar dataKey="students" radius={[0, 99, 99, 0]} barSize={16}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}