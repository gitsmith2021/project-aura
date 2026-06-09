"use client";

import { useEffect, useState, useCallback, use } from "react";
import { createClient } from "@/utils/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  getGuestLectures, createGuestLecture, updateGuestLecture, deleteGuestLecture,
  type GuestLecture, type GuestLecturePayload,
} from "@/actions/guest-lectures";
import {
  Mic2, Plus, Pencil, Trash2, Loader2, X, ChevronDown, ChevronUp,
  Users, MapPin, Calendar, Monitor, Building2, GraduationCap,
} from "lucide-react";

type Department   = { id: string; name: string };
type AcademicYear = { id: string; label: string };
type Staff        = { id: string; first_name: string; last_name: string };
type Subject      = { id: string; name: string; code: string | null };

const MODES = [
  { value: "in_person", label: "In Person" },
  { value: "online",    label: "Online" },
  { value: "hybrid",    label: "Hybrid" },
];

const MODE_COLORS: Record<string, string> = {
  in_person: "bg-emerald-50 text-emerald-700 border-emerald-200",
  online:    "bg-blue-50 text-blue-700 border-blue-200",
  hybrid:    "bg-violet-50 text-violet-700 border-violet-200",
};

const EMPTY_FORM = {
  title: "", speakerName: "", speakerDesignation: "", speakerOrg: "",
  speakerEmail: "", speakerPhone: "", eventDate: new Date().toISOString().split("T")[0],
  startTime: "", endTime: "", venue: "", mode: "in_person" as const,
  departmentId: "", subjectId: "", ayId: "", organizedBy: "",
  studentCount: "", staffCount: "", description: "", outcomes: "", feedbackSummary: "",
  naacCriterion: "1.3",
};

export default function GuestLecturesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: institutionId } = use(params);

  const [departments,   setDepartments]   = useState<Department[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [staffList,     setStaffList]     = useState<Staff[]>([]);
  const [subjects,      setSubjects]      = useState<Subject[]>([]);
  const [lectures,      setLectures]      = useState<GuestLecture[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [deleting,      setDeleting]      = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [form,      setForm]      = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState("");
  const [expanded,  setExpanded]  = useState<Set<string>>(new Set());

  // Filters
  const [filterDept, setFilterDept] = useState("");
  const [filterAY,   setFilterAY]   = useState("");
  const [filterMode, setFilterMode] = useState("");

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("departments").select("id, name").eq("institution_id", institutionId).order("name"),
      supabase.from("academic_years").select("id, label").eq("institution_id", institutionId).order("label", { ascending: false }),
      supabase.from("staff").select("id, first_name, last_name").eq("institution_id", institutionId).order("first_name"),
      supabase.from("subjects").select("id, name, code").eq("institution_id", institutionId).order("name"),
    ]).then(([d, ay, s, sub]) => {
      setDepartments((d.data ?? []) as Department[]);
      setAcademicYears((ay.data ?? []) as AcademicYear[]);
      setStaffList((s.data ?? []) as Staff[]);
      setSubjects((sub.data ?? []) as Subject[]);
      if (ay.data?.[0]) setFilterAY(ay.data[0].id);
    });
  }, [institutionId]);

  const loadLectures = useCallback(async () => {
    setLoading(true);
    const res = await getGuestLectures(institutionId, {
      departmentId:  filterDept || undefined,
      academicYearId: filterAY  || undefined,
      mode:          filterMode || undefined,
    });
    setLectures(res.success ? res.data : []);
    setLoading(false);
  }, [institutionId, filterDept, filterAY, filterMode]);

  useEffect(() => { loadLectures(); }, [loadLectures]);

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM, ayId: academicYears[0]?.id ?? "" });
    setFormError("");
    setShowModal(true);
  }

  function openEdit(l: GuestLecture) {
    setEditId(l.id);
    setForm({
      title:             l.title,
      speakerName:       l.speaker_name,
      speakerDesignation: l.speaker_designation ?? "",
      speakerOrg:        l.speaker_organization ?? "",
      speakerEmail:      l.speaker_email ?? "",
      speakerPhone:      l.speaker_phone ?? "",
      eventDate:         l.event_date,
      startTime:         l.start_time ?? "",
      endTime:           l.end_time ?? "",
      venue:             l.venue ?? "",
      mode:              l.mode,
      departmentId:      l.department_id ?? "",
      subjectId:         l.subject_id ?? "",
      ayId:              l.academic_year_id ?? "",
      organizedBy:       l.organized_by ?? "",
      studentCount:      l.student_count != null ? String(l.student_count) : "",
      staffCount:        l.staff_count != null ? String(l.staff_count) : "",
      description:       l.description ?? "",
      outcomes:          l.outcomes ?? "",
      feedbackSummary:   l.feedback_summary ?? "",
      naacCriterion:     l.naac_criterion,
    });
    setFormError("");
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!form.title.trim())       { setFormError("Title is required."); return; }
    if (!form.speakerName.trim()) { setFormError("Speaker name is required."); return; }
    if (!form.eventDate)          { setFormError("Event date is required."); return; }

    setSaving(true);
    setFormError("");

    const payload: GuestLecturePayload = {
      institution_id:      institutionId,
      department_id:       form.departmentId   || null,
      academic_year_id:    form.ayId           || null,
      subject_id:          form.subjectId      || null,
      speaker_name:        form.speakerName.trim(),
      speaker_designation: form.speakerDesignation.trim() || null,
      speaker_organization: form.speakerOrg.trim() || null,
      speaker_email:       form.speakerEmail.trim() || null,
      speaker_phone:       form.speakerPhone.trim() || null,
      title:               form.title.trim(),
      event_date:          form.eventDate,
      start_time:          form.startTime || null,
      end_time:            form.endTime   || null,
      venue:               form.venue.trim() || null,
      mode:                form.mode,
      student_count:       form.studentCount ? parseInt(form.studentCount) : null,
      staff_count:         form.staffCount   ? parseInt(form.staffCount)   : null,
      organized_by:        form.organizedBy  || null,
      description:         form.description.trim()       || null,
      outcomes:            form.outcomes.trim()           || null,
      feedback_summary:    form.feedbackSummary.trim()   || null,
      naac_criterion:      form.naacCriterion || "1.3",
    };

    const res = editId
      ? await updateGuestLecture(editId, institutionId, payload)
      : await createGuestLecture(payload);

    if (!res.success) { setFormError(res.error); setSaving(false); return; }
    setShowModal(false);
    await loadLectures();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this guest lecture record?")) return;
    setDeleting(id);
    await deleteGuestLecture(id, institutionId);
    setLectures(l => l.filter(x => x.id !== id));
    setDeleting(null);
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const f = (v: string) => <span className="font-medium text-slate-700 dark:text-slate-300">{v}</span>;

  // Summary stats
  const totalStudents = lectures.reduce((s, l) => s + (l.student_count ?? 0), 0);
  const uniqueSpeakers = new Set(lectures.map(l => l.speaker_name.toLowerCase())).size;

  return (
    <DashboardLayout>
      <div className="px-6 py-8 w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Mic2 size={20} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Guest Lectures</h1>
              <p className="text-xs text-slate-500">Expert talks & industry interactions · NAAC 1.3</p>
            </div>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors">
            <Plus size={14} /> Add Entry
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Events",     value: lectures.length,  icon: Mic2,          color: "violet" },
            { label: "Unique Speakers",  value: uniqueSpeakers,   icon: Users,         color: "blue" },
            { label: "Students Reached", value: totalStudents,    icon: GraduationCap, color: "emerald" },
            { label: "Departments",      value: new Set(lectures.map(l => l.department_id).filter(Boolean)).size, icon: Building2, color: "amber" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-100 dark:border-${color}-800/30 rounded-xl p-4`}>
              <Icon size={16} className={`text-${color}-500 mb-2`} />
              <p className={`text-2xl font-bold text-${color}-700 dark:text-${color}-400`}>{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={filterAY} onChange={e => setFilterAY(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="">All Years</option>
            {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.label}</option>)}
          </select>
          <select value={filterMode} onChange={e => setFilterMode(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="">All Modes</option>
            {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-violet-500" /></div>
        ) : lectures.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            <Mic2 size={36} className="mx-auto mb-3 opacity-25" />
            No guest lecture records yet. Add your first entry.
          </div>
        ) : (
          <div className="space-y-2">
            {lectures.map(l => {
              const isOpen = expanded.has(l.id);
              const dept = l.department as { name: string } | null | undefined;
              const ay   = l.academic_year as { label: string } | null | undefined;
              const sub  = l.subject as { name: string; code: string | null } | null | undefined;
              const org  = l.organizer as { first_name: string; last_name: string } | null | undefined;
              const modeLabel = MODES.find(m => m.value === l.mode)?.label ?? l.mode;
              const modeColor = MODE_COLORS[l.mode] ?? "bg-slate-50 text-slate-600 border-slate-200";
              return (
                <div key={l.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="flex items-start gap-4 p-4 cursor-pointer" onClick={() => toggleExpand(l.id)}>
                    {/* Date badge */}
                    <div className="shrink-0 w-12 text-center pt-0.5">
                      <p className="text-xl font-bold text-violet-600 dark:text-violet-400 leading-none">
                        {new Date(l.event_date).getDate().toString().padStart(2, "0")}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase mt-0.5">
                        {new Date(l.event_date).toLocaleString("default", { month: "short" })}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(l.event_date).getFullYear()}
                      </p>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{l.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${modeColor}`}>
                          {modeLabel}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {l.speaker_name}
                        {l.speaker_designation   && ` · ${l.speaker_designation}`}
                        {l.speaker_organization  && `, ${l.speaker_organization}`}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-400">
                        {dept && <span className="flex items-center gap-1"><Building2 size={10} />{dept.name}</span>}
                        {l.venue && <span className="flex items-center gap-1"><MapPin size={10} />{l.venue}</span>}
                        {(l.student_count != null) && (
                          <span className="flex items-center gap-1"><GraduationCap size={10} />{l.student_count} students</span>
                        )}
                        {l.start_time && <span className="flex items-center gap-1"><Calendar size={10} />{l.start_time}{l.end_time ? ` – ${l.end_time}` : ""}</span>}
                        {ay && <span>{ay.label}</span>}
                        {sub && <span>{sub.name}{sub.code ? ` (${sub.code})` : ""}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button" onClick={e => { e.stopPropagation(); openEdit(l); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button type="button" onClick={e => { e.stopPropagation(); handleDelete(l.id); }}
                        disabled={deleting === l.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        {deleting === l.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                      {isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded */}
                  {isOpen && (
                    <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                      {l.description && <p><span className="font-semibold text-slate-700 dark:text-slate-300">About: </span>{l.description}</p>}
                      {l.outcomes    && <p><span className="font-semibold text-slate-700 dark:text-slate-300">Outcomes: </span>{l.outcomes}</p>}
                      {l.feedback_summary && <p><span className="font-semibold text-slate-700 dark:text-slate-300">Feedback: </span>{l.feedback_summary}</p>}
                      <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-[11px]">
                        {l.speaker_email && <span>📧 {l.speaker_email}</span>}
                        {l.speaker_phone && <span>📞 {l.speaker_phone}</span>}
                        {org && <span>Organised by: {org.first_name} {org.last_name}</span>}
                        {l.staff_count != null && <span><Monitor size={10} className="inline mr-1" />{l.staff_count} staff attended</span>}
                        <span className="text-slate-400">NAAC: {l.naac_criterion}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowModal(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200" />

          {/* Slide-in panel */}
          <div
            className="relative h-full w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Mic2 size={15} className="text-violet-600 dark:text-violet-400" />
                </div>
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  {editId ? "Edit Guest Lecture" : "Add Guest Lecture"}
                </h2>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Event details */}
              <div>
                <p className="text-[11px] font-semibold text-violet-600 uppercase tracking-wider mb-3">Event Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Talk Title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g., Machine Learning in Healthcare"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date *</label>
                    <input type="date" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Mode</label>
                    <select value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value as typeof form.mode }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
                      {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Time</label>
                    <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">End Time</label>
                    <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Venue</label>
                    <input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                      placeholder="e.g., Seminar Hall A, Main Block"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                </div>
              </div>

              {/* Speaker */}
              <div>
                <p className="text-[11px] font-semibold text-violet-600 uppercase tracking-wider mb-3">Speaker / Expert</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Name *</label>
                    <input value={form.speakerName} onChange={e => setForm(f => ({ ...f, speakerName: e.target.value }))}
                      placeholder="e.g., Dr. Ravi Kumar"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Designation</label>
                    <input value={form.speakerDesignation} onChange={e => setForm(f => ({ ...f, speakerDesignation: e.target.value }))}
                      placeholder="e.g., Senior Scientist"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Organisation</label>
                    <input value={form.speakerOrg} onChange={e => setForm(f => ({ ...f, speakerOrg: e.target.value }))}
                      placeholder="e.g., IIT Madras"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email</label>
                    <input type="email" value={form.speakerEmail} onChange={e => setForm(f => ({ ...f, speakerEmail: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Phone</label>
                    <input value={form.speakerPhone} onChange={e => setForm(f => ({ ...f, speakerPhone: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                </div>
              </div>

              {/* Context */}
              <div>
                <p className="text-[11px] font-semibold text-violet-600 uppercase tracking-wider mb-3">Academic Context</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Department</label>
                    <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
                      <option value="">All / Not specified</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Academic Year</label>
                    <select value={form.ayId} onChange={e => setForm(f => ({ ...f, ayId: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
                      <option value="">Not specified</option>
                      {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Related Subject</label>
                    <select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
                      <option value="">None</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Organised By</label>
                    <select value={form.organizedBy} onChange={e => setForm(f => ({ ...f, organizedBy: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
                      <option value="">Not specified</option>
                      {staffList.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Students Attended</label>
                    <input type="number" min="0" value={form.studentCount} onChange={e => setForm(f => ({ ...f, studentCount: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Staff Attended</label>
                    <input type="number" min="0" value={form.staffCount} onChange={e => setForm(f => ({ ...f, staffCount: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">NAAC Criterion</label>
                    <input value={form.naacCriterion} onChange={e => setForm(f => ({ ...f, naacCriterion: e.target.value }))}
                      placeholder="1.3"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                </div>
              </div>

              {/* Outcomes */}
              <div>
                <p className="text-[11px] font-semibold text-violet-600 uppercase tracking-wider mb-3">Notes & Outcomes</p>
                <div className="space-y-3">
                  {[
                    { label: "Description", key: "description" as const, placeholder: "Brief about the talk..." },
                    { label: "Learning Outcomes", key: "outcomes" as const, placeholder: "Key takeaways for students..." },
                    { label: "Feedback Summary", key: "feedbackSummary" as const, placeholder: "Student/staff feedback..." },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
                      <textarea value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        rows={2} placeholder={placeholder}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {formError && <p className="px-6 pb-2 text-xs text-red-600 shrink-0">{formError}</p>}

            {/* Pinned footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button type="button" onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleSubmit} disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors disabled:opacity-60">
                {saving && <Loader2 size={13} className="animate-spin" />}
                {editId ? "Update" : "Save Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
