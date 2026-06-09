"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  createInternship,
  updateInternship,
  deleteInternship,
  type Internship,
  type InternshipPayload,
} from "@/actions/internships";
import {
  Briefcase, Plus, Pencil, Trash2, Loader2,
  ChevronDown, ChevronUp, X, CheckCircle2,
} from "lucide-react";

const TYPES = [
  { value: "internship",           label: "Internship" },
  { value: "industrial_training",  label: "Industrial Training" },
  { value: "project",              label: "Project" },
  { value: "research_internship",  label: "Research Internship" },
  { value: "foreign_internship",   label: "Foreign Internship" },
];

const SECTORS = ["IT", "Manufacturing", "Healthcare", "Finance", "Education", "Government", "Other"];

const TYPE_COLORS: Record<string, string> = {
  internship:          "bg-blue-50 text-blue-700",
  industrial_training: "bg-orange-50 text-orange-700",
  project:             "bg-emerald-50 text-emerald-700",
  research_internship: "bg-purple-50 text-purple-700",
  foreign_internship:  "bg-pink-50 text-pink-700",
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

type AcademicYear = { id: string; label: string };

export default function StudentInternshipsPage() {
  const [institutionId, setInstitutionId] = useState("");
  const [studentId,     setStudentId]     = useState("");
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [records,       setRecords]       = useState<Internship[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [expanded,      setExpanded]      = useState<Set<string>>(new Set());
  const [deleting,      setDeleting]      = useState<string | null>(null);

  const [showPanel, setShowPanel] = useState(false);
  const [editing,   setEditing]   = useState<Internship | null>(null);
  const [form,      setForm]      = useState<Partial<InternshipPayload>>(emptyForm());
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }

      const { data: student } = await supabase
        .from("students")
        .select("id, institution_id")
        .eq("profile_id", user.id)
        .single();

      if (!student) { setLoading(false); return; }
      setInstitutionId(student.institution_id);
      setStudentId(student.id);

      const [{ data: recs }, { data: ays }] = await Promise.all([
        supabase
          .from("internships")
          .select("*")
          .eq("student_id", student.id)
          .order("start_date", { ascending: false }),
        supabase
          .from("academic_years")
          .select("id, label")
          .eq("institution_id", student.institution_id)
          .order("label", { ascending: false }),
      ]);

      setRecords((recs ?? []) as Internship[]);
      setAcademicYears(ays ?? []);
      setLoading(false);
    });
  }, []);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm(), institution_id: institutionId, student_id: studentId });
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
    if (!confirm("Delete this record?")) return;
    setDeleting(id);
    await deleteInternship(id, institutionId);
    setRecords(r => r.filter(x => x.id !== id));
    setDeleting(null);
  }

  async function handleSave() {
    if (!form.company_name) { setFormError("Company name is required."); return; }
    if (!form.start_date)   { setFormError("Start date is required."); return; }

    setSaving(true);
    setFormError("");
    const payload = { ...form, institution_id: institutionId, student_id: studentId } as InternshipPayload;

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

    // Refresh list client-side
    const supabase = createClient();
    const { data } = await supabase
      .from("internships")
      .select("*")
      .eq("student_id", studentId)
      .order("start_date", { ascending: false });
    setRecords((data ?? []) as Internship[]);
    setShowPanel(false);
    setSaving(false);
  }

  const totalWeeks = records.reduce((s, r) => {
    if (!r.start_date || !r.end_date) return s;
    const diff = new Date(r.end_date).getTime() - new Date(r.start_date).getTime();
    return s + Math.round(diff / (7 * 24 * 3600 * 1000));
  }, 0);

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
            <Briefcase size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">My Internships</h1>
            <p className="text-xs text-slate-500">Log your industrial training &amp; project experiences</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          disabled={!studentId}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Quick stats */}
      {records.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{records.length}</p>
            <p className="text-[10px] text-slate-500">Records</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-emerald-600">{records.filter(r => r.certificate_issued).length}</p>
            <p className="text-[10px] text-slate-500">Certified</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-violet-600">{totalWeeks}</p>
            <p className="text-[10px] text-slate-500">Total Weeks</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin text-blue-500" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
          <Briefcase size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-600">No internships logged yet</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Add your industrial training or project experiences</p>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg mx-auto transition-colors">
            <Plus size={14} /> Add First Record
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map(r => {
            const isOpen = expanded.has(r.id);
            const typeLabel = TYPES.find(t => t.value === r.type)?.label ?? r.type;
            return (
              <div key={r.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => toggleExpand(r.id)}>
                  <div className="shrink-0 w-12 text-center">
                    <p className="text-lg font-bold text-blue-600 leading-tight">
                      {new Date(r.start_date).getDate().toString().padStart(2, "0")}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase">
                      {new Date(r.start_date).toLocaleString("default", { month: "short" })}
                    </p>
                    <p className="text-[10px] text-slate-400">{new Date(r.start_date).getFullYear()}</p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-800">{r.company_name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[r.type] ?? "bg-slate-100 text-slate-600"}`}>
                        {typeLabel}
                      </span>
                      {r.certificate_issued && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <CheckCircle2 size={9} /> Certified
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                      {r.role_title && <span>{r.role_title}</span>}
                      {r.company_location && <span>· {r.company_location}</span>}
                      {r.end_date && (
                        <span>· till {new Date(r.end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={e => { e.stopPropagation(); openEdit(r); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button type="button" onClick={e => { e.stopPropagation(); handleDelete(r.id); }}
                      disabled={deleting === r.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      {deleting === r.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                    {isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50 text-xs text-slate-600 space-y-1">
                    {r.mentor_name && <p><span className="font-semibold text-slate-700">Mentor: </span>{r.mentor_name}{r.mentor_email ? ` (${r.mentor_email})` : ""}</p>}
                    {r.technologies && <p><span className="font-semibold text-slate-700">Tech: </span>{r.technologies}</p>}
                    {r.is_paid && r.stipend_amount && <p><span className="font-semibold text-slate-700">Stipend: </span>₹{r.stipend_amount.toLocaleString("en-IN")}/month</p>}
                    {r.description && <p><span className="font-semibold text-slate-700">About: </span>{r.description}</p>}
                    {r.offer_received && <p className="text-orange-700 font-medium">🎉 Pre-placement offer received</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-from-right panel */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowPanel(false)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200" />
          <div
            className="relative h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-800">
                  {editing ? "Edit Record" : "Log Internship"}
                </h2>
              </div>
              <button onClick={() => setShowPanel(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Type + AY */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type *</label>
                  <select value={form.type ?? "internship"} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Academic Year</label>
                  <select value={form.academic_year_id ?? ""} onChange={e => setForm(f => ({ ...f, academic_year_id: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">Select year...</option>
                    {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Company */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Company Name *</label>
                  <input value={form.company_name ?? ""} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                    placeholder="e.g. Infosys Ltd."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Location</label>
                  <input value={form.company_location ?? ""} onChange={e => setForm(f => ({ ...f, company_location: e.target.value }))}
                    placeholder="e.g. Bangalore"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Sector</label>
                  <select value={form.company_sector ?? ""} onChange={e => setForm(f => ({ ...f, company_sector: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">Select...</option>
                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role / Title</label>
                  <input value={form.role_title ?? ""} onChange={e => setForm(f => ({ ...f, role_title: e.target.value }))}
                    placeholder="e.g. Software Intern"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Start Date *</label>
                  <input type="date" value={form.start_date ?? ""} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">End Date</label>
                  <input type="date" value={form.end_date ?? ""} onChange={e => setForm(f => ({ ...f, end_date: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>

              {/* Mentor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mentor Name</label>
                  <input value={form.mentor_name ?? ""} onChange={e => setForm(f => ({ ...f, mentor_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mentor Email</label>
                  <input type="email" value={form.mentor_email ?? ""} onChange={e => setForm(f => ({ ...f, mentor_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>

              {/* Technologies */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Technologies / Domain</label>
                <input value={form.technologies ?? ""} onChange={e => setForm(f => ({ ...f, technologies: e.target.value }))}
                  placeholder="e.g. React, Node.js, ML"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Work Summary</label>
                <textarea rows={3} value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.certificate_issued ?? false}
                    onChange={e => setForm(f => ({ ...f, certificate_issued: e.target.checked }))}
                    className="w-4 h-4 rounded accent-blue-600" />
                  <span className="text-xs font-medium text-slate-700">Certificate Issued</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_paid ?? false}
                    onChange={e => setForm(f => ({ ...f, is_paid: e.target.checked }))}
                    className="w-4 h-4 rounded accent-blue-600" />
                  <span className="text-xs font-medium text-slate-700">Paid / Stipend</span>
                </label>

                {form.is_paid && (
                  <div className="pl-6">
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Stipend Amount (₹/month)</label>
                    <input type="number" value={form.stipend_amount ?? ""}
                      onChange={e => setForm(f => ({ ...f, stipend_amount: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.offer_received ?? false}
                    onChange={e => setForm(f => ({ ...f, offer_received: e.target.checked }))}
                    className="w-4 h-4 rounded accent-blue-600" />
                  <span className="text-xs font-medium text-slate-700">Offer / PPO Received</span>
                </label>
              </div>
            </div>

            {formError && (
              <p className="px-5 pb-2 text-xs text-red-600 shrink-0">{formError}</p>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 shrink-0">
              <button onClick={() => setShowPanel(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
                {saving && <Loader2 size={12} className="animate-spin" />}
                {editing ? "Save Changes" : "Log Internship"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
