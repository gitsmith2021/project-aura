"use client";

import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { fundingTypeShortLabel } from "@/lib/deptFunding";
import { studentProgramLabel, yearOptionsForProgram, type StudentProgram } from "@/lib/studentProgram";

export type PersonEditPayload = {
  id: string;
  full_name: string;
  role: "STAFF" | "STUDENT";
  tenant_id: string;
  department_id: string;
  email?: string | null;
  phone?: string | null;
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
  const [studentProgram, setStudentProgram] = useState<StudentProgram>("UG");
  const [studentYear, setStudentYear] = useState<number>(1);
  const [departments, setDepartments] = useState<{ id: string; name: string; funding_type?: string | null }[]>([]);
  const [tenantName, setTenantName] = useState("");
  const [loading, setLoading] = useState(false);

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
    setStudentProgram(person.student_program ?? "UG");
    setStudentYear(
      person.student_year ?? 1
    );

    const supabase = createClient();
    supabase
      .from("departments")
      .select("id, name, funding_type")
      .eq("tenant_id", person.tenant_id)
      .order("name")
      .then(({ data }) => {
        if (data) setDepartments(data);
      });
    supabase
      .from("tenants")
      .select("name")
      .eq("id", person.tenant_id)
      .single()
      .then(({ data }) => {
        if (data?.name) setTenantName(data.name);
      });

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, person]);

  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!person || !fullName.trim() || !departmentId) return;
    setLoading(true);

    const supabase = createClient();
    const base = {
      full_name: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      department_id: departmentId,
    };
    const studentPatch =
      person.role === "STUDENT"
        ? { student_program: studentProgram, student_year: studentYear }
        : { student_program: null, student_year: null };

    const { error } = await supabase
      .from("profiles")
      .update({ ...base, ...studentPatch })
      .eq("id", person.id)
      .eq("tenant_id", person.tenant_id);

    setLoading(false);

    if (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update person: " + error.message);
    } else {
      onSuccess();
      onClose();
    }
  };

  if (!person) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-200 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
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
              <label className="block text-xs font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="optional"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs"
              />
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
