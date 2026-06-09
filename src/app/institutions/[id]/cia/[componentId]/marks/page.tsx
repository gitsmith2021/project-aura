"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CIAMarksGrid } from "@/components/cia/CIAMarksGrid";
import { getCIAComponents } from "@/actions/cia";
import { useEffect, useState } from "react";
import type { CIAComponent } from "@/actions/cia";
import { ChevronLeft, ClipboardList, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

const TYPE_LABELS: Record<string, string> = {
  unit_test:        "Unit Test",
  assignment:       "Assignment",
  lab_record:       "Lab Record",
  seminar:          "Seminar",
  attendance_marks: "Attendance Marks",
  viva:             "Viva",
  other:            "Other",
};

const TYPE_COLORS: Record<string, string> = {
  unit_test:        "bg-violet-100 text-violet-700",
  assignment:       "bg-blue-100 text-blue-700",
  lab_record:       "bg-emerald-100 text-emerald-700",
  seminar:          "bg-amber-100 text-amber-700",
  attendance_marks: "bg-slate-100 text-slate-600",
  viva:             "bg-rose-100 text-rose-700",
  other:            "bg-gray-100 text-gray-600",
};

export default function CIAMarksPage({
  params,
}: {
  params: Promise<{ id: string; componentId: string }>;
}) {
  const { id: institutionId, componentId } = use(params);
  const searchParams = useSearchParams();
  const deptId  = searchParams.get("dept") ?? "";
  const semStr  = searchParams.get("sem")  ?? "";

  const [component, setComponent] = useState<CIAComponent | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    getCIAComponents(institutionId, {}).then(res => {
      if (!res.success) { setError(res.error); setLoading(false); return; }
      const found = res.data.find(c => c.id === componentId);
      if (!found) { setError("Component not found."); setLoading(false); return; }
      setComponent(found);
      setLoading(false);
    });
  }, [institutionId, componentId]);

  const backHref = `/institutions/${institutionId}/cia${deptId ? `?dept=${deptId}&sem=${semStr}` : ""}`;

  return (
    <DashboardLayout>
      <div className="px-6 pt-6 pb-6 w-full">

        {/* Breadcrumb */}
        <Link href={backHref}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-600 font-medium mb-5 transition-colors">
          <ChevronLeft size={13} /> Back to CIA Components
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={22} className="animate-spin text-violet-500" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-rose-600 text-sm py-8">
            <AlertCircle size={16} /> {error}
          </div>
        ) : component ? (
          <>
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                <ClipboardList size={18} className="text-violet-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900">{component.name}</h1>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${TYPE_COLORS[component.component_type]}`}>
                    {TYPE_LABELS[component.component_type] ?? component.component_type}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                  <span>Max Marks: <strong className="text-slate-700">{component.max_marks}</strong></span>
                  {component.semester && <span>Semester <strong className="text-slate-700">{component.semester}</strong></span>}
                  {component.subjects && (
                    <span>
                      {component.subjects.name}
                      {component.subjects.code ? ` (${component.subjects.code})` : ""}
                    </span>
                  )}
                  {component.academic_years && <span>{component.academic_years.label}</span>}
                </div>
              </div>
            </div>

            {!deptId ? (
              <div className="flex items-center gap-2 text-amber-600 text-sm py-8 bg-amber-50 border border-amber-200 rounded-xl px-4">
                <AlertCircle size={15} />
                Department context missing. Please navigate from the CIA page.
              </div>
            ) : (
              <CIAMarksGrid
                component={component}
                institutionId={institutionId}
                departmentId={deptId}
              />
            )}
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
