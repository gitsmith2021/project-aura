"use client";

import { X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { fundingTypeShortLabel } from "@/lib/deptFunding";
import { studentProgramLabel, yearOptionsForProgram, type StudentProgram } from "@/lib/studentProgram";
import { STAFF_TYPES, STAFF_TYPE_LABELS, isDailyWage, type StaffType } from "@/lib/staffTypes";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** When opening from Staff vs Students page */
  defaultRole?: "STAFF" | "STUDENT";
  /** Pre-select the active institution tab */
  defaultTenantId?: string;
  /** Pre-select a department (e.g. from cohort grid selection) */
  defaultDepartmentId?: string;
  /** Pre-select program (UG/PG) */
  defaultProgram?: StudentProgram;
  /** Pre-select study year */
  defaultYear?: number;
};

export function AddPersonModal({
  isOpen,
  onClose,
  onSuccess,
  defaultRole = "STAFF",
  defaultTenantId,
  defaultDepartmentId,
  defaultProgram,
  defaultYear,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'STAFF' | 'STUDENT'>('STAFF');
  const [tenantId, setTenantId] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const [tenants, setTenants] = useState<{id: string, name: string, email_domain?: string | null}[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; funding_type?: string | null }[]>([]);

  const [phone, setPhone] = useState('');
  const [staffType, setStaffType] = useState<StaffType>("teaching");
  const [dailyWageRate, setDailyWageRate] = useState<string>("");
  const [studentProgram, setStudentProgram] = useState<StudentProgram>("UG");
  const [studentYear, setStudentYear] = useState(1);
  const [loading, setLoading] = useState(false);

  // Holds the dept id to restore after async dept fetch completes
  const pendingDeptRef = useRef<string>("");

  const fetchTenants = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('institutions').select('id, name, email_domain').order('name');
    if (data) setTenants(data);
  };

  useEffect(() => {
    setMounted(true);
    fetchTenants();
  }, []);

  function buildEmailLocal(name: string): string {
    const words = name.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const first = words[0] ?? "";
    const last = words.length > 1 ? words[words.length - 1] : "";
    return last ? `${first}.${last}` : first;
  }

  const emailDomain = tenants.find(t => t.id === tenantId)?.email_domain ?? null;

  function emailPreview(): string {
    if (!emailDomain) return "";
    if (role === "STAFF") {
      const local = buildEmailLocal(fullName);
      return local ? `${local}@${emailDomain}` : "";
    }
    return `[roll-no]@${emailDomain}`;
  }

  useEffect(() => {
    if (tenantId) {
      const fetchDepts = async () => {
        const supabase = createClient();
        const { data } = await supabase
          .from('departments')
          .select('id, name, funding_type')
          .eq('institution_id', tenantId)
          .order('name');
        if (data) {
          setDepartments(data);
          // Restore the pending default dept (set before async fetch ran)
          if (pendingDeptRef.current) {
            setDepartmentId(pendingDeptRef.current);
            pendingDeptRef.current = "";
          } else {
            setDepartmentId('');
          }
        }
      };
      fetchDepts();
    } else {
      setDepartments([]);
      setDepartmentId('');
    }
  }, [tenantId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setFullName('');
      setPhone('');
      setStaffType("teaching");
      setDailyWageRate("");
      setRole(defaultRole);

      // Store pending dept before setting tenantId (which triggers async dept load)
      pendingDeptRef.current = defaultDepartmentId || '';

      setTenantId(defaultTenantId || '');
      setStudentProgram(defaultProgram || "UG");
      setStudentYear(defaultYear ?? 1);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen, defaultRole, defaultTenantId, defaultDepartmentId, defaultProgram, defaultYear]);

  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !tenantId || !departmentId) return;
    setLoading(true);

    const supabase = createClient();
    const domain = tenants.find(t => t.id === tenantId)?.email_domain ?? null;
    const targetTable = role === "STAFF" ? "staff" : "students";
    const row: Record<string, unknown> = {
      full_name: fullName,
      phone: phone.trim() || null,
      institution_id: tenantId,
      department_id: departmentId,
      student_program: role === "STUDENT" ? studentProgram : null,
      student_year: role === "STUDENT" ? studentYear : null,
    };

    if (role === "STAFF") {
      row.email = domain ? `${buildEmailLocal(fullName)}@${domain}` : null;
      row.staff_type = staffType;
      if (isDailyWage(staffType) && dailyWageRate) {
        row.daily_wage_rate = parseFloat(dailyWageRate);
      }
    }

    if (role === "STUDENT") {
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', tenantId)
        .eq('department_id', departmentId)
        .eq('student_program', studentProgram)
        .eq('student_year', studentYear);

      const currentCount = (count || 0) + 1;

      const dept = departments.find(d => d.id === departmentId);
      const program = studentProgram || "XX";
      const fundingRaw = dept?.funding_type;
      const funding = fundingRaw === "AIDED" ? "A" : fundingRaw === "SF" ? "SF" : "XX";

      const deptName = dept?.name || "";
      let deptPrefix = "XX";
      if (deptName) {
        const words = deptName.split(/[\s-]+/);
        if (words.length > 1) {
          deptPrefix = words.map(w => w[0].toUpperCase()).join("");
        } else {
          deptPrefix = deptName.substring(0, 2).toUpperCase();
        }
      }

      const idxStr = String(currentCount).padStart(3, "0");
      const rollNo = `${program}-${funding}-${deptPrefix}-${idxStr}`;
      row.roll_no = rollNo;
      row.email = domain ? `${rollNo.toLowerCase().replace(/-/g, "")}@${domain}` : null;
    }

    const { error } = await supabase.from(targetTable).insert([row]);

    setLoading(false);

    if (error) {
      console.error('Error inserting person:', error.code, error.message, error.details, error.hint);
      alert('Failed to save person: ' + (error.message || error.code || JSON.stringify(error)));
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-200 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        className={`fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      <div className={`relative w-full max-w-sm h-full bg-white flex flex-col transform transition-transform duration-300 ease-out border-l border-slate-200 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white">
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">Add Person</h2>
            <p className="text-xs text-slate-500 mt-0.5">Register a new staff or student.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          <form id="add-person-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="John Doe"
                required
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs"
              />
            </div>

            {tenantId && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Email
                  <span className="ml-1 text-slate-400 font-normal">(auto-generated)</span>
                </label>
                {emailDomain ? (
                  <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-500 font-mono truncate">
                    {emailPreview() || <span className="text-slate-300 italic">type a name above…</span>}
                  </div>
                ) : (
                  <div className="px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-[10px] text-amber-700 leading-snug">
                    No email domain set for this institution. Open Institution Settings → Edit to add one (e.g. <span className="font-mono">heber.ac.in</span>).
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Phone <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Role</label>
              <select
                value={role}
                onChange={e => {
                  const r = e.target.value as 'STAFF' | 'STUDENT';
                  setRole(r);
                  if (r === 'STAFF') {
                    setStudentProgram('UG');
                    setStudentYear(1);
                  }
                }}
                required
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs appearance-none"
              >
                <option value="STAFF">Staff</option>
                <option value="STUDENT">Student</option>
              </select>
            </div>

            {role === "STAFF" && (
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

            {role === "STUDENT" && (
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
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Institution</label>
              <select
                value={tenantId}
                onChange={e => {
                  pendingDeptRef.current = "";
                  setTenantId(e.target.value);
                }}
                required
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs appearance-none"
              >
                <option value="" disabled>Select institution...</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Department</label>
              <select
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value)}
                required
                disabled={!tenantId || departments.length === 0}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs appearance-none disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="" disabled>
                  {!tenantId ? 'Select an institution first...' : departments.length === 0 ? 'No departments available' : 'Select department...'}
                </option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({fundingTypeShortLabel(d.funding_type)})
                  </option>
                ))}
              </select>
            </div>
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
            form="add-person-form"
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 border border-purple-700 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span> : null}
            Add Person
          </button>
        </div>
      </div>
    </div>
  );
}
