"use client";

import { useEffect, useState, use, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ExamScheduleTable } from "@/components/exams/ExamScheduleTable";
import { ExamFormDrawer } from "@/components/exams/ExamFormDrawer";
import { getExamsByInstitution, ExamSchedule } from "@/actions/examSchedules";
import { createClient } from "@/utils/supabase/client";
import { ClipboardList } from "lucide-react";

type Department   = { id: string; name: string };
type AcademicYear = { id: string; label: string };

export default function ExamsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: institutionId } = use(params);

  const [exams, setExams]               = useState<ExamSchedule[]>([]);
  const [departments, setDepartments]   = useState<Department[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [institutionName, setInstitutionName] = useState("");
  const [loading, setLoading]           = useState(true);
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editExam, setEditExam]         = useState<ExamSchedule | null>(null);

  const fetchExams = useCallback(async () => {
    const res = await getExamsByInstitution(institutionId);
    if (res.success) setExams(res.data);
  }, [institutionId]);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("institutions").select("name").eq("id", institutionId).single(),
      supabase.from("departments").select("id, name").eq("institution_id", institutionId).order("name"),
      supabase.from("academic_years").select("id, label").eq("institution_id", institutionId).order("label", { ascending: false }),
    ]).then(([inst, depts, years]) => {
      if (inst.data)  setInstitutionName(inst.data.name);
      if (depts.data) setDepartments(depts.data);
      if (years.data) setAcademicYears(years.data);
    });
    fetchExams().finally(() => setLoading(false));
  }, [institutionId, fetchExams]);

  const openAdd = () => { setEditExam(null); setDrawerOpen(true); };
  const openEdit = (exam: ExamSchedule) => { setEditExam(exam); setDrawerOpen(true); };

  const breadcrumb = (
    <>
      <span className="text-slate-400">Institutions</span>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-400">{institutionName}</span>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-900 font-semibold">Exam Planner</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="px-6 pt-6 pb-6 w-full max-w-7xl mx-auto">

        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
            <ClipboardList size={18} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Exam Planner</h1>
            <p className="text-xs text-slate-500">Schedule exams and generate hall tickets</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        ) : (
          <ExamScheduleTable
            exams={exams}
            institutionId={institutionId}
            departments={departments}
            onAdd={openAdd}
            onEdit={openEdit}
            onRefresh={fetchExams}
          />
        )}
      </div>

      <ExamFormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={fetchExams}
        institutionId={institutionId}
        departments={departments}
        academicYears={academicYears}
        examToEdit={editExam}
      />
    </DashboardLayout>
  );
}
