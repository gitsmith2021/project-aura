"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  getMyLessonPlans,
  createLessonPlan,
  updateLessonPlan,
  deleteLessonPlan,
  type LessonPlan,
  type CreateLessonPlanPayload,
} from "@/actions/lesson-plans";
import { BookText, Plus, Pencil, Trash2, Loader2, X, ChevronDown, ChevronUp } from "lucide-react";

type Subject      = { id: string; name: string; code: string | null; semester: number };
type AcademicYear = { id: string; label: string };
type CurrUnit     = { id: string; unit_number: number; title: string };

const METHODS = [
  "Lecture", "Demonstration", "Group Discussion", "Case Study",
  "Problem Solving", "Lab / Practical", "Seminar", "Project Work", "Other",
];

const EMPTY_FORM = {
  subjectId:     "",
  unitId:        "",
  ayId:          "",
  lessonDate:    new Date().toISOString().split("T")[0],
  topicCovered:  "",
  teachingMethod: "",
  hoursCovered:  "1",
  remarks:       "",
};

export default function StaffLessonPlansPage() {
  const [institutionId, setInstitutionId] = useState("");
  const [staffId,       setStaffId]       = useState("");
  const [subjects,      setSubjects]      = useState<Subject[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [currUnits,     setCurrUnits]     = useState<CurrUnit[]>([]);
  const [plans,         setPlans]         = useState<LessonPlan[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [deleting,      setDeleting]      = useState<string | null>(null);

  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [form,      setForm]      = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState("");
  const [expanded,  setExpanded]  = useState<Set<string>>(new Set());

  // Filter
  const [filterSubject, setFilterSubject] = useState("");
  const [filterAY,      setFilterAY]      = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const [{ data: staff }, { data: ay }] = await Promise.all([
        supabase.from("staff").select("id, institution_id, department_id").eq("profile_id", user.id).single(),
        supabase.from("academic_years").select("id, label").order("label", { ascending: false }),
      ]);
      if (!staff) { setLoading(false); return; }
      setStaffId(staff.id);
      setInstitutionId(staff.institution_id);
      setAcademicYears((ay ?? []) as AcademicYear[]);
      if (ay?.[0]) setFilterAY(ay[0].id);

      const { data: subs } = await supabase
        .from("subjects")
        .select("id, name, code, semester")
        .eq("institution_id", staff.institution_id)
        .eq("department_id", staff.department_id)
        .order("semester").order("name");
      setSubjects((subs ?? []) as Subject[]);
      setLoading(false);
    });
  }, []);

  const loadPlans = useCallback(async () => {
    if (!institutionId || !staffId) return;
    setLoading(true);
    const res = await getMyLessonPlans(institutionId, staffId, {
      subjectId:     filterSubject || undefined,
      academicYearId: filterAY    || undefined,
    });
    setPlans(res.success ? res.data : []);
    setLoading(false);
  }, [institutionId, staffId, filterSubject, filterAY]);

  useEffect(() => { if (institutionId) loadPlans(); }, [loadPlans, institutionId]);

  // Load curriculum units when subject changes in form
  useEffect(() => {
    if (!form.subjectId || !institutionId) { setCurrUnits([]); return; }
    const supabase = createClient();
    supabase
      .from("curriculum_units")
      .select("id, unit_number, title")
      .eq("subject_id", form.subjectId)
      .eq("institution_id", institutionId)
      .order("unit_number")
      .then(({ data }) => setCurrUnits((data ?? []) as CurrUnit[]));
  }, [form.subjectId, institutionId]);

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM, ayId: academicYears[0]?.id ?? "" });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(plan: LessonPlan) {
    setEditId(plan.id);
    setForm({
      subjectId:      plan.subject_id,
      unitId:         plan.curriculum_unit_id ?? "",
      ayId:           plan.academic_year_id ?? "",
      lessonDate:     plan.lesson_date,
      topicCovered:   plan.topic_covered,
      teachingMethod: plan.teaching_method ?? "",
      hoursCovered:   String(plan.hours_covered),
      remarks:        plan.remarks ?? "",
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.subjectId)    { setFormError("Subject is required."); return; }
    if (!form.lessonDate)   { setFormError("Date is required."); return; }
    if (!form.topicCovered.trim()) { setFormError("Topic covered is required."); return; }
    const hours = parseFloat(form.hoursCovered);
    if (isNaN(hours) || hours <= 0) { setFormError("Hours must be a positive number."); return; }

    setSaving(true);
    setFormError("");

    const payload: CreateLessonPlanPayload = {
      institution_id:     institutionId,
      staff_id:           staffId,
      subject_id:         form.subjectId,
      curriculum_unit_id: form.unitId  || null,
      academic_year_id:   form.ayId    || null,
      lesson_date:        form.lessonDate,
      topic_covered:      form.topicCovered.trim(),
      teaching_method:    form.teachingMethod || null,
      hours_covered:      hours,
      remarks:            form.remarks.trim() || null,
    };

    let res;
    if (editId) {
      const { institution_id: _inst, staff_id: _s, ...updatePayload } = payload;
      res = await updateLessonPlan(editId, institutionId, updatePayload);
    } else {
      res = await createLessonPlan(payload);
    }

    if (!res.success) { setFormError(res.error); setSaving(false); return; }
    setShowForm(false);
    await loadPlans();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this lesson plan entry?")) return;
    setDeleting(id);
    await deleteLessonPlan(id, institutionId);
    setPlans(p => p.filter(x => x.id !== id));
    setDeleting(null);
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const totalHours = plans.reduce((s, p) => s + Number(p.hours_covered), 0);

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
            <BookText size={18} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">My Lesson Diary</h1>
            <p className="text-xs text-slate-500">Daily teaching log</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors"
        >
          <Plus size={14} /> Add Entry
        </button>
      </div>

      {/* Filters + stats */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
          className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>)}
        </select>
        <select value={filterAY} onChange={e => setFilterAY(e.target.value)}
          className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
          <option value="">All Years</option>
          {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.label}</option>)}
        </select>
        <div className="flex gap-2 text-xs ml-auto">
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg font-medium">
            {plans.length} entries
          </span>
          <span className="bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 px-3 py-1.5 rounded-lg font-medium">
            {totalHours.toFixed(1)} hrs
          </span>
        </div>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 rounded-xl p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {editId ? "Edit Entry" : "New Lesson Entry"}
            </h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Subject *</label>
              <select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value, unitId: "" }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
                <option value="">Select Subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""} — Sem {s.semester}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Curriculum Unit (optional)</label>
              <select value={form.unitId} onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))}
                disabled={currUnits.length === 0}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50">
                <option value="">No unit selected</option>
                {currUnits.map(u => <option key={u.id} value={u.id}>Unit {u.unit_number}: {u.title}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date *</label>
              <input type="date" value={form.lessonDate} onChange={e => setForm(f => ({ ...f, lessonDate: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Academic Year</label>
              <select value={form.ayId} onChange={e => setForm(f => ({ ...f, ayId: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
                <option value="">Not specified</option>
                {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.label}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Topic Covered *</label>
              <input type="text" value={form.topicCovered} onChange={e => setForm(f => ({ ...f, topicCovered: e.target.value }))}
                placeholder="e.g., Introduction to Stacks and Queues"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Teaching Method</label>
              <select value={form.teachingMethod} onChange={e => setForm(f => ({ ...f, teachingMethod: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
                <option value="">Not specified</option>
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Hours Covered *</label>
              <input type="number" step="0.5" min="0.5" max="8" value={form.hoursCovered}
                onChange={e => setForm(f => ({ ...f, hoursCovered: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Remarks (optional)</label>
              <textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                rows={2} placeholder="Additional notes about the class..."
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
            </div>
          </div>

          {formError && <p className="mt-3 text-xs text-red-600">{formError}</p>}

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors disabled:opacity-60">
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              {editId ? "Update" : "Save Entry"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-violet-500" /></div>
      ) : plans.length === 0 ? (
        <div className="text-center py-14 text-slate-400 text-sm">
          <BookText size={32} className="mx-auto mb-3 opacity-30" />
          No entries yet. Add your first lesson diary entry.
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map(plan => {
            const isOpen = expanded.has(plan.id);
            const subj = plan.subject as { name: string; code: string | null; semester: number } | undefined;
            const unit = plan.curriculum_unit as { unit_number: number; title: string } | null | undefined;
            const ay   = plan.academic_year as { label: string } | null | undefined;
            return (
              <div key={plan.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => toggleExpand(plan.id)}>
                  {/* Date badge */}
                  <div className="shrink-0 w-12 text-center">
                    <p className="text-lg font-bold text-violet-600 dark:text-violet-400 leading-tight">
                      {new Date(plan.lesson_date).getDate().toString().padStart(2, "0")}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase">
                      {new Date(plan.lesson_date).toLocaleString("default", { month: "short" })}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {plan.topic_covered}
                      </span>
                      <span className="text-[10px] bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full font-medium">
                        {plan.hours_covered}h
                      </span>
                      {plan.teaching_method && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                          {plan.teaching_method}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                      {subj && <span>{subj.name}{subj.code ? ` (${subj.code})` : ""} · Sem {subj.semester}</span>}
                      {unit  && <span>· Unit {unit.unit_number}: {unit.title}</span>}
                      {ay    && <span>· {ay.label}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button"
                      onClick={e => { e.stopPropagation(); openEdit(plan); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button type="button"
                      onClick={e => { e.stopPropagation(); handleDelete(plan.id); }}
                      disabled={deleting === plan.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      {deleting === plan.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                    {isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                  </div>
                </div>

                {isOpen && plan.remarks && (
                  <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Remarks: </span>{plan.remarks}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
