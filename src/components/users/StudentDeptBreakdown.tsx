"use client";

import { useMemo, type CSSProperties } from "react";
import { DepartmentFundingBadge } from "@/components/departments/DepartmentFundingBadge";
import { getDeptColor } from "@/lib/deptColors";
import { getDeptIcon } from "@/lib/deptIcons";
import type { StudentProgram } from "@/lib/studentProgram";

type DeptTone = ReturnType<typeof getDeptColor>;

export type StudentPerson = {
  id: string;
  department_id: string | null;
  tenant_id: string;
  student_program?: string | null;
  student_year?: number | null;
};

type Props = {
  tenantId: string;
  students: StudentPerson[];
  departments: { id: string; name: string; tenant_id: string; funding_type?: string | null; color?: string | null }[];
  activeKey: string | null;
  onSelectSegment: (key: string | null, deptId: string | null, program: StudentProgram | null, year: number | null) => void;
};

function YearPill({
  deptId,
  program,
  year,
  count,
  activeKey,
  onSelectSegment,
  tone,
}: {
  deptId: string;
  program: StudentProgram;
  year: number;
  count: number;
  activeKey: string | null;
  onSelectSegment: Props["onSelectSegment"];
  tone: DeptTone;
}) {
  const k = `${deptId}:${program}:${year}`;
  const active = activeKey === k;
  const quiet = count === 0;

  const inactiveStyle: CSSProperties | undefined = active
    ? undefined
    : quiet
      ? {
          borderColor: tone.border,
          backgroundColor: tone.bg2,
          color: tone.text,
          opacity: 0.42,
        }
      : {
          borderColor: tone.border,
          backgroundColor: "rgba(255,255,255,0.82)",
          color: tone.text,
        };

  return (
    <button
      type="button"
      title={`${program} Year ${year}${count ? ` — ${count} students` : ""}`}
      onClick={() => {
        if (active) onSelectSegment(null, null, null, null);
        else onSelectSegment(k, deptId, program, year);
      }}
      style={inactiveStyle}
      className={[
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium tabular-nums transition-all border shadow-[0_1px_0_rgba(255,255,255,0.5)]",
        active
          ? "bg-violet-600 text-white border-violet-600 shadow-sm"
          : quiet
            ? "hover:opacity-70"
            : "hover:brightness-[0.98]",
      ].join(" ")}
    >
      <span className={active ? "text-white/90" : undefined}>Y{year}</span>
      <span className={`text-[10px] opacity-40 ${active ? "text-white" : ""}`}>·</span>
      <span className={active ? "text-white" : undefined}>{count}</span>
    </button>
  );
}

export function StudentDeptBreakdown({ tenantId, students, departments, activeKey, onSelectSegment }: Props) {
  const depts = useMemo(() => departments.filter((d) => d.tenant_id === tenantId), [departments, tenantId]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    const key = (deptId: string, program: StudentProgram, year: number) => `${deptId}:${program}:${year}`;

    for (const s of students) {
      if (s.tenant_id !== tenantId) continue;
      const prog = s.student_program as StudentProgram | null | undefined;
      const yr = s.student_year;
      if (!s.department_id || !prog || yr == null) continue;
      const k = key(s.department_id, prog, yr);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [students, tenantId]);

  return (
    <div className="shrink-0">
      {activeKey ? (
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={() => onSelectSegment(null, null, null, null)}
            className="text-[11px] font-medium text-violet-600 hover:text-violet-800 px-2 py-1 rounded-md hover:bg-violet-50"
          >
            Clear selection
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {depts.map((d) => {
          const c = getDeptColor(d.color);
          return (
            <article
              key={d.id}
              className="relative overflow-hidden rounded-xl border px-3 py-3 shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-md hover:-translate-y-px"
              style={{
                background: `linear-gradient(135deg, ${c.bg} 0%, ${c.bg2} 100%)`,
                borderColor: c.border,
              }}
            >
              <header
                className="flex items-center gap-2 pb-2.5 mb-2.5 border-b"
                style={{ borderBottomColor: c.border }}
              >
                {(() => {
                  const Icon = getDeptIcon(d.name);
                  return (
                    <span
                      className="w-8 h-8 rounded-lg border shrink-0 flex items-center justify-center bg-white/80"
                      style={{ borderColor: c.border }}
                    >
                      <Icon className="w-4 h-4" style={{ color: c.hex }} />
                    </span>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: c.text }}>
                    {d.name}
                  </p>
                </div>
                <DepartmentFundingBadge fundingType={d.funding_type} className="shrink-0" />
              </header>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-sky-700/90">UG</span>
                  <div className="flex flex-wrap gap-1">
                    {[1, 2, 3].map((year) => (
                      <YearPill
                        key={`ug-${year}`}
                        deptId={d.id}
                        program="UG"
                        year={year}
                        count={counts.get(`${d.id}:UG:${year}`) ?? 0}
                        activeKey={activeKey}
                        onSelectSegment={onSelectSegment}
                        tone={c}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-7 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-amber-800/85">PG</span>
                  <div className="flex flex-wrap gap-1">
                    {[1, 2].map((year) => (
                      <YearPill
                        key={`pg-${year}`}
                        deptId={d.id}
                        program="PG"
                        year={year}
                        count={counts.get(`${d.id}:PG:${year}`) ?? 0}
                        activeKey={activeKey}
                        onSelectSegment={onSelectSegment}
                        tone={c}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {depts.length === 0 && <p className="text-xs text-slate-500 py-6 text-center">No departments for this institution.</p>}
    </div>
  );
}
