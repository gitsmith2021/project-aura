"use client";

import { useEffect, useState, use } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MarksheetCard } from "@/components/results/MarksheetCard";
import { getStudentMarksheet, ExamResult } from "@/actions/examResults";
import { createClient } from "@/utils/supabase/client";
import { Award } from "lucide-react";
import Link from "next/link";

type Student = {
  id: string;
  full_name: string;
  roll_number: string | null;
  program: string | null;
  year: number | null;
  departments: { name: string } | null;
};

export default function StudentMarksheetPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const { id: institutionId, studentId } = use(params);

  const [student, setStudent]   = useState<Student | null>(null);
  const [results, setResults]   = useState<ExamResult[]>([]);
  const [instName, setInstName] = useState("");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("institutions").select("name").eq("id", institutionId).single(),
      supabase
        .from("students")
        .select("id, full_name, roll_number, program, year, departments(name)")
        .eq("id", studentId)
        .single(),
      getStudentMarksheet(studentId, institutionId),
    ]).then(([inst, stu, marks]) => {
      if (inst.data) setInstName(inst.data.name);
      if (stu.data)  setStudent(stu.data as unknown as Student);
      if (marks.success) setResults(marks.data);
      setLoading(false);
    });
  }, [institutionId, studentId]);

  const breadcrumb = (
    <>
      <span className="text-slate-400">Institutions</span>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-400">{instName}</span>
      <span className="mx-2 text-slate-300">/</span>
      <Link href={`/institutions/${institutionId}/results`} className="text-slate-400 hover:text-slate-700 transition-colors">
        Results
      </Link>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-900 font-semibold">{student?.full_name ?? "Marksheet"}</span>
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
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">Student Marksheet</h1>
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
