"use client";

import { useEffect, useState, useCallback, use } from "react";
import { createClient } from "@/utils/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getInternships, deleteInternship, createInternship, updateInternship, type Internship, type InternshipPayload } from "@/actions/internships";
import { Briefcase, Plus, Trash2, Pencil, Loader2, ChevronDown, ChevronUp, X } from "lucide-react";

type Department   = { id: string; name: string };
type AcademicYear = { id: string; label: string };
type Student      = { id: string; roll_number: string | null; profiles: { full_name: string | null } | null; department_id: string };

const TYPES = [
  { value: "internship",           label: "Internship" },
  { value: "industrial_training",  label: "Industrial Training" },
  { value: "project",              label: "Project" },
  { value: "research_internship",  label: "Research Internship" },
  { value: "foreign_internship",   label: "Foreign Internship" },
];

const SECTORS = ["IT", "Manufacturing", "Healthcare", "Finance", "Education", "Government", "Other"];

const TYPE_COLORS: Record<string, string> = {
  internship:          "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
  industrial_training: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300",
  project:             "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
  research_internship: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300",
  foreign_internship:  "bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300",
};

const emptyForm = (): Partial<InternshipPayload> => ({
  type: "internship",
  company_name: "",
  company_location: "",
  company_sector: "",
  mentor_name: "",
  mentor_email: "",
  start_date: "",
  end_date: "",
  role_title: "",
  description: "",
  technologies: "",
  certificate_issued: false,
  is_paid: false,
  stipend_amount: undefined,
  offer_received: false,
  feedback: "",
});

export default function InternshipsAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: institutionId } = use(params);

  const [departments,   setDepartments]   = useState<Department[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [students,      setStudents]      = useState<Student[]>([]);
  const [records,       setRecords]       = useState<Internship[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const [expanded,      setExpanded]      = useState<Set<string>>(new Set());

  // Filters
  const [filterDept,  setFilterDept]  = useState("");
  const [filterAY,    setFilterAY]    = useState("");
  const [filterType,  setFilterType]  = useState("");
  const [filterName,  setFilterName]  = useState("");

  // Panel
  const [showPanel,   setShowPanel]   = useState(false);
  const [editing,     setEditing]     = useState<Internship | null>(null);
  const [form,        setForm]        = useState<Partial<InternshipPayload>>(emptyForm());
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState("");

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("departments").select("id, name").eq("institution_id", institutionId).order("name"),
      supabase.from("academic_years").select("id, label").eq("institution_id", institutionId).order("label", { ascending: false }),
      supabase.from("students").select("id, roll_number, department_id, profiles(full_name)").eq("institution_id", institutionId).order("roll_number"),
    ]).then(([d, ay, st]) => {
      setDepartments((d.data ?? []) as Department[]);
      setAcademicYears((ay.data ?? []) as AcademicYear[]);
      setStudents((st.data ?? []) as unknown as Student[]);
    });
  }, [institutionId]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const res = await getInternships(institutionId, {
      departmentId:   filterDept || undefined,
      academicYearId: filterAY   || undefined,
      type:           filterType || undefined,
      companyName:    filterName || undefined,
    });
    setRecords(res.success ? res.data : []);
    setLoading(false);
  }, [institutionId, filterDept, filterAY, filterType, filterName]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm(), institution_id: institutionId });
    setFormError("");
    setShowPanel(true);
  }

  function openEdit(r: Internship) {
    setEditing(r);
    setForm({
      institution_id:   r.institution_id,
      student_id:       r.student_id,
      academic_year_id: r.academic_year_id ?? undefined,
      type:             r.type,
      company_name:     r.company_name,
      company_location: r.company_location ?? "",
      company_sector:   r.company_sector ?? "",
      mentor_name:      r.mentor_name ?? "",
      mentor_email:     r.mentor_email ?? "",
      start_date:       r.start_date,
      end_date:         r.end_date ?? "",
      role_title:       r.role_title ?? "",
      description:      r.description ?? "",
      technologies:     r.technologies ?? "",
      certificate_issued: r.certificate_issued,
      is_paid:          r.is_paid,
      stipend_amount:   r.stipend_amount ?? undefined,
      offer_received:   r.offer_received,
      feedback:         r.feedback ?? "",
    });
    setFormError("");
    setShowPanel(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this internship record?")) return;
    setDeleting(id);
    await deleteInternship(id, institutionId);
    setRecords(r => r.filter(x => x.id !== id));
    setDeleting(null);
  }

  async function handleSave() {
    if (!form.student_id)   { setFormError("Please select a student."); return; }
    if (!form.company_name) { setFormError("Company name is required."); return; }
    if (!form.start_date)   { setFormError("Start date is required."); return; }

    setSaving(true);
    setFormError("");
    const payload = { ...form, institution_id: institutionId } as InternshipPayload;

    let res;
    if (editing) {
      res = await updateInternship(editing.id, institutionId, payload);
    } else {
      res = await createInternship(payload);
    }

    if (!res.success) {
      setFormError(res.error);
      setSaving(false);
      return;
    }
    await loadRecords();
    setShowPanel(false);
    setSaving(false);
  }

  // Stats
  const totalStudents = new Set(records.map(r => r.student_id)).size;
  const certified = records.filter(r => r.certificate_issued).length;
  const withOffers = records.filter(r => r.offer_received).length;
  const paidCount  = records.filter(r => r.is_paid).length;

  const studentName = (r: Internship) => {
    const s = r.students;
    return s?.profiles?.full_name ?? s?.roll_number ?? "—";
  };

  const visibleStudents = filterDept
    ? students.filter(s => s.department_id === filterDept)
    : students;

  return (
    <DashboardLayout>
      <div className="px-6 py-8 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Briefcase size={20} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Internships & Training</h1>
              <p className="text-xs text-slate-500">NAAC 1.2 · NIRF 5.2 — student industrial exposure records</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} /> Add Record
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total Records",     value: records.length,   color: "text-blue-600"   },
            { label: "Students Involved", value: totalStudents,    color: "text-violet-600" },
            { label: "Certified",         value: certified,        color: "text-emerald-600"},
            { label: "Received Offers",   value: withOffers,       color: "text-orange-600" },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={filterAY} onChange={e => setFilterAY(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">All Academic Years</option>
            {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.label}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">All Types</option>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input
            value={filterName} onChange={e => setFilterName(e.target.value)}
            placeholder="Search company..."
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Summary line */}
        <div className="flex items-center gap-3 mb-4 text-xs text-slate-500">
          <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg font-medium text-slate-700 dark:text-slate-300">
            {records.length} records
          </span>
          {paidCount > 0 && (
            <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-lg font-medium">
              {paidCount} paid internships
            </span>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin text-blue-500" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            No internship records found. Add one to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {records.map(r => {
              const isOpen = expanded.has(r.id);
              const typeLabel = TYPES.find(t => t.value === r.type)?.label ?? r.type;
              return (
                <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => toggleExpand(r.id)}>
                    {/* Date badge */}
                    <div className="shrink-0 w-14 text-center">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400 leading-tight">
                        {new Date(r.start_date).getDate().toString().padStart(2, "0")}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase">
                        {new Date(r.start_date).toLocaleString("default", { month: "short" })}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(r.start_date).getFullYear()}
                      </p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {r.company_name}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[r.type] ?? "bg-slate-100 text-slate-600"}`}>
                          {typeLabel}
                        </span>
                        {r.certificate_issued && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                            Certified
                          </span>
                        )}
                        {r.offer_received && (
                          <span className="text-[10px] bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 px-2 py-0.5 rounded-full font-medium">
                            Offer
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{studentName(r)}</span>
                        {r.students?.departments && <span>· {r.students.departments.name}</span>}
                        {r.role_title && <span>· {r.role_title}</span>}
                        {r.company_location && <span>· {r.company_location}</span>}
                        {r.end_date && <span>· till {new Date(r.end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button" onClick={e => { e.stopPropagation(); openEdit(r); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button type="button" onClick={e => { e.stopPropagation(); handleDelete(r.id); }}
                        disabled={deleting === r.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        {deleting === r.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                      {isOpen ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-600 dark:text-slate-400 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {r.mentor_name && <p><span className="font-semibold text-slate-700 dark:text-slate-300">Mentor: </span>{r.mentor_name}{r.mentor_email ? ` · ${r.mentor_email}` : ""}</p>}
                      {r.technologies && <p><span className="font-semibold text-slate-700 dark:text-slate-300">Tech: </span>{r.technologies}</p>}
                      {r.is_paid && r.stipend_amount && (
                        <p><span className="font-semibold text-slate-700 dark:text-slate-300">Stipend: </span>₹{r.stipend_amount.toLocaleString("en-IN")}</p>
                      )}
                      {r.description && <p className="col-span-full"><span className="font-semibold text-slate-700 dark:text-slate-300">About: </span>{r.description}</p>}
                      {r.feedback && <p className="col-span-full"><span className="font-semibold text-slate-700 dark:text-slate-300">Feedback: </span>{r.feedback}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-from-right panel */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowPanel(false)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200" />
          <div
            className="relative h-full w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Briefcase size={18} className="text-blue-600" />
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  {editing ? "Edit Record" : "Add Internship Record"}
                </h2>
              </div>
              <button onClick={() => setShowPanel(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Student */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Student *</label>
                <select
                  value={form.student_id ?? ""}
                  onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Select student...</option>
                  {visibleStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.profiles?.full_name ?? "—"}{s.roll_number ? ` (${s.roll_number})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type + Academic Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Type *</label>
                  <select value={form.type ?? "internship"} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400">
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Academic Year</label>
                  <select value={form.academic_year_id ?? ""} onChange={e => setForm(f => ({ ...f, academic_year_id: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">Select year...</option>
                    {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Company */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Company Name *</label>
                  <input value={form.company_name ?? ""} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                    placeholder="e.g. Infosys Ltd."
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Location</label>
                  <input value={form.company_location ?? ""} onChange={e => setForm(f => ({ ...f, company_location: e.target.value }))}
                    placeholder="e.g. Bangalore"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Sector</label>
                  <select value={form.company_sector ?? ""} onChange={e => setForm(f => ({ ...f, company_sector: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">Select sector...</option>
                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Role / Title</label>
                  <input value={form.role_title ?? ""} onChange={e => setForm(f => ({ ...f, role_title: e.target.value }))}
                    placeholder="e.g. Software Intern"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Start Date *</label>
                  <input type="date" value={form.start_date ?? ""} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">End Date</label>
                  <input type="date" value={form.end_date ?? ""} onChange={e => setForm(f => ({ ...f, end_date: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>

              {/* Mentor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Mentor Name</label>
                  <input value={form.mentor_name ?? ""} onChange={e => setForm(f => ({ ...f, mentor_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Mentor Email</label>
                  <input type="email" value={form.mentor_email ?? ""} onChange={e => setForm(f => ({ ...f, mentor_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>

              {/* Technologies */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Technologies / Domain</label>
                <input value={form.technologies ?? ""} onChange={e => setForm(f => ({ ...f, technologies: e.target.value }))}
                  placeholder="e.g. React, Node.js, Machine Learning"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Description / Work Summary</label>
                <textarea rows={3} value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.certificate_issued ?? false}
                    onChange={e => setForm(f => ({ ...f, certificate_issued: e.target.checked }))}
                    className="w-4 h-4 rounded accent-blue-600" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Certificate Issued</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_paid ?? false}
                    onChange={e => setForm(f => ({ ...f, is_paid: e.target.checked }))}
                    className="w-4 h-4 rounded accent-blue-600" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Paid Internship</span>
                </label>

                {form.is_paid && (
                  <div className="pl-6">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Stipend Amount (₹)</label>
                    <input type="number" value={form.stipend_amount ?? ""} onChange={e => setForm(f => ({ ...f, stipend_amount: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="e.g. 10000"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.offer_received ?? false}
                    onChange={e => setForm(f => ({ ...f, offer_received: e.target.checked }))}
                    className="w-4 h-4 rounded accent-blue-600" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Offer / PPO Received</span>
                </label>
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Feedback / Remarks</label>
                <textarea rows={2} value={form.feedback ?? ""} onChange={e => setForm(f => ({ ...f, feedback: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </div>
            </div>

            {formError && (
              <p className="px-6 pb-2 text-xs text-red-600 shrink-0">{formError}</p>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button onClick={() => setShowPanel(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
                {saving && <Loader2 size={12} className="animate-spin" />}
                {editing ? "Save Changes" : "Add Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
