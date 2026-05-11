import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getDeptColor } from "@/lib/deptColors";
import { fundingTypeShortLabel } from "@/lib/deptFunding";

interface DepartmentHeatmapProps {
  departments: {
    id: string;
    name: string;
    studentsCount: number;
    color?: string | null;
    funding_type?: string | null;
  }[];
}

function HeatmapTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as { fullName: string; fundingLabel: string };
  return (
    <div style={{
      background: "rgba(10,8,25,0.92)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(124,58,237,0.25)",
      borderRadius: "10px",
      padding: "7px 12px",
      boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
    }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 2 }}>{row.fullName}</p>
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>{row.fundingLabel}</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#C4B5FD" }}>{payload[0].value?.toLocaleString()}<span style={{ fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>students</span></p>
    </div>
  );
}

export function DepartmentHeatmap({ departments }: DepartmentHeatmapProps) {
  const chartData = useMemo(() => {
    return [...departments]
      .sort((a, b) => b.studentsCount - a.studentsCount)
      .map(d => {
        const tag = fundingTypeShortLabel(d.funding_type);
        const shortBase = d.name.length > 15 ? d.name.substring(0, 15) + "…" : d.name;
        return {
          name: `${shortBase} · ${tag}`,
          fullName: d.name,
          fundingLabel: tag,
          students: d.studentsCount,
          color: getDeptColor(d.color).hex,
          bgColor: getDeptColor(d.color).bg2,
        };
      });
  }, [departments]);

  if (departments.length === 0) {
    return (
      <div className="h-full min-h-[200px] flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <p className="text-xs text-slate-400">No department data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white/75 backdrop-blur-sm rounded-xl border border-slate-100/90 p-5 shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex flex-col h-full min-h-[200px] min-w-0">
      <h3 className="text-sm font-semibold text-slate-900 mb-1 shrink-0">Departmental Heatmap</h3>
      <p className="text-[11px] text-slate-500 mb-4 shrink-0">Student distribution across departments</p>

      <div className="flex-1 min-h-[160px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748B' }}
              width={124}
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