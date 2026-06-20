"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, GraduationCap, CalendarRange, Receipt, Users, Sparkles,
  Plus, ArrowRight, ArrowLeft, Check, Upload, Loader2,
} from "lucide-react";
import {
  ONBOARDING_STEPS, onboardingProgress, isStepComplete, parseStaffCsv,
  type OnboardingStepId, type OnboardingState, type ParsedStaffRow,
} from "@/lib/onboarding";
import {
  addOnboardingDepartment, setOnboardingAcademicYear, addOnboardingFeeStructure,
  importOnboardingStaff, markOnboardingComplete, type OnboardingSnapshot,
} from "@/actions/onboarding";
import { OnboardingProgress } from "./OnboardingProgress";

const FEE_TYPES = ["TUITION", "EXAMINATION", "LIBRARY", "LABORATORY", "HOSTEL", "TRANSPORT", "OTHER"];

type Props = {
  institutionId: string;
  institutionName: string;
  initial: OnboardingSnapshot;
};

export function OnboardingWizard({ institutionId, institutionName, initial }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStepId>("welcome");
  const [snap, setSnap] = useState<OnboardingSnapshot>(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const state: OnboardingState = {
    departments: snap.departments,
    hasAcademicYear: snap.hasAcademicYear,
    feeStructures: snap.feeStructures,
    staff: snap.staff,
  };
  const progress = onboardingProgress(state);
  const completedSteps = useMemo(() => {
    const s = new Set<OnboardingStepId>();
    for (const st of ONBOARDING_STEPS) if (st.actionable && isStepComplete(st.id, state)) s.add(st.id);
    return s;
  }, [snap.departments, snap.hasAcademicYear, snap.feeStructures, snap.staff]);

  const stepIndex = ONBOARDING_STEPS.findIndex((s) => s.id === step);
  const goNext = () => setStep(ONBOARDING_STEPS[Math.min(stepIndex + 1, ONBOARDING_STEPS.length - 1)].id);
  const goBack = () => setStep(ONBOARDING_STEPS[Math.max(stepIndex - 1, 0)].id);

  const finish = () => {
    setError(null);
    startTransition(async () => {
      const res = await markOnboardingComplete(institutionId);
      if (!res.success) { setError(res.error); return; }
      router.push("/");
      router.refresh();
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-stretch">
      {/* Sidebar */}
      <aside className="hidden md:flex w-80 shrink-0 flex-col gap-8 border-r border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-500/30">
            <Building2 size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{institutionName}</p>
            <p className="text-xs text-slate-400">Onboarding</p>
          </div>
        </div>
        <OnboardingProgress
          currentStep={step}
          progress={progress}
          completedSteps={completedSteps}
          onStepClick={setStep}
        />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center overflow-y-auto p-6 md:p-12">
        <div className="w-full max-w-2xl">
          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
              {error}
            </div>
          )}

          {step === "welcome" && (
            <WelcomeStep institutionName={institutionName} onStart={goNext} />
          )}
          {step === "departments" && (
            <DepartmentsStep
              snap={snap} setSnap={setSnap} institutionId={institutionId}
              onNext={goNext} onBack={goBack} setError={setError}
            />
          )}
          {step === "academic-year" && (
            <AcademicYearStep
              snap={snap} setSnap={setSnap} institutionId={institutionId}
              onNext={goNext} onBack={goBack} setError={setError}
            />
          )}
          {step === "fees" && (
            <FeesStep
              snap={snap} setSnap={setSnap} institutionId={institutionId}
              onNext={goNext} onBack={goBack} setError={setError}
            />
          )}
          {step === "staff" && (
            <StaffStep
              snap={snap} setSnap={setSnap} institutionId={institutionId}
              onNext={goNext} onBack={goBack} setError={setError}
            />
          )}
          {step === "done" && (
            <DoneStep state={state} progress={progress} onFinish={finish} onBack={goBack} busy={isPending} />
          )}
        </div>
      </main>
    </div>
  );
}

// ── Shared bits ───────────────────────────────────────────────────────────────

function StepHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
        {icon}
      </div>
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors";

function NavButtons({
  onBack, onNext, nextLabel = "Continue", busy, canSkip, onSkip,
}: { onBack?: () => void; onNext: () => void; nextLabel?: string; busy?: boolean; canSkip?: boolean; onSkip?: () => void }) {
  return (
    <div className="mt-8 flex items-center justify-between">
      <button
        type="button" onClick={onBack} disabled={!onBack}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 disabled:opacity-0 transition-colors"
      >
        <ArrowLeft size={15} /> Back
      </button>
      <div className="flex items-center gap-2">
        {canSkip && (
          <button type="button" onClick={onSkip} className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
            Skip for now
          </button>
        )}
        <button
          type="button" onClick={onNext} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60 transition-colors"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : null}
          {nextLabel} {!busy && <ArrowRight size={15} />}
        </button>
      </div>
    </div>
  );
}

// ── Step screens ──────────────────────────────────────────────────────────────

function WelcomeStep({ institutionName, onStart }: { institutionName: string; onStart: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/30">
        <Sparkles size={30} />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome to AURA</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 leading-relaxed">
        Let&apos;s get <span className="font-semibold text-slate-700">{institutionName}</span> ready. In a few quick
        steps we&apos;ll set up your departments, academic year, fee structures, and staff. You can skip any step and
        come back later.
      </p>
      <button
        type="button" onClick={onStart}
        className="mx-auto mt-6 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-700 transition-colors"
      >
        Get started <ArrowRight size={16} />
      </button>
    </div>
  );
}

type StepProps = {
  snap: OnboardingSnapshot;
  setSnap: React.Dispatch<React.SetStateAction<OnboardingSnapshot>>;
  institutionId: string;
  onNext: () => void;
  onBack: () => void;
  setError: (e: string | null) => void;
};

function DepartmentsStep({ snap, setSnap, institutionId, onNext, onBack, setError }: StepProps) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true); setError(null);
    const res = await addOnboardingDepartment(institutionId, { name });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setSnap((s) => ({
      ...s,
      departments: s.departments + 1,
      departmentList: [...s.departmentList, res.data].sort((a, b) => a.name.localeCompare(b.name)),
    }));
    setName("");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
      <StepHeader icon={<GraduationCap size={22} />} title="Departments" subtitle="Add the academic departments in your institution." />
      <div className="flex gap-2">
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="e.g. Computer Science" className={inputCls}
        />
        <button
          type="button" onClick={add} disabled={busy || !name.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add
        </button>
      </div>

      {snap.departmentList.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {snap.departmentList.map((d) => (
            <li key={d.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              <Check size={12} className="text-violet-600" /> {d.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-slate-400">No departments yet. Add at least one to continue.</p>
      )}

      <NavButtons onBack={onBack} onNext={onNext} canSkip={snap.departments === 0} onSkip={onNext} />
    </div>
  );
}

function AcademicYearStep({ snap, setSnap, institutionId, onNext, onBack, setError }: StepProps) {
  const thisYear = new Date().getFullYear();
  const [label, setLabel] = useState(snap.academicYearLabel ?? `${thisYear}-${thisYear + 1}`);
  const [start, setStart] = useState(`${thisYear}-06-01`);
  const [end, setEnd] = useState(`${thisYear + 1}-04-30`);
  const [busy, setBusy] = useState(false);

  const saveAndNext = async () => {
    setBusy(true); setError(null);
    const res = await setOnboardingAcademicYear(institutionId, { label, start_date: start, end_date: end });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setSnap((s) => ({ ...s, hasAcademicYear: true, academicYearLabel: label }));
    onNext();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
      <StepHeader icon={<CalendarRange size={22} />} title="Academic Year" subtitle="Set the current academic session for your institution." />
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">Label</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="2026-2027" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Start date</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">End date</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
          </div>
        </div>
        {snap.hasAcademicYear && (
          <p className="text-xs text-emerald-600 flex items-center gap-1"><Check size={12} /> Current year set to {snap.academicYearLabel}.</p>
        )}
      </div>
      <NavButtons onBack={onBack} onNext={saveAndNext} busy={busy} canSkip={!snap.hasAcademicYear} onSkip={onNext} />
    </div>
  );
}

function FeesStep({ snap, setSnap, institutionId, onNext, onBack, setError }: StepProps) {
  const [name, setName] = useState("");
  const [feeType, setFeeType] = useState(FEE_TYPES[0]);
  const [amount, setAmount] = useState("");
  const [deptId, setDeptId] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const amt = Number(amount);
    if (!name.trim() || !amt || amt <= 0) { setError("Enter a fee name and a positive amount."); return; }
    setBusy(true); setError(null);
    const res = await addOnboardingFeeStructure(institutionId, {
      name, fee_type: feeType, amount: amt, department_id: deptId || null,
    });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setSnap((s) => ({ ...s, feeStructures: s.feeStructures + 1 }));
    setName(""); setAmount("");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
      <StepHeader icon={<Receipt size={22} />} title="Fee Structures" subtitle="Configure tuition and other fees. You can refine these later." />
      <div className="space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fee name (e.g. Annual Tuition)" className={inputCls} />
        <div className="grid grid-cols-2 gap-3">
          <select value={feeType} onChange={(e) => setFeeType(e.target.value)} className={inputCls}>
            {FEE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
          </select>
          <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (₹)" className={inputCls} />
        </div>
        <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className={inputCls}>
          <option value="">All departments</option>
          {snap.departmentList.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button
          type="button" onClick={add} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add fee
        </button>
      </div>

      {snap.feeStructures > 0 && (
        <p className="mt-4 text-xs text-emerald-600 flex items-center gap-1">
          <Check size={12} /> {snap.feeStructures} fee structure{snap.feeStructures > 1 ? "s" : ""} added.
        </p>
      )}

      <NavButtons onBack={onBack} onNext={onNext} canSkip={snap.feeStructures === 0} onSkip={onNext} />
    </div>
  );
}

function StaffStep({ snap, setSnap, institutionId, onNext, onBack, setError }: StepProps) {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(() => (raw.trim() ? parseStaffCsv(raw) : { rows: [] as ParsedStaffRow[], errors: [] }), [raw]);

  const onFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRaw(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const importRows = async () => {
    if (!parsed.rows.length) { setError("Nothing to import — paste or upload a CSV first."); return; }
    setBusy(true); setError(null);
    const res = await importOnboardingStaff(institutionId, parsed.rows);
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setSnap((s) => ({ ...s, staff: s.staff + res.data.inserted }));
    setRaw("");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
      <StepHeader icon={<Users size={22} />} title="Staff" subtitle="Import staff from a CSV. Columns: name, email, designation, department, type." />

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 hover:border-violet-300 hover:bg-violet-50/50 transition-colors">
        <Upload size={15} /> Upload CSV file
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      </label>

      <div className="mt-3">
        <textarea
          value={raw} onChange={(e) => setRaw(e.target.value)} rows={5}
          placeholder={"name,email,designation,department,type\nJane Doe,jane@college.edu,Professor,Computer Science,teaching"}
          className={`${inputCls} font-mono text-xs resize-y`}
        />
      </div>

      {parsed.errors.length > 0 && (
        <ul className="mt-3 space-y-0.5 text-xs text-amber-600">
          {parsed.errors.slice(0, 5).map((e, i) => <li key={i}>• {e}</li>)}
          {parsed.errors.length > 5 && <li>• …and {parsed.errors.length - 5} more.</li>}
        </ul>
      )}

      {parsed.rows.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-slate-500 mb-1.5">{parsed.rows.length} valid row{parsed.rows.length > 1 ? "s" : ""} ready:</p>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr><th className="px-2 py-1.5 text-left font-medium">Name</th><th className="px-2 py-1.5 text-left font-medium">Email</th><th className="px-2 py-1.5 text-left font-medium">Designation</th><th className="px-2 py-1.5 text-left font-medium">Dept</th></tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 text-slate-700">{r.full_name}</td>
                    <td className="px-2 py-1.5 text-slate-500">{r.email ?? "—"}</td>
                    <td className="px-2 py-1.5 text-slate-500">{r.designation ?? "—"}</td>
                    <td className="px-2 py-1.5 text-slate-500">{r.department ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button" onClick={importRows} disabled={busy}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Import {parsed.rows.length} staff
          </button>
        </div>
      )}

      {snap.staff > 0 && (
        <p className="mt-4 text-xs text-emerald-600 flex items-center gap-1"><Check size={12} /> {snap.staff} staff imported.</p>
      )}

      <NavButtons onBack={onBack} onNext={onNext} canSkip={snap.staff === 0} onSkip={onNext} />
    </div>
  );
}

function DoneStep({
  state, progress, onFinish, onBack, busy,
}: { state: OnboardingState; progress: number; onFinish: () => void; onBack: () => void; busy: boolean }) {
  const rows = [
    { label: "Departments", value: state.departments },
    { label: "Academic year", value: state.hasAcademicYear ? "Set" : "Not set" },
    { label: "Fee structures", value: state.feeStructures },
    { label: "Staff imported", value: state.staff },
  ];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
        <Check size={32} strokeWidth={3} />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">You&apos;re all set</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        {progress === 100
          ? "Everything's configured. Finish to open your dashboard."
          : "You can finish now and complete the remaining setup any time from your dashboard."}
      </p>

      <dl className="mx-auto mt-6 max-w-sm divide-y divide-slate-100 rounded-xl border border-slate-200 text-left">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-4 py-2.5">
            <dt className="text-sm text-slate-500">{r.label}</dt>
            <dd className="text-sm font-semibold text-slate-800">{r.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex items-center justify-center gap-2">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={15} /> Back
        </button>
        <button
          type="button" onClick={onFinish} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 transition-colors"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          Finish & open dashboard {!busy && <ArrowRight size={16} />}
        </button>
      </div>
    </div>
  );
}
