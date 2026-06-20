"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { getExamsByDepartment, ExamSchedule } from "@/actions/examSchedules";
import { ClipboardList, Calendar, Clock, MapPin, BookOpen } from "lucide-react";

const EXAM_TYPE_COLORS: Record<string, string> = {
  internal:      "bg-violet-100 text-violet-700 border-violet-200",
  semester:      "bg-blue-100 text-blue-700 border-blue-200",
  arrear:        "bg-rose-100 text-rose-700 border-rose-200",
  supplementary: "bg-amber-100 text-amber-700 border-amber-200",
};

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
}

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const d = new Date();
  d.setHours(+h, +m, 0);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

function daysUntil(d: string) {
  const diff = new Date(d + "T00:00:00").getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86400000);
}

export default function StudentExamsPage() {
  const [exams, setExams]     = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setStudentName] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const { data: student } = await supabase
        .from("students")
        .select("id, full_name, department_id, institution_id")
        .eq("profile_id", user.id)
        .single();

      if (!student) { setLoading(false); return; }
      setStudentName(student.full_name);

      const res = await getExamsByDepartment(student.institution_id, student.department_id);
      if (res.success) setExams(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">

        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
            <ClipboardList size={18} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Upcoming Exams</h1>
            <p className="text-xs text-slate-500">Your upcoming examination schedule</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-violet-600" />
          </div>
        ) : exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 rounded-xl bg-slate-50 dark:bg-slate-800/40">
            <ClipboardList size={32} className="text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-500">No upcoming exams</p>
            <p className="text-xs text-slate-400 mt-1">Check back when the exam schedule is published.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exams.map(exam => {
              const days = daysUntil(exam.exam_date);
              const isToday   = days === 0;
              const isTomorrow = days === 1;
              const isSoon    = days <= 3;

              return (
                <div
                  key={exam.id}
                  className={`rounded-xl border bg-white dark:bg-slate-800/60 shadow-sm overflow-hidden transition-all ${
                    isToday ? "border-rose-300 ring-1 ring-rose-200" :
                    isSoon  ? "border-amber-200" : "border-slate-200"
                  }`}
                >
                  <div className="px-4 py-3 flex items-start gap-3">
                    <div className={`w-1 self-stretch rounded-full shrink-0 ${
                      isToday ? "bg-rose-500" : isSoon ? "bg-amber-400" : "bg-violet-400"
                    }`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{exam.subject_name}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${EXAM_TYPE_COLORS[exam.exam_type] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {exam.exam_type.charAt(0).toUpperCase() + exam.exam_type.slice(1)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="text-slate-400" />
                          {formatDate(exam.exam_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-slate-400" />
                          {formatTime(exam.start_time)} – {formatTime(exam.end_time)}
                        </span>
                        {exam.hall_name && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} className="text-slate-400" />
                            {exam.hall_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <BookOpen size={11} className="text-slate-400" />
                          Sem {exam.semester} · {exam.max_marks} marks
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isToday ? (
                        <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wide">Today</span>
                      ) : isTomorrow ? (
                        <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">Tomorrow</span>
                      ) : days > 0 ? (
                        <span className={`text-[11px] font-semibold uppercase tracking-wide ${isSoon ? "text-amber-500" : "text-slate-400"}`}>
                          {days}d left
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && exams.length > 0 && (
          <p className="text-[11px] text-slate-400 text-center mt-6">
            Showing {exams.length} upcoming exam{exams.length !== 1 ? "s" : ""} · Download hall ticket from the admin portal
          </p>
        )}
    </div>
  );
}
