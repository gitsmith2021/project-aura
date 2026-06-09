"use client";

import { useEffect, useState, use } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MarksheetCard } from "@/components/results/MarksheetCard";
import { getStudentMarksheet, ExamResult } from "@/actions/examResults";
import { createClient } from "@/utils/supabase/client";
import { Award } from "lucide-react";

type Student = {
  id: string;
  full_name: string;
  roll_number: string | null;
  program: string | null;
  institution_id: string;
  departments: { name: string } | null;
};

export default function AdminStudentResultsPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);

  const [student,  setStudent]  = useState<Student | null>(null);
  const [results,  setResults]  = useState<ExamResult[]>([]);
  const [instName, setInstName] = useState("");
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("students")
      .select("id, full_name, roll_number, program, institution_id, departments(name)")
      .eq("id", studentId)
      .single()
      .then(async ({ data: stu }) => {
        if (!stu) { setLoading(false); return; }
        setStudent(stu as unknown as Student);

        const [instRes, marksRes] = await Promise.all([
          supabase.from("institutions").select("name").eq("id", stu.institution_id).single(),
          getStudentMarksheet(stu.id, stu.institution_id),
        ]);

        if (instRes.data)    setInstName(instRes.data.name);
        if (marksRes.success) setResults(marksRes.data);
        setLoading(false);
      });
  }, [studentId]);

  const breadcrumb = (
    <>
      <span className="text-slate-400">Students</span>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-400">{student?.full_name ?? "Student"}</span>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-900 font-semibold">Results</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="px-6 pt-6 pb-6 w-full max-w-3xl mx-auto">

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800/50 flex items-center justify-center shrink-0">
            <Award size={19} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {student?.full_name ?? "Student"} — Results
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Full academic result record</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        ) : (
          <MarksheetCard
            results={results}
            studentName={student?.full_name ?? "Unknown Student"}
            rollNumber={student?.roll_number}
            department={student?.departments?.name}
            program={student?.program ?? undefined}
            institutionName={instName}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
