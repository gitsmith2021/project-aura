"use client";

import { X, ShieldCheck, Loader2, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  updatePersonProfile, getStaffMembershipRole, setStaffMembershipRole,
  type GovernanceRole,
} from "@/actions/user";
import { fundingTypeShortLabel } from "@/lib/deptFunding";
import { studentProgramLabel, yearOptionsForProgram, type StudentProgram } from "@/lib/studentProgram";
import { STAFF_TYPES, STAFF_TYPE_LABELS, isDailyWage, type StaffType } from "@/lib/staffTypes";

// Roles assignable from this screen. HOD is department-driven; Super Admin is platform-level.
const GOVERNANCE_OPTIONS: { value: GovernanceRole; label: string; hint: string }[] = [
  { value: "STAFF",      label: "Staff",     hint: "Teaching / self-service portal only" },
  { value: "PRINCIPAL",  label: "Principal", hint: "Institution-wide leadership access" },
  { value: "INST_ADMIN", label: "Admin",     hint: "Full institution administration" },
];

function viewerCanManageRoles(): boolean {
  if (typeof document === "undefined") return false;
  const c = document.cookie.split("; ").find((x) => x.startsWith("aura-role-label="));
  const label = c ? decodeURIComponent(c.split("=")[1] ?? "") : "";
  return label === "Admin" || label === "Principal" || label === "Super Admin";
}

export type PersonEditPayload = {
  id: string;
  full_name: string;
  role: "STAFF" | "STUDENT";
  institution_id: string;
  department_id: string;
  email?: string | null;
  phone?: string | null;
  staff_type?: StaffType | null;
  daily_wage_rate?: number | null;
  student_program?: StudentProgram | null;
  student_year?: number | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  person: PersonEditPayload | null;
};

export function EditPersonModal({ isOpen, onClose, onSuccess, person }: Props) {
  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [staffType, setStaffType] = useState<StaffType>("teaching");
  const [dailyWageRate, setDailyWageRate] = useState<string>("");
  const [studentProgram, setStudentProgram] = useState<StudentProgram>("UG");
  const [studentYear, setStudentYear] = useState<number>(1);
  const [departments, setDepartments] = useState<{ id: string; name: string; funding_type?: string | null }[]>([]);
  const [tenantName, setTenantName] = useState("");
  const [loading, setLoading] = useState(false);

  // Governance role (staff only)
  const [canManageRoles, setCanManageRoles] = useState(false);
  const [govRole, setGovRole] = useState<GovernanceRole | null>(null);
  const [govCurrent, setGovCurrent] = useState<string | null>(null);
  const [govLocked, setGovLocked] = useState<string | null>(null); // e.g. "HOD" — managed elsewhere
  const [govNoLogin, setGovNoLogin] = useState(false);
  const [govSaving, setGovSaving] = useState(false);
  const [govSaved, setGovSaved] = useState(false);
  const [govError, setGovError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !person) return;

    document.body.style.overflow = "hidden";
    setFullName(person.full_name);
    setEmail(person.email ?? "");
    setPhone(person.phone ?? "");
    setDepartmentId(person.department_id);
    setStaffType(person.staff_type ?? "teaching");
    setDailyWageRate(person.daily_wage_rate != null ? String(person.daily_wage_rate) : "");
    setStudentProgram(person.student_program ?? "UG");
    setStudentYear(
      person.student_year ?? 1
    );

    const supabase = createClient();
    supabase
      .from("departments")
      .select("id, name, funding_type")
      .eq("institution_id", person.institution_id)
      .order("name")
      .then(({ data }) => {
        if (data) setDepartments(data);
      });
    supabase
      .from("institutions")
      .select("name")
      .eq("id", person.institution_id)
      .single()
      .then(({ data }) => {
        if (data?.name) setTenantName(data.name);
      });

    // Governance role: only for staff, only for admin/principal viewers
    setGovSaved(false);
    setGovError(null);
    setGovLocked(null);
    setGovNoLogin(false);
    const manage = person.role === "STAFF" && viewerCanManageRoles();
    setCanManageRoles(manage);
    if (manage) {
      getStaffMembershipRole(person.id).then((res) => {
        if (!res.success) { setGovError(res.error); return; }
        if (!res.hasLogin) { setGovNoLogin(true); return; }
        if (res.role === "HOD" || res.role === "DEPARTMENT_HEAD") { setGovLocked("HOD"); return; }
        if (res.role === "SUPER_ADMIN") { setGovLocked("Super Admin"); return; }
        setGovCurrent(res.role);
        setGovRole((res.role as GovernanceRole) ?? "STAFF");
      });
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, person]);

  const handleSaveRole = async () => {
    if (!person || !govRole) return;
    setGovSaving(true);
    setGovError(null);
    const res = await setStaffMembershipRole({
      staffId: person.id,
      institutionId: person.institution_id,
      role: govRole,
    });
    setGovSaving(false);
    if (!res.success) { setGovError(res.error); return; }
    setGovCurrent(govRole);
    setGovSaved(true);
  };

  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!person || !fullName.trim() || !departmentId) return;
    setLoading(true);

    const result = await updatePersonProfile({
      id: person.id,
      role: person.role,
      institution_id: person.institution_id,
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      department_id: departmentId,
      ...(person.role === "STAFF" && {
        staff_type: staffType,
        daily_wage_rate: isDailyWage(staffType) && dailyWageRate ? parseFloat(dailyWageRate) : null,
      }),
      student_program: person.role === "STUDENT" ? studentProgram : null,
      student_year: person.role === "STUDENT" ? studentYear : null,
    });

    setLoading(false);

    if (!result.success) {
      console.error("Error updating profile:", result.error);
      alert("Failed to update person: " + result.error);
    } else {
      onSuccess();
      onClose();
    }
  };

  if (!person) return null;

  return (
    <div
      className={`fixed inset-0 z-[70] flex justify-end transition-opacity duration-200 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      <div
        className={`fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-sm h-full bg-white flex flex-col transform transition-transform duration-300 ease-out border-l border-slate-200 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white">
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">Edit Person</h2>
            <p className="text-xs text-slate-500 mt-0.5">Update profile details.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          <form id="edit-person-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600 space-y-1">
              <p>
                <span className="font-semibold text-slate-700">Role:</span>{" "}
                {person.role === "STAFF" ? "Staff" : "Student"}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Institution:</span> {tenantName || "—"}
              </p>
            </div>

            {canManageRoles && (
              <div className="rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-2.5 space-y-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-violet-600" />
                  <span className="text-xs font-semibold text-slate-700">Institution Role</span>
                </div>
                {govNoLogin ? (
                  <p className="text-[11px] text-amber-600">
                    No login account yet — enable portal access to assign a role.
                  </p>
                ) : govLocked ? (
                  <p className="text-[11px] text-slate-500">
                    Current role: <strong>{govLocked}</strong>.{" "}
                    {govLocked === "HOD" ? "Manage from the Departments page." : "Managed at platform level."}
                  </p>
                ) : (
                  <>
                    <select
                      value={govRole ?? "STAFF"}
                      onChange={(e) => { setGovRole(e.target.value as GovernanceRole); setGovSaved(false); }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-xs appearance-none"
                    >
                      {GOVERNANCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400">
                      {GOVERNANCE_OPTIONS.find((o) => o.value === govRole)?.hint}
                    </p>
                    {govError && <p className="text-[10px] text-rose-500">{govError}</p>}
                    <button
                      type="button"
                      onClick={handleSaveRole}
                      disabled={govSaving || govRole === govCurrent}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white transition-colors"
                    >
                      {govSaving ? <Loader2 size={11} className="animate-spin" /> : govSaved ? <Check size={11} /> : <ShieldCheck size={11} />}
                      {govSaved && govRole === govCurrent ? "Role updated" : "Update role"}
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Email
                <span className="ml-1 text-slate-400 font-normal">(login credential — read only)</span>
              </label>
              <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-550 font-mono truncate dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
                {email || "—"}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="optional"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs appearance-none"
              >
                {departments.length === 0 ? (
                  <option value="">No departments</option>
                ) : (
                  departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({fundingTypeShortLabel(d.funding_type)})
                    </option>
                  ))
                )}
              </select>
            </div>

            {person.role === "STAFF" && (
              <>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Staff Type</label>
                  <select
                    value={staffType}
                    onChange={(e) => { setStaffType(e.target.value as StaffType); setDailyWageRate(""); }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs appearance-none"
                  >
                    {STAFF_TYPES.map((t) => (
                      <option key={t} value={t}>{STAFF_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>

                {isDailyWage(staffType) && (
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">Daily Wage Rate (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={dailyWageRate}
                      onChange={(e) => setDailyWageRate(e.target.value)}
                      placeholder="e.g. 450.00"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs"
                    />
                    <p className="text-[10px] text-slate-400">Amount paid per working day actually attended</p>
                  </div>
                )}
              </>
            )}

            {person.role === "STUDENT" && (
              <>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Program</label>
                  <select
                    value={studentProgram}
                    onChange={(e) => {
                      const p = e.target.value as StudentProgram;
                      setStudentProgram(p);
                      const opts = yearOptionsForProgram(p);
                      setStudentYear((y) => (opts.includes(y) ? y : opts[0]));
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs appearance-none"
                  >
                    <option value="UG">{studentProgramLabel("UG")}</option>
                    <option value="PG">{studentProgramLabel("PG")}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Study year</label>
                  <select
                    value={studentYear}
                    onChange={(e) => setStudentYear(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs appearance-none"
                  >
                    {yearOptionsForProgram(studentProgram).map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </form>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-person-form"
            disabled={loading || departments.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 border border-purple-700 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : null}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
