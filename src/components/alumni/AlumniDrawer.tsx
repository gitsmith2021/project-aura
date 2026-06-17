"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, GraduationCap } from "lucide-react";
import { createAlumni, updateAlumniAdmin } from "@/actions/alumni";
import type { Alumnus } from "@/lib/alumni";

type Dept = { id: string; name: string };

export function AlumniDrawer({
  open,
  mode,
  institutionId,
  departments,
  alumnus,
  onClose,
}: {
  open: boolean;
  mode: "add" | "edit";
  institutionId: string;
  departments: Dept[];
  alumnus?: Alumnus | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const thisYear = new Date().getFullYear();

  const [fullName, setFullName] = useState("");
  const [gradYear, setGradYear] = useState<number>(thisYear);
  const [program, setProgram] = useState("");
  const [deptId, setDeptId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [employer, setEmployer] = useState("");
  const [designation, setDesignation] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && alumnus) {
      setFullName(alumnus.full_name);
      setGradYear(alumnus.graduation_year);
      setProgram(alumnus.program ?? "");
      setDeptId(alumnus.department_id ?? "");
      setEmail(alumnus.email ?? "");
      setPhone(alumnus.phone ?? "");
      setRollNo(alumnus.roll_no ?? "");
      setEmployer(alumnus.current_employer ?? "");
      setDesignation(alumnus.current_designation ?? "");
      setLinkedin(alumnus.linkedin_url ?? "");
      setCity(alumnus.city ?? "");
    } else {
      setFullName(""); setGradYear(thisYear); setProgram(""); setDeptId("");
      setEmail(""); setPhone(""); setRollNo(""); setEmployer("");
      setDesignation(""); setLinkedin(""); setCity("");
    }
  }, [open, mode, alumnus, thisYear]);

  if (!open) return null;

  async function handleSave() {
    if (!fullName.trim()) { setError("Name is required."); return; }
    if (!gradYear || gradYear < 1900) { setError("A valid graduation year is required."); return; }
    setBusy(true);
    setError(null);
    const common = {
      fullName,
      graduationYear: Number(gradYear),
      program: program || null,
      departmentId: deptId || null,
      email: email || null,
      phone: phone || null,
      rollNo: rollNo || null,
      currentEmployer: employer || null,
      currentDesignation: designation || null,
      linkedinUrl: linkedin || null,
      city: city || null,
    };
    const res = mode === "edit" && alumnus
      ? await updateAlumniAdmin({ institutionId, id: alumnus.id, ...common })
      : await createAlumni({ institutionId, ...common });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    router.refresh();
    onClose();
  }

  const inputCls =
    "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500";
  const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-purple-500" />
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
              {mode === "edit" ? "Edit Alumnus" : "Add Alumnus"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <p className="text-[12px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div>
            <label className={labelCls}>Full Name <span className="text-rose-500">*</span></label>
            <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Priya Raman" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Graduation Year <span className="text-rose-500">*</span></label>
              <input type="number" className={inputCls} value={gradYear} onChange={(e) => setGradYear(Number(e.target.value))} min={1900} max={thisYear + 1} />
            </div>
            <div>
              <label className={labelCls}>Programme</label>
              <select className={inputCls} value={program} onChange={(e) => setProgram(e.target.value)}>
                <option value="">—</option>
                <option value="UG">UG</option>
                <option value="PG">PG</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Department</label>
            <select className={inputCls} value={deptId} onChange={(e) => setDeptId(e.target.value)}>
              <option value="">Not assigned</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Roll No</label>
              <input className={inputCls} value={rollNo} onChange={(e) => setRollNo(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="pt-1 border-t border-slate-100 dark:border-slate-800" />

          <div>
            <label className={labelCls}>Current Employer</label>
            <input className={inputCls} value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="e.g. Infosys" />
          </div>
          <div>
            <label className={labelCls}>Designation</label>
            <input className={inputCls} value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Software Engineer" />
          </div>
          <div>
            <label className={labelCls}>LinkedIn URL</label>
            <input className={inputCls} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {busy ? "Saving…" : mode === "edit" ? "Save Changes" : "Add Alumnus"}
          </button>
        </div>
      </div>
    </div>
  );
}
