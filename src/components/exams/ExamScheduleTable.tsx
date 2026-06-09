"use client";

import { useState } from "react";
import { Pencil, Trash2, Ticket, Plus, FileSearch } from "lucide-react";
import Link from "next/link";
import { ExamSchedule, ExamType, deleteExam } from "@/actions/examSchedules";

const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  internal:       "Internal",
  semester:       "Semester",
  arrear:         "Arrear",
  supplementary:  "Supplementary",
};

const EXAM_TYPE_COLORS: Record<ExamType, string> = {
  internal:      "bg-violet-100 text-violet-700 border-violet-200",
  semester:      "bg-blue-100 text-blue-700 border-blue-200",
  arrear:        "bg-rose-100 text-rose-700 border-rose-200",
  supplementary: "bg-amber-100 text-amber-700 border-amber-200",
};

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const d = new Date();
  d.setHours(+h, +m, 0);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

type Props = {
  exams: ExamSchedule[];
  institutionId: string;
  departments: { id: string; name: string }[];
  onAdd: () => void;
  onEdit: (exam: ExamSchedule) => void;
  onRefresh: () => void;
};

export function ExamScheduleTable({ exams, institutionId, departments, onAdd, onEdit, onRefresh }: Props) {
  const [filterDept, setFilterDept]   = useState("");
  const [filterType, setFilterType]   = useState("");
  const [filterSem, setFilterSem]     = useState("");
  const [deleting, setDeleting]       = useState<string | null>(null);

  const filtered = exams.filter(e => {
    if (filterDept && e.department_id !== filterDept) return false;
    if (filterType && e.exam_type !== filterType)     return false;
    if (filterSem  && String(e.semester) !== filterSem) return false;
    return true;
  });

  const handleDelete = async (exam: ExamSchedule) => {
    if (!confirm(`Delete "${exam.subject_name}" exam on ${formatDate(exam.exam_date)}?`)) return;
    setDeleting(exam.id);
    await deleteExam(exam.id, institutionId);
    setDeleting(null);
    onRefresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filters + Add */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:ring-1 focus:ring-violet-400 focus:border-violet-400 outline-none"
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:ring-1 focus:ring-violet-400 focus:border-violet-400 outline-none"
        >
          <option value="">All Types</option>
          {(["internal","semester","arrear","supplementary"] as ExamType[]).map(t => (
            <option key={t} value={t}>{EXAM_TYPE_LABELS[t]}</option>
          ))}
        </select>

        <select
          value={filterSem}
          onChange={e => setFilterSem(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:ring-1 focus:ring-violet-400 focus:border-violet-400 outline-none"
        >
          <option value="">All Semesters</option>
          {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>

        <div className="ml-auto">
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus size={14} /> Add Exam
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <FileSearch size={32} className="text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No exams found</p>
          <p className="text-xs text-slate-400 mt-1">Adjust filters or add a new exam schedule.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Department</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date & Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Hall / Sem</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Marks</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(exam => (
                <tr key={exam.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-4 py-3 font-medium text-slate-800">{exam.subject_name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{exam.departments?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${EXAM_TYPE_COLORS[exam.exam_type]}`}>
                      {EXAM_TYPE_LABELS[exam.exam_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <p className="font-medium text-slate-800">{formatDate(exam.exam_date)}</p>
                    <p className="text-slate-400">{formatTime(exam.start_time)} – {formatTime(exam.end_time)}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <p>{exam.hall_name || "—"}</p>
                    <p className="text-slate-400">Sem {exam.semester}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <p>{exam.max_marks} max</p>
                    <p className="text-slate-400">{exam.pass_marks} pass</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <Link
                        href={`/institutions/${institutionId}/exams/${exam.id}/hall-ticket`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                        title="Hall ticket"
                      >
                        <Ticket size={14} />
                      </Link>
                      <button
                        onClick={() => onEdit(exam)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(exam)}
                        disabled={deleting === exam.id}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
