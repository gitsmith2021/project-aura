"use client";

import { use, useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/client";
import {
  getCIAComponents, createCIAComponent, deleteCIAComponent,
  getCIAStudentSummary, type CIAComponent,
} from "@/actions/cia";
import { CIAReportCard } from "@/components/cia/CIAReportCard";
import { CIAResultsPanel } from "@/components/cia/CIAResultsPanel";
import Link from "next/link";
import {
  Plus, Trash2, ClipboardList, BookOpen, Users,
  ChevronRight, Loader2, X, AlertCircle, BarChart2, Award, Target,
} from "lucide-react";

type Department   = { id: string; name: string };
type AcademicYear = { id: string; label: string };
type Subject      = { id: string; name: string; code: string | null };

const COMPONENT_TYPES = [
  { value: "unit_test",        label: "Unit Test" },
  { value: "assignment",       label: "Assignment" },
  { value: "lab_record",       label: "Lab Record" },
  { value: "seminar",          label: "Seminar" },
  { value: "attendance_marks", label: "Attendance Marks" },
  { value: "viva",             label: "Viva" },
  { value: "other",            label: "Other" },
] as const;

const TYPE_COLORS: Record<string, string> = {
  unit_test:        "bg-violet-100 text-violet-700",
  assignment:       "bg-blue-100 text-blue-700",
  lab_record:       "bg-emerald-100 text-emerald-700",
  seminar:          "bg-amber-100 text-amber-700",
  attendance_marks: "bg-slate-100 text-slate-600",
  viva:             "bg-rose-100 text-rose-700",
  other:            "bg-gray-100 text-gray-600",
};

export default function CIAPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: institutionId } = use(params);

  const [departments,   setDepartments]   = useState<Department[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [subjects,      setSubjects]      = useState<Subject[]>([]);
  const [components,    setComponents]    = useState<CIAComponent[]>([]);

  const [deptId,   setDeptId]   = useState("");
  const [ayId,     setAyId]     = useState("");
  const [semester, setSemester] = useState("");
  const [tab,      setTab]      = useState<"components" | "report" | "results">("components");

  const [loading,  setLoading]  = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Report state
  const [reportData,      setReportData]      = useState<Awaited<ReturnType<typeof getCIAStudentSummary>> | null>(null);
  const [loadingReport,   setLoadingReport]   = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "", component_type: "unit_test" as CIAComponent["component_type"],
    max_marks: "25", subject_id: "", weightage: "100",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("departments").select("id,name").eq("institution_id", institutionId).order("name"),
      supabase.from("academic_years").select("id,label").eq("institution_id", institutionId).order("label", { ascending: false }),
    ]).then(([{ data: d }, { data: ay }]) => {
      setDepartments(d ?? []);
      setAcademicYears(ay ?? []);
      if (ay?.[0]) setAyId(ay[0].id);
    });
  }, [institutionId]);

  useEffect(() => {
    if (!deptId || !semester) return;
    const supabase = createClient();
    supabase.from("subjects").select("id,name,code")
      .eq("institution_id", institutionId)
      .eq("department_id", deptId)
      .eq("semester", Number(semester))
      .order("name")
      .then(({ data }) => setSubjects(data ?? []));
  }, [institutionId, deptId, semester]);

  const loadComponents = useCallback(async () => {
    if (!deptId || !semester) return;
    setLoading(true);
    const res = await getCIAComponents(institutionId, {
      departmentId:    deptId,
      semester:        Number(semester),
      academicYearId:  ayId || undefined,
    });
    setComponents(res.success ? res.data : []);
    setLoading(false);
  }, [institutionId, deptId, semester, ayId]);

  useEffect(() => { loadComponents(); }, [loadComponents]);

  const loadReport = useCallback(async () => {
    if (!deptId || !semester) return;
    setLoadingReport(true);
    const res = await getCIAStudentSummary(institutionId, {
      departmentId:   deptId,
      semester:       Number(semester),
      academicYearId: ayId || undefined,
    });
    setReportData(res);
    setLoadingReport(false);
  }, [institutionId, deptId, semester, ayId]);

  useEffect(() => { if (tab === "report") loadReport(); }, [tab, loadReport]);

  const handleCreate = async () => {
    if (!form.name.trim() || !deptId || !semester) return;
    setSaving(true);
    setFormError(null);
    const res = await createCIAComponent({
      institution_id:   institutionId,
      department_id:    deptId,
      subject_id:       form.subject_id || null,
      academic_year_id: ayId || null,
      name:             form.name.trim(),
      component_type:   form.component_type,
      max_marks:        parseFloat(form.max_marks) || 25,
      semester:         Number(semester),
      weightage:        parseFloat(form.weightage) || 100,
    });
    setSaving(false);
    if (!res.success) { setFormError(res.error); return; }
    setShowForm(false);
    setForm({ name: "", component_type: "unit_test", max_marks: "25", subject_id: "", weightage: "100" });
    await loadComponents();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this component and all its marks?")) return;
    setDeleting(id);
    await deleteCIAComponent(id, institutionId);
    setDeleting(null);
    await loadComponents();
  };

  const filtersSet = deptId && semester;

  return (
    <DashboardLayout>
      <div className="px-6 pt-6 pb-6 w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <ClipboardList size={18} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">CIA / Internal Assessment</h1>
              <p className="text-xs text-slate-500">Manage assessment components and enter marks</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/institutions/${institutionId}/cia/outcomes`}
              className="flex items-center gap-2 px-4 py-2 border border-violet-200 text-violet-600 hover:bg-violet-50 text-xs font-semibold rounded-xl transition-colors"
            >
              <Target size={14} /> Outcomes (CO/PO)
            </Link>
            {filtersSet && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
              >
                <Plus size={14} /> Add Component
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 flex flex-wrap gap-3">
          <select value={deptId} onChange={e => setDeptId(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-700 bg-white">
            <option value="">Department...</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={semester} onChange={e => setSemester(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-700 bg-white">
            <option value="">Semester...</option>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
          <select value={ayId} onChange={e => setAyId(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-700 bg-white">
            <option value="">All Years</option>
            {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.label}</option>)}
          </select>
        </div>

        {!filtersSet ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
            <ClipboardList size={36} className="opacity-25" />
            <p className="text-sm font-medium">Select a department and semester to begin</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-slate-100 rounded-xl p-1 w-fit">
              {(["components", "report", "results"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    tab === t ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}>
                  {t === "components" ? <span className="flex items-center gap-1.5"><BookOpen size={12} />Components</span>
                   : t === "report"   ? <span className="flex items-center gap-1.5"><BarChart2 size={12} />Report</span>
                                      : <span className="flex items-center gap-1.5"><Award size={12} />Results</span>}
                </button>
              ))}
            </div>

            {tab === "components" && (
              <div className="space-y-2">
                {loading ? (
                  <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-violet-500" /></div>
                ) : components.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 border-dashed rounded-xl text-slate-400 gap-2">
                    <ClipboardList size={28} className="opacity-30" />
                    <p className="text-sm">No components yet. Add one to start entering marks.</p>
                    <button onClick={() => setShowForm(true)} className="mt-1 text-xs text-violet-600 hover:underline font-medium">+ Add Component</button>
                  </div>
                ) : components.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-violet-200 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide shrink-0 ${TYPE_COLORS[c.component_type]}`}>
                        {COMPONENT_TYPES.find(t => t.value === c.component_type)?.label ?? c.component_type}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{c.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Max {c.max_marks} marks
                          {c.subjects && <span> · {c.subjects.name}{c.subjects.code ? ` (${c.subjects.code})` : ""}</span>}
                          {c.academic_years && <span> · {c.academic_years.label}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/institutions/${institutionId}/cia/${c.id}/marks?dept=${deptId}&sem=${semester}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-600 border border-violet-200 hover:bg-violet-50 rounded-lg transition-colors"
                      >
                        <Users size={12} /> Enter Marks <ChevronRight size={11} />
                      </Link>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deleting === c.id}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {deleting === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "report" && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {loadingReport ? (
                  <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-violet-500" /></div>
                ) : reportData?.success ? (
                  <CIAReportCard
                    summaries={reportData.data}
                    componentNames={components.map(c => c.name)}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-rose-500 text-sm p-6">
                    <AlertCircle size={16} /> {reportData?.error ?? "Failed to load report"}
                  </div>
                )}
              </div>
            )}

            {tab === "results" && (
              <CIAResultsPanel
                institutionId={institutionId}
                departmentId={deptId}
                semester={Number(semester)}
                academicYearId={ayId || undefined}
              />
            )}
          </>
        )}

        {/* Add Component Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900">New CIA Component</h2>
                <button onClick={() => { setShowForm(false); setFormError(null); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Component Name *</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Unit Test 1, Assignment 2"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Type *</label>
                  <select value={form.component_type} onChange={e => setForm(p => ({ ...p, component_type: e.target.value as CIAComponent["component_type"] }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                    {COMPONENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Max Marks *</label>
                    <input type="number" min={1} value={form.max_marks} onChange={e => setForm(p => ({ ...p, max_marks: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Weightage %</label>
                    <input type="number" min={0} max={100} value={form.weightage} onChange={e => setForm(p => ({ ...p, weightage: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                </div>
                {subjects.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Subject (optional)</label>
                    <select value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                      <option value="">All subjects</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {formError && (
                <div className="mt-3 flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  <AlertCircle size={13} /> {formError}
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <button onClick={() => { setShowForm(false); setFormError(null); }}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={saving || !form.name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg transition-colors">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
