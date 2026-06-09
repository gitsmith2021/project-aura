"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { ExamSchedule, ExamType, ExamFormData, addExam, updateExam } from "@/actions/examSchedules";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  institutionId: string;
  departments: { id: string; name: string }[];
  academicYears: { id: string; label: string }[];
  examToEdit?: ExamSchedule | null;
};

const EMPTY: Omit<ExamFormData, "institution_id"> = {
  department_id: null,
  subject_name: "",
  exam_type: "semester",
  exam_date: "",
  start_time: "",
  end_time: "",
  hall_name: "",
  max_marks: 100,
  pass_marks: 50,
  academic_year_id: null,
  semester: 1,
};

export function ExamFormDrawer({
  isOpen, onClose, onSuccess, institutionId, departments, academicYears, examToEdit,
}: Props) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (examToEdit) {
      setForm({
        department_id:    examToEdit.department_id,
        subject_name:     examToEdit.subject_name,
        exam_type:        examToEdit.exam_type,
        exam_date:        examToEdit.exam_date,
        start_time:       examToEdit.start_time.slice(0, 5),
        end_time:         examToEdit.end_time.slice(0, 5),
        hall_name:        examToEdit.hall_name ?? "",
        max_marks:        examToEdit.max_marks,
        pass_marks:       examToEdit.pass_marks,
        academic_year_id: examToEdit.academic_year_id,
        semester:         examToEdit.semester,
      });
    } else {
      setForm({ ...EMPTY, academic_year_id: academicYears.find(y => y) ? academicYears[0]?.id ?? null : null });
    }
    setError(null);
  }, [examToEdit, isOpen, academicYears]);

  const set = (k: keyof typeof EMPTY, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: ExamFormData = {
      ...form,
      institution_id: institutionId,
      hall_name: form.hall_name || null,
    };

    const res = examToEdit
      ? await updateExam(examToEdit.id, payload)
      : await addExam(payload);

    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {examToEdit ? "Edit Exam" : "Add Exam"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form id="exam-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Subject Name *</label>
            <input
              required
              value={form.subject_name}
              onChange={e => set("subject_name", e.target.value)}
              placeholder="e.g. Data Structures"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-violet-400 focus:border-violet-400 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
              <select
                value={form.department_id ?? ""}
                onChange={e => set("department_id", e.target.value || null)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-violet-400 outline-none"
              >
                <option value="">All Depts</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Exam Type *</label>
              <select
                required
                value={form.exam_type}
                onChange={e => set("exam_type", e.target.value as ExamType)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-violet-400 outline-none"
              >
                <option value="internal">Internal</option>
                <option value="semester">Semester</option>
                <option value="arrear">Arrear</option>
                <option value="supplementary">Supplementary</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Semester *</label>
              <select
                required
                value={form.semester}
                onChange={e => set("semester", +e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-violet-400 outline-none"
              >
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Academic Year</label>
              <select
                value={form.academic_year_id ?? ""}
                onChange={e => set("academic_year_id", e.target.value || null)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-violet-400 outline-none"
              >
                <option value="">Not linked</option>
                {academicYears.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Exam Date *</label>
            <input
              required
              type="date"
              value={form.exam_date}
              onChange={e => set("exam_date", e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-violet-400 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Start Time *</label>
              <input
                required
                type="time"
                value={form.start_time}
                onChange={e => set("start_time", e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-violet-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">End Time *</label>
              <input
                required
                type="time"
                value={form.end_time}
                onChange={e => set("end_time", e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-violet-400 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Hall Name</label>
            <input
              value={form.hall_name ?? ""}
              onChange={e => set("hall_name", e.target.value)}
              placeholder="e.g. Exam Hall A"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-violet-400 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Max Marks *</label>
              <input
                required
                type="number"
                min={1}
                value={form.max_marks}
                onChange={e => set("max_marks", +e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-violet-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Pass Marks *</label>
              <input
                required
                type="number"
                min={1}
                value={form.pass_marks}
                onChange={e => set("pass_marks", +e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-violet-400 outline-none"
              />
            </div>
          </div>
        </form>

        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="exam-form"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            {examToEdit ? "Save Changes" : "Add Exam"}
          </button>
        </div>
      </div>
    </div>
  );
}
