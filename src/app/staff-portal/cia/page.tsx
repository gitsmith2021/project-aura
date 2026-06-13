"use client";

import { useEffect, useState } from "react";
import { getMyTeachingCIAComponents, type CIAComponent } from "@/actions/cia";
import { CIAMarksGrid } from "@/components/cia/CIAMarksGrid";
import {
  ClipboardList, Loader2, AlertCircle, ChevronLeft, BookOpen, ChevronRight,
} from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  unit_test: "Unit Test", assignment: "Assignment", lab_record: "Lab Record",
  seminar: "Seminar", attendance_marks: "Attendance Marks", viva: "Viva", other: "Other",
};
const TYPE_COLORS: Record<string, string> = {
  unit_test: "bg-violet-100 text-violet-700", assignment: "bg-blue-100 text-blue-700",
  lab_record: "bg-emerald-100 text-emerald-700", seminar: "bg-amber-100 text-amber-700",
  attendance_marks: "bg-slate-100 text-slate-600", viva: "bg-rose-100 text-rose-700",
  other: "bg-gray-100 text-gray-600",
};

export default function StaffCIAPage() {
  const [components, setComponents] = useState<CIAComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CIAComponent | null>(null);

  useEffect(() => {
    getMyTeachingCIAComponents().then((res) => {
      if (!res.success) setError(res.error);
      else setComponents(res.data);
      setLoading(false);
    });
  }, []);

  // Group components by subject for a clean list
  const groups = components.reduce<Record<string, { name: string; items: CIAComponent[] }>>((acc, c) => {
    const key = c.subject_id ?? "none";
    const name = c.subjects ? `${c.subjects.name}${c.subjects.code ? ` (${c.subjects.code})` : ""}` : "Unassigned subject";
    if (!acc[key]) acc[key] = { name, items: [] };
    acc[key].items.push(c);
    return acc;
  }, {});

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
          <ClipboardList size={18} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">CIA Marks Entry</h1>
          <p className="text-xs text-slate-500">Enter internal assessment marks for subjects you teach</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-violet-500" /></div>
      ) : error ? (
        <div className="flex items-center gap-2 text-rose-600 text-sm py-8 bg-rose-50 border border-rose-200 rounded-xl px-4">
          <AlertCircle size={15} /> {error}
        </div>
      ) : selected ? (
        <div>
          <button
            onClick={() => setSelected(null)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-600 font-medium mb-4 transition-colors"
          >
            <ChevronLeft size={13} /> Back to my components
          </button>

          <div className="flex items-center gap-2 flex-wrap mb-4">
            <h2 className="text-base font-bold text-slate-900">{selected.name}</h2>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${TYPE_COLORS[selected.component_type]}`}>
              {TYPE_LABELS[selected.component_type] ?? selected.component_type}
            </span>
            <span className="text-xs text-slate-500">Max {selected.max_marks}</span>
            {selected.subjects && (
              <span className="text-xs text-slate-500">· {selected.subjects.name}{selected.subjects.code ? ` (${selected.subjects.code})` : ""}</span>
            )}
          </div>

          {!selected.department_id ? (
            <div className="flex items-center gap-2 text-amber-600 text-sm py-8 bg-amber-50 border border-amber-200 rounded-xl px-4">
              <AlertCircle size={15} />
              This component isn&apos;t linked to a department, so its student list can&apos;t be resolved. Ask an admin to set the component&apos;s department.
            </div>
          ) : (
            <CIAMarksGrid
              component={selected}
              institutionId={selected.institution_id}
              departmentId={selected.department_id}
            />
          )}
        </div>
      ) : components.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
          <BookOpen size={32} className="opacity-25" />
          <p className="text-sm">No CIA components for your subjects yet.</p>
          <p className="text-xs text-slate-400 max-w-sm text-center">
            Components are created by your admin/HOD against the subjects you&apos;re assigned to teach.
            Once they exist, they&apos;ll appear here for marks entry.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groups).map(([key, group]) => (
            <div key={key}>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen size={12} /> {group.name}
              </h2>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {group.items.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-violet-50/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide shrink-0 ${TYPE_COLORS[c.component_type]}`}>
                        {TYPE_LABELS[c.component_type] ?? c.component_type}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{c.name}</p>
                        <p className="text-[11px] text-slate-400">
                          Max {c.max_marks}
                          {c.semester ? ` · Semester ${c.semester}` : ""}
                          {c.academic_years ? ` · ${c.academic_years.label}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-semibold text-violet-600 shrink-0">
                      Enter Marks <ChevronRight size={13} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
