"use client";

import { use, useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import {
  Target, Loader2, Plus, Trash2, AlertCircle, ArrowLeft, Download,
  Grid3x3, Tags, BarChart3, GraduationCap, Pencil, X, Check,
} from "lucide-react";
import {
  getCourseOutcomes, saveCourseOutcome, deleteCourseOutcome,
  getProgramOutcomes, saveProgramOutcome, deleteProgramOutcome,
  getCOPOMatrix, setCOPOCorrelation,
  getComponentTags, toggleComponentTag,
  getAttainmentReport,
  type CourseOutcome, type ProgramOutcome, type COPOCell, type AttainmentReport,
} from "@/actions/coPo";
import { getCIAComponents, type CIAComponent } from "@/actions/cia";
import { CO_TARGET_PCT, CO_LEVEL_CUTOFFS } from "@/lib/coPoEngine";

type Department = { id: string; name: string };
type Subject = { id: string; name: string; code: string | null };

const CORRELATION_STYLES: Record<number, string> = {
  0: "bg-slate-50 text-slate-300 hover:bg-slate-100",
  1: "bg-amber-100 text-amber-700 hover:bg-amber-200",
  2: "bg-sky-100 text-sky-700 hover:bg-sky-200",
  3: "bg-violet-600 text-white hover:bg-violet-700",
};

const LEVEL_STYLES: Record<number, string> = {
  0: "bg-rose-100 text-rose-700",
  1: "bg-amber-100 text-amber-700",
  2: "bg-sky-100 text-sky-700",
  3: "bg-emerald-100 text-emerald-700",
};

function SectionCard({ icon: Icon, title, subtitle, action, children }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon size={15} className="text-violet-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>
            <p className="text-[11px] text-slate-400">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/** Inline add/edit row for CO and PO editors. */
function OutcomeForm({ initial, codePlaceholder, onSave, onCancel, extra }: {
  initial?: { code: string; description: string };
  codePlaceholder: string;
  onSave: (code: string, description: string) => Promise<void>;
  onCancel: () => void;
  extra?: React.ReactNode;
}) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-200 bg-violet-50/40 px-3 py-2">
      <input
        value={code} onChange={(e) => setCode(e.target.value)} placeholder={codePlaceholder}
        className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
      />
      <input
        value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Outcome statement…"
        className="flex-1 min-w-48 px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
      />
      {extra}
      <button
        onClick={async () => {
          if (!code.trim() || !description.trim()) return;
          setSaving(true);
          await onSave(code, description);
          setSaving(false);
        }}
        disabled={saving}
        className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors"
      >
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
      </button>
      <button onClick={onCancel} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
        <X size={13} />
      </button>
    </div>
  );
}

export default function OutcomesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: institutionId } = use(params);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [deptId, setDeptId] = useState("");
  const [semester, setSemester] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [cos, setCos] = useState<CourseOutcome[]>([]);
  const [pos, setPos] = useState<ProgramOutcome[]>([]);
  const [matrix, setMatrix] = useState<COPOCell[]>([]);
  const [tags, setTags] = useState<{ cia_component_id: string; course_outcome_id: string }[]>([]);
  const [components, setComponents] = useState<CIAComponent[]>([]);
  const [report, setReport] = useState<AttainmentReport | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addingCO, setAddingCO] = useState(false);
  const [editingCO, setEditingCO] = useState<string | null>(null);
  const [addingPO, setAddingPO] = useState(false);
  const [poInstitutionWide, setPoInstitutionWide] = useState(false);

  // ── Loaders ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase.from("departments").select("id,name").eq("institution_id", institutionId).order("name")
      .then(({ data }) => setDepartments(data ?? []));
  }, [institutionId]);

  useEffect(() => {
    setSubjectId("");
    if (!deptId || !semester) { setSubjects([]); return; }
    const supabase = createClient();
    supabase.from("subjects").select("id,name,code")
      .eq("institution_id", institutionId)
      .eq("department_id", deptId)
      .eq("semester", Number(semester))
      .order("name")
      .then(({ data }) => setSubjects(data ?? []));
  }, [institutionId, deptId, semester]);

  const refresh = useCallback(async () => {
    if (!deptId || !subjectId) return;
    setLoading(true);
    setError(null);
    setReport(null);
    const [cosRes, posRes, matrixRes, tagsRes, compRes] = await Promise.all([
      getCourseOutcomes(institutionId, subjectId),
      getProgramOutcomes(institutionId, deptId),
      getCOPOMatrix(institutionId, subjectId),
      getComponentTags(institutionId, subjectId),
      getCIAComponents(institutionId, { departmentId: deptId, semester: Number(semester) }),
    ]);
    if (cosRes.success) setCos(cosRes.data); else setError(cosRes.error);
    if (posRes.success) setPos(posRes.data);
    if (matrixRes.success) setMatrix(matrixRes.data);
    if (tagsRes.success) setTags(tagsRes.data);
    if (compRes.success) setComponents(compRes.data);
    setLoading(false);
  }, [institutionId, deptId, semester, subjectId]);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const correlationFor = (coId: string, poId: string) =>
    matrix.find((c) => c.course_outcome_id === coId && c.program_outcome_id === poId)?.correlation ?? 0;

  const cycleCorrelation = async (coId: string, poId: string) => {
    const next = (correlationFor(coId, poId) + 1) % 4; // 0→1→2→3→0
    // optimistic update
    setMatrix((prev) => {
      const rest = prev.filter((c) => !(c.course_outcome_id === coId && c.program_outcome_id === poId));
      return next === 0 ? rest : [...rest, { course_outcome_id: coId, program_outcome_id: poId, correlation: next }];
    });
    const res = await setCOPOCorrelation({ institutionId, courseOutcomeId: coId, programOutcomeId: poId, correlation: next });
    if (!res.success) { setError(res.error); refresh(); }
  };

  const isTagged = (componentId: string, coId: string) =>
    tags.some((t) => t.cia_component_id === componentId && t.course_outcome_id === coId);

  const flipTag = async (componentId: string, coId: string) => {
    const tagged = !isTagged(componentId, coId);
    setTags((prev) =>
      tagged
        ? [...prev, { cia_component_id: componentId, course_outcome_id: coId }]
        : prev.filter((t) => !(t.cia_component_id === componentId && t.course_outcome_id === coId))
    );
    const res = await toggleComponentTag({ institutionId, ciaComponentId: componentId, courseOutcomeId: coId, tagged });
    if (!res.success) { setError(res.error); refresh(); }
  };

  const runReport = async () => {
    setLoadingReport(true);
    setError(null);
    const res = await getAttainmentReport(institutionId, deptId, subjectId);
    if (res.success) setReport(res.data); else setError(res.error);
    setLoadingReport(false);
  };

  const exportCSV = () => {
    if (!report) return;
    const subject = subjects.find((s) => s.id === subjectId);
    const lines: string[] = [
      `CO/PO Attainment Report,${subject?.name ?? ""} ${subject?.code ? `(${subject.code})` : ""}`,
      `Target: ${CO_TARGET_PCT}% of max marks,Levels: 3 >= ${CO_LEVEL_CUTOFFS.level3}% | 2 >= ${CO_LEVEL_CUTOFFS.level2}% | 1 >= ${CO_LEVEL_CUTOFFS.level1}%`,
      "",
      "Course Outcome,Description,Components,Students Assessed,Attainment %,Level",
      ...report.cos.map((c) =>
        `${c.code},"${c.description.replace(/"/g, '""')}",${c.components_assessed},${c.students_assessed},${c.attainment_pct ?? ""},${c.level ?? ""}`
      ),
      "",
      "Program Outcome,Description,Contributing COs,Attainment (0-3)",
      ...report.pos.map((p) =>
        `${p.code},"${p.description.replace(/"/g, '""')}",${p.contributing_cos},${p.attainment ?? ""}`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `co-po-attainment-${subject?.code ?? subjectId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtersSet = deptId && semester && subjectId;

  return (
    <DashboardLayout>
      <div className="px-6 pt-6 pb-6 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              href={`/institutions/${institutionId}/cia`}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-violet-600 hover:border-violet-300 transition-colors"
              title="Back to CIA"
            >
              <ArrowLeft size={15} />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <Target size={18} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Outcomes & Attainment (CO/PO)</h1>
              <p className="text-xs text-slate-500">Outcome-based education mapping for NBA / NAAC evidence</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 flex flex-wrap gap-3">
          <select value={deptId} onChange={(e) => setDeptId(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-700 bg-white">
            <option value="">Department...</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={semester} onChange={(e) => setSemester(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-700 bg-white">
            <option value="">Semester...</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => <option key={s} value={s}>Semester {s}</option>)}
          </select>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!deptId || !semester}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-700 bg-white disabled:opacity-50">
            <option value="">Subject...</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>)}
          </select>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 mb-4">
            <AlertCircle size={13} className="shrink-0" /> {error}
          </div>
        )}

        {!filtersSet ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
            <Target size={36} className="opacity-25" />
            <p className="text-sm font-medium">Select department, semester and subject to manage outcomes</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-violet-500" /></div>
        ) : (
          <div className="space-y-5">
            {/* ── Course Outcomes ── */}
            <SectionCard
              icon={GraduationCap} title="Course Outcomes"
              subtitle="What students should be able to do after this subject"
              action={
                <button onClick={() => setAddingCO(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors">
                  <Plus size={12} /> Add CO
                </button>
              }
            >
              <div className="space-y-2">
                {cos.length === 0 && !addingCO && (
                  <p className="text-xs text-slate-400 text-center py-4">No course outcomes yet — add CO1 to begin.</p>
                )}
                {cos.map((co) =>
                  editingCO === co.id ? (
                    <OutcomeForm
                      key={co.id}
                      initial={{ code: co.code, description: co.description }}
                      codePlaceholder="CO1"
                      onCancel={() => setEditingCO(null)}
                      onSave={async (code, description) => {
                        const res = await saveCourseOutcome({ id: co.id, institutionId, subjectId, code, description });
                        if (res.success) { setEditingCO(null); refresh(); } else setError(res.error);
                      }}
                    />
                  ) : (
                    <div key={co.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 group">
                      <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[10px] font-bold shrink-0">{co.code}</span>
                      <p className="text-xs text-slate-700 flex-1">{co.description}</p>
                      <button onClick={() => setEditingCO(co.id)}
                        className="p-1 text-slate-300 hover:text-violet-600 opacity-0 group-hover:opacity-100 transition-all">
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={async () => {
                          const res = await deleteCourseOutcome(institutionId, co.id);
                          if (res.success) refresh(); else setError(res.error);
                        }}
                        className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                )}
                {addingCO && (
                  <OutcomeForm
                    codePlaceholder={`CO${cos.length + 1}`}
                    onCancel={() => setAddingCO(false)}
                    onSave={async (code, description) => {
                      const res = await saveCourseOutcome({ institutionId, subjectId, code, description });
                      if (res.success) { setAddingCO(false); refresh(); } else setError(res.error);
                    }}
                  />
                )}
              </div>
            </SectionCard>

            {/* ── Program Outcomes ── */}
            <SectionCard
              icon={Target} title="Program Outcomes"
              subtitle="Department graduate attributes (institution-wide POs apply to every department)"
              action={
                <button onClick={() => setAddingPO(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors">
                  <Plus size={12} /> Add PO
                </button>
              }
            >
              <div className="space-y-2">
                {pos.length === 0 && !addingPO && (
                  <p className="text-xs text-slate-400 text-center py-4">No program outcomes yet — add PO1 (or NBA PO1–12) to begin.</p>
                )}
                {pos.map((po) => (
                  <div key={po.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 group">
                    <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-700 text-[10px] font-bold shrink-0">{po.code}</span>
                    <p className="text-xs text-slate-700 flex-1">{po.description}</p>
                    {po.department_id === null && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-500 uppercase shrink-0">Institution-wide</span>
                    )}
                    <button
                      onClick={async () => {
                        const res = await deleteProgramOutcome(institutionId, po.id);
                        if (res.success) refresh(); else setError(res.error);
                      }}
                      className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {addingPO && (
                  <OutcomeForm
                    codePlaceholder={`PO${pos.length + 1}`}
                    onCancel={() => { setAddingPO(false); setPoInstitutionWide(false); }}
                    extra={
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-500 px-1 select-none">
                        <input type="checkbox" checked={poInstitutionWide} onChange={(e) => setPoInstitutionWide(e.target.checked)}
                          className="accent-violet-600" />
                        Institution-wide
                      </label>
                    }
                    onSave={async (code, description) => {
                      const res = await saveProgramOutcome({
                        institutionId, departmentId: poInstitutionWide ? null : deptId, code, description,
                      });
                      if (res.success) { setAddingPO(false); setPoInstitutionWide(false); refresh(); } else setError(res.error);
                    }}
                  />
                )}
              </div>
            </SectionCard>

            {/* ── CO–PO matrix ── */}
            {cos.length > 0 && pos.length > 0 && (
              <SectionCard icon={Grid3x3} title="CO–PO Correlation Matrix"
                subtitle="Click a cell to cycle correlation: blank → 1 (low) → 2 (medium) → 3 (high)">
                <div className="overflow-x-auto">
                  <table className="text-center">
                    <thead>
                      <tr>
                        <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-wider text-slate-400 font-semibold">CO \ PO</th>
                        {pos.map((po) => (
                          <th key={po.id} className="px-1.5 py-1.5 text-[10px] font-bold text-slate-500" title={po.description}>{po.code}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cos.map((co) => (
                        <tr key={co.id}>
                          <td className="px-3 py-1 text-left text-[11px] font-bold text-slate-600" title={co.description}>{co.code}</td>
                          {pos.map((po) => {
                            const value = correlationFor(co.id, po.id);
                            return (
                              <td key={po.id} className="p-0.5">
                                <button
                                  onClick={() => cycleCorrelation(co.id, po.id)}
                                  className={`w-9 h-8 rounded-md text-xs font-bold transition-colors ${CORRELATION_STYLES[value]}`}
                                >
                                  {value || "–"}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}

            {/* ── Component tagging ── */}
            {cos.length > 0 && components.length > 0 && (
              <SectionCard icon={Tags} title="Assessment Mapping"
                subtitle="Tick which COs each CIA component assesses — this drives attainment">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Component</th>
                        {cos.map((co) => (
                          <th key={co.id} className="px-2 py-1.5 text-[10px] font-bold text-slate-500" title={co.description}>{co.code}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {components.map((component) => (
                        <tr key={component.id} className="border-t border-slate-50">
                          <td className="px-3 py-2 text-xs font-medium text-slate-700">
                            {component.name}
                            <span className="text-slate-400 font-normal"> · max {component.max_marks}</span>
                            {component.subjects && (
                              <span className="text-slate-400 font-normal"> · {component.subjects.name}</span>
                            )}
                          </td>
                          {cos.map((co) => (
                            <td key={co.id} className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={isTagged(component.id, co.id)}
                                onChange={() => flipTag(component.id, co.id)}
                                className="accent-violet-600 w-3.5 h-3.5 cursor-pointer"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}

            {/* ── Attainment report ── */}
            <SectionCard
              icon={BarChart3} title="Attainment Report"
              subtitle={`Target: ≥${CO_TARGET_PCT}% of max marks · Level 3 ≥${CO_LEVEL_CUTOFFS.level3}% · 2 ≥${CO_LEVEL_CUTOFFS.level2}% · 1 ≥${CO_LEVEL_CUTOFFS.level1}% of students`}
              action={
                <div className="flex items-center gap-2">
                  <button onClick={runReport} disabled={loadingReport || cos.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors">
                    {loadingReport ? <Loader2 size={12} className="animate-spin" /> : <BarChart3 size={12} />}
                    Compute Attainment
                  </button>
                  {report && (
                    <button onClick={exportCSV}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 text-xs font-semibold transition-colors">
                      <Download size={12} /> CSV
                    </button>
                  )}
                </div>
              }
            >
              {!report ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  {cos.length === 0
                    ? "Define course outcomes and tag components first."
                    : "Run the computation to see CO and PO attainment from entered CIA marks."}
                </p>
              ) : (
                <div className="space-y-4">
                  {report.untagged_components.length > 0 && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      <AlertCircle size={13} className="shrink-0 mt-0.5" />
                      <span>
                        Not mapped to any CO:{" "}
                        {report.untagged_components.map((c) => c.name).join(", ")} — their marks are excluded from attainment.
                      </span>
                    </div>
                  )}

                  {/* CO table */}
                  <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100 bg-slate-50/60">
                          <th className="px-3 py-2 font-semibold">CO</th>
                          <th className="px-3 py-2 font-semibold text-right">Components</th>
                          <th className="px-3 py-2 font-semibold text-right">Students</th>
                          <th className="px-3 py-2 font-semibold text-right">Attainment</th>
                          <th className="px-3 py-2 font-semibold text-right">Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.cos.map((c) => (
                          <tr key={c.co_id} className="border-b border-slate-50">
                            <td className="px-3 py-2 text-xs">
                              <span className="font-bold text-slate-800">{c.code}</span>
                              <span className="text-slate-400"> — {c.description}</span>
                            </td>
                            <td className="px-3 py-2 text-xs text-right tabular-nums">{c.components_assessed}</td>
                            <td className="px-3 py-2 text-xs text-right tabular-nums">{c.students_assessed}</td>
                            <td className="px-3 py-2 text-xs font-bold text-right tabular-nums">
                              {c.attainment_pct == null ? <span className="text-slate-300 font-normal">no data</span> : `${c.attainment_pct.toFixed(1)}%`}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {c.level == null ? (
                                <span className="text-slate-300 text-xs">—</span>
                              ) : (
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${LEVEL_STYLES[c.level]}`}>
                                  Level {c.level}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* PO table */}
                  <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100 bg-slate-50/60">
                          <th className="px-3 py-2 font-semibold">PO</th>
                          <th className="px-3 py-2 font-semibold text-right">Contributing COs</th>
                          <th className="px-3 py-2 font-semibold text-right">Attainment (0–3)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.pos.map((p) => (
                          <tr key={p.po_id} className="border-b border-slate-50">
                            <td className="px-3 py-2 text-xs">
                              <span className="font-bold text-slate-800">{p.code}</span>
                              <span className="text-slate-400"> — {p.description}</span>
                            </td>
                            <td className="px-3 py-2 text-xs text-right tabular-nums">{p.contributing_cos}</td>
                            <td className="px-3 py-2 text-xs font-bold text-right tabular-nums">
                              {p.attainment == null ? <span className="text-slate-300 font-normal">no mapped data</span> : p.attainment.toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
