"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/client";
import {
  getCurriculumUnits, getSyllabusCompletion, addCurriculumUnit,
  updateCurriculumUnit, deleteCurriculumUnit,
  type CurriculumUnit, type SyllabusCompletion, type ReferenceBook,
} from "@/actions/curriculum";
import { SyllabusCard } from "@/components/curriculum/SyllabusCard";
import { CompletionProgressBar } from "@/components/curriculum/CompletionProgressBar";
import Link from "next/link";
import {
  ChevronLeft, BookOpen, Plus, Loader2, AlertCircle,
  X, GraduationCap,
} from "lucide-react";

type Subject = { id: string; name: string; code: string | null; semester: number; departments?: { name: string } | null };
type AcademicYear = { id: string; label: string };

const BLANK_FORM = {
  unit_number: "1", title: "",
  description: "", hours_allocated: "5",
  topicsRaw: "", booksRaw: "",
};

export default function CurriculumSubjectPage({ params }: { params: Promise<{ id: string; subjectId: string }> }) {
  const { id: institutionId, subjectId } = use(params);
  const searchParams = useSearchParams();
  const ayParam = searchParams.get("ay") ?? "";

  const [subject,       setSubject]       = useState<Subject | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [ayId,          setAyId]          = useState(ayParam);
  const [units,         setUnits]         = useState<CurriculumUnit[]>([]);
  const [completions,   setCompletions]   = useState<SyllabusCompletion[]>([]);
  const [loading,       setLoading]       = useState(true);

  const [showForm,   setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState<CurriculumUnit | null>(null);
  const [form,       setForm]       = useState(BLANK_FORM);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("subjects").select("id,name,code,semester,departments(name)").eq("id", subjectId).single(),
      supabase.from("academic_years").select("id,label").eq("institution_id", institutionId).order("label", { ascending: false }),
    ]).then(([{ data: s }, { data: ay }]) => {
      setSubject(s as Subject | null);
      setAcademicYears(ay ?? []);
      if (!ayId && ay?.[0]) setAyId(ay[0].id);
    });
  }, [institutionId, subjectId, ayId]);

  const loadUnits = useCallback(async () => {
    setLoading(true);
    const [ur, cr] = await Promise.all([
      getCurriculumUnits(institutionId, subjectId),
      getSyllabusCompletion(institutionId, subjectId, ayId || undefined),
    ]);
    setUnits(ur.success ? ur.data : []);
    setCompletions(cr.success ? cr.data : []);
    setLoading(false);
  }, [institutionId, subjectId, ayId]);

  useEffect(() => { loadUnits(); }, [loadUnits]);

  // Completion map: unitId → SyllabusCompletion
  const completionMap = new Map(completions.map(c => [c.curriculum_unit_id, c]));

  const completedCount = units.filter(u => completionMap.get(u.id)?.is_completed).length;
  const totalHours     = units.reduce((s, u) => s + u.hours_allocated, 0);
  const completedHours = units.filter(u => completionMap.get(u.id)?.is_completed)
                              .reduce((s, u) => s + u.hours_allocated, 0);

  const openForm = (unit?: CurriculumUnit) => {
    if (unit) {
      setEditTarget(unit);
      setForm({
        unit_number:    String(unit.unit_number),
        title:          unit.title,
        description:    unit.description ?? "",
        hours_allocated: String(unit.hours_allocated),
        topicsRaw:      (unit.topics ?? []).join("\n"),
        booksRaw:       (unit.reference_books ?? []).map(b =>
          [b.title, b.author, b.isbn].filter(Boolean).join(" | ")
        ).join("\n"),
      });
    } else {
      setEditTarget(null);
      const nextNum = units.length > 0 ? Math.max(...units.map(u => u.unit_number)) + 1 : 1;
      setForm({ ...BLANK_FORM, unit_number: String(nextNum) });
    }
    setFormError(null);
    setShowForm(true);
  };

  const parseBooks = (raw: string): ReferenceBook[] =>
    raw.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
      const [title, author, isbn] = line.split("|").map(s => s.trim());
      return { title: title ?? line, author, isbn };
    });

  const handleSave = async () => {
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    setSaving(true);
    setFormError(null);

    const payload = {
      institution_id:  institutionId,
      subject_id:      subjectId,
      unit_number:     parseInt(form.unit_number) || 1,
      title:           form.title.trim(),
      description:     form.description.trim() || undefined,
      hours_allocated: parseInt(form.hours_allocated) || 5,
      topics:          form.topicsRaw.trim() ? form.topicsRaw.split("\n").map(t => t.trim()).filter(Boolean) : undefined,
      reference_books: form.booksRaw.trim() ? parseBooks(form.booksRaw) : undefined,
    };

    let res;
    if (editTarget) {
      res = await updateCurriculumUnit(editTarget.id, institutionId, payload);
    } else {
      res = await addCurriculumUnit(payload);
    }

    setSaving(false);
    if (!res.success) { setFormError(res.error); return; }
    setShowForm(false);
    await loadUnits();
  };

  const handleDelete = async (unitId: string) => {
    await deleteCurriculumUnit(unitId, institutionId);
    await loadUnits();
  };

  return (
    <DashboardLayout>
      <div className="px-6 pt-6 pb-6 w-full max-w-3xl">

        <Link href={`/institutions/${institutionId}/curriculum`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium mb-5 transition-colors">
          <ChevronLeft size={13} /> Back to Curriculum Overview
        </Link>

        {/* Subject header */}
        {subject && (
          <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <BookOpen size={18} className="text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900">{subject.name}</h1>
                  {subject.code && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-md font-mono">{subject.code}</span>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Semester {subject.semester}
                  {(subject.departments as unknown as { name: string } | null)?.name && (
                    <> · {(subject.departments as unknown as { name: string }).name}</>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => openForm()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
            >
              <Plus size={14} /> Add Unit
            </button>
          </div>
        )}

        {/* Academic year + progress */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <select value={ayId} onChange={e => setAyId(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700 bg-white">
              <option value="">All Years</option>
              {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.label}</option>)}
            </select>
            <span className="text-xs text-slate-500">{units.length} units · {totalHours} hrs total</span>
          </div>
          <CompletionProgressBar
            completed={completedCount}
            total={units.length}
            completedHours={completedHours}
            totalHours={totalHours}
          />
        </div>

        {/* Units list */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-indigo-500" /></div>
        ) : units.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 border-dashed rounded-xl text-slate-400 gap-2">
            <GraduationCap size={28} className="opacity-30" />
            <p className="text-sm">No units yet. Add the first unit to build the syllabus.</p>
            <button onClick={() => openForm()} className="mt-1 text-xs text-indigo-600 hover:underline font-medium">+ Add Unit</button>
          </div>
        ) : (
          <div className="space-y-2">
            {units.map(u => (
              <SyllabusCard
                key={u.id}
                unit={u}
                completion={completionMap.get(u.id) ?? null}
                canEdit={true}
                canComplete={false}
                onEdit={openForm}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Add/Edit Unit Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900">{editTarget ? "Edit Unit" : "New Curriculum Unit"}</h2>
                <button onClick={() => setShowForm(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Unit No. *</label>
                    <input type="number" min={1} value={form.unit_number} onChange={e => setForm(p => ({ ...p, unit_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Hours Allocated</label>
                    <input type="number" min={1} value={form.hours_allocated} onChange={e => setForm(p => ({ ...p, hours_allocated: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Title *</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Introduction to Data Structures"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    rows={2} placeholder="Brief overview of the unit..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Topics <span className="font-normal text-slate-400">(one per line)</span></label>
                  <textarea value={form.topicsRaw} onChange={e => setForm(p => ({ ...p, topicsRaw: e.target.value }))}
                    rows={4} placeholder={"Arrays and Linked Lists\nStacks and Queues\nTrees and Graphs"}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Reference Books <span className="font-normal text-slate-400">(one per line, format: Title | Author | ISBN)</span>
                  </label>
                  <textarea value={form.booksRaw} onChange={e => setForm(p => ({ ...p, booksRaw: e.target.value }))}
                    rows={3} placeholder={"Introduction to Algorithms | Cormen | 978-0262033848\nData Structures | Tanenbaum"}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
                </div>
              </div>

              {formError && (
                <div className="mt-3 flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  <AlertCircle size={13} /> {formError}
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving || !form.title.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  {editTarget ? "Save Changes" : "Add Unit"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
