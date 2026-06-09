"use client";

import { Printer, Building2, BookOpen, Calendar, Clock, MapPin, Hash } from "lucide-react";

type Student = { id: string; full_name: string; roll_number: string | null; year: number | null };
type Exam = {
  subject_name: string;
  exam_type: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  hall_name: string | null;
  max_marks: number;
  pass_marks: number;
  semester: number;
  departments?: { name: string } | null;
  academic_years?: { label: string } | null;
  institutions?: { name: string } | null;
};

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const d = new Date();
  d.setHours(+h, +m, 0);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type Props = { exam: Exam; students: Student[] };

export function HallTicketCard({ exam, students }: Props) {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Print button — hidden in print */}
      <div className="flex justify-end mb-4 print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
        >
          <Printer size={15} /> Print Hall Tickets
        </button>
      </div>

      {/* Individual hall ticket per student */}
      {students.map((student, idx) => (
        <div
          key={student.id}
          className="border-2 border-slate-300 rounded-xl mb-6 overflow-hidden bg-white print:break-inside-avoid print:mb-0 print:border-black"
          style={{ pageBreakAfter: idx < students.length - 1 ? "always" : "auto" }}
        >
          {/* Header */}
          <div className="bg-violet-700 print:bg-black px-6 py-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-base truncate">{exam.institutions?.name ?? "Institution"}</p>
              <p className="text-violet-200 print:text-gray-300 text-xs">
                {exam.departments?.name} · {exam.academic_years?.label ?? ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white text-[10px] font-semibold uppercase tracking-widest">Hall Ticket</p>
              <p className="text-violet-200 print:text-gray-300 text-xs">{capitalize(exam.exam_type)} Examination</p>
            </div>
          </div>

          {/* Student details */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-start gap-4">
            {/* Photo placeholder */}
            <div className="w-20 h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center shrink-0 text-slate-400">
              <div className="w-8 h-8 bg-slate-200 rounded-full mb-1" />
              <p className="text-[9px] text-center leading-tight">Paste Photo</p>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Student Name</p>
                <p className="text-sm font-bold text-slate-900">{student.full_name}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold flex items-center gap-1"><Hash size={10} /> Roll Number</p>
                <p className="text-sm font-bold text-slate-900">{student.roll_number ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Department</p>
                <p className="text-sm text-slate-700">{exam.departments?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Year / Semester</p>
                <p className="text-sm text-slate-700">Year {student.year ?? "—"} · Sem {exam.semester}</p>
              </div>
            </div>
          </div>

          {/* Exam details */}
          <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-start gap-2">
              <BookOpen size={14} className="text-violet-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Subject</p>
                <p className="text-xs font-semibold text-slate-800">{exam.subject_name}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar size={14} className="text-violet-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Date</p>
                <p className="text-xs font-semibold text-slate-800">{formatDate(exam.exam_date)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock size={14} className="text-violet-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Time</p>
                <p className="text-xs font-semibold text-slate-800">
                  {formatTime(exam.start_time)} – {formatTime(exam.end_time)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-violet-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Hall</p>
                <p className="text-xs font-semibold text-slate-800">{exam.hall_name ?? "TBA"}</p>
              </div>
            </div>
          </div>

          {/* Marks + signature */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Max Marks: <span className="font-semibold text-slate-700">{exam.max_marks}</span>
              &nbsp;·&nbsp;
              Pass Marks: <span className="font-semibold text-slate-700">{exam.pass_marks}</span>
            </p>
            <div className="text-right">
              <div className="w-32 border-b border-slate-400 mb-0.5" />
              <p className="text-[10px] text-slate-400">Controller of Examinations</p>
            </div>
          </div>
        </div>
      ))}

      {students.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-200 rounded-xl bg-slate-50">
          <p className="text-sm font-medium text-slate-500">No students found for this department.</p>
          <p className="text-xs text-slate-400 mt-1">Add students to the department to generate hall tickets.</p>
        </div>
      )}
    </div>
  );
}
