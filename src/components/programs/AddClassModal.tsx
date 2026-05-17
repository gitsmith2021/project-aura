"use client";

import { X, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { fundingTypeShortLabel } from "@/lib/deptFunding";

type Department = { id: string; name: string; institution_id: string; funding_type?: string | null };
type StaffMember = { id: string; full_name: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDepartmentId?: string;
  defaultDay?: string;
  defaultStartTime?: string;
  tenantId?: string;  // ← scope all lookups to this institution
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
];

export function AddClassModal({ isOpen, onClose, onSuccess, defaultDepartmentId, defaultDay, defaultStartTime, tenantId }: Props) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  const [departmentId, setDepartmentId] = useState(defaultDepartmentId || "");
  const [subjectName, setSubjectName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [day, setDay] = useState("Monday");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen) return;
    const supabase = createClient();

    // Reset form
    setDepartmentId(defaultDepartmentId || "");
    setSubjectName("");
    setStaffId("");
    setDay(defaultDay || "Monday");
    setStartTime(defaultStartTime || "08:00");
    setEndTime(defaultStartTime ? `${String(parseInt(defaultStartTime) + 1).padStart(2, "0")}:00` : "09:00");

    document.body.style.overflow = "hidden";

    // Fetch departments scoped to this institution
    const deptQuery = supabase.from("departments").select("id, name, institution_id, funding_type").order("name");
    if (tenantId) deptQuery.eq("institution_id", tenantId);
    deptQuery.then(({ data }) => {
      if (data) setDepartments(data as Department[]);
    });

    // Fetch STAFF scoped to this institution only
    const staffQuery = supabase.from("staff").select("id, full_name").order("full_name");
    if (tenantId) staffQuery.eq("institution_id", tenantId);
    staffQuery.then(({ data }) => {
      if (data) setStaffList(data as StaffMember[]);
    });

    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen, defaultDepartmentId, tenantId]);

  if (!mounted) return null;

  const selectedDept = departments.find((d) => d.id === departmentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId || !subjectName.trim() || !staffId || !day || !startTime || !endTime) return;
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from("schedules").insert([
      {
        department_id: departmentId,
        tenant_id: selectedDept?.institution_id ?? null,
        subject_name: subjectName.trim(),
        staff_id: staffId,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
      },
    ]);

    setLoading(false);
    if (error) {
      console.error("Error inserting schedule:", error);
      alert("Failed to save class: " + error.message);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-200 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className={`relative w-full max-w-sm h-full bg-white flex flex-col transform transition-transform duration-300 ease-out border-l border-slate-200 shadow-xl ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-violet-100 flex items-center justify-center">
              <BookOpen size={15} className="text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Add Class</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Schedule a class on the timetable.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          <form id="add-class-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Department */}
            <div className="space-y-1">
              <label htmlFor="cls_dept" className="block text-xs font-medium text-slate-700">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                id="cls_dept"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors text-xs appearance-none"
              >
                <option value="" disabled>Select department...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({fundingTypeShortLabel(d.funding_type)})
                  </option>
                ))}
              </select>
            </div>

            {/* Subject — free-text input matching your existing schema */}
            <div className="space-y-1">
              <label htmlFor="cls_subject" className="block text-xs font-medium text-slate-700">
                Subject Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="cls_subject"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                required
                placeholder="e.g. Anatomy, Pharmacology..."
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors text-xs"
              />
            </div>

            {/* Staff */}
            <div className="space-y-1">
              <label htmlFor="cls_staff" className="block text-xs font-medium text-slate-700">
                Staff Member <span className="text-red-500">*</span>
              </label>
              <select
                id="cls_staff"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors text-xs appearance-none"
              >
                <option value="" disabled>Select staff member...</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
              {staffList.length === 0 && (
                <p className="text-[10px] text-amber-600 mt-1">No staff members found. Add staff in Users &amp; Roles first.</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200 pt-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Schedule</p>
            </div>

            {/* Day */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                Day <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDay(d)}
                    className={`py-1.5 rounded-md text-[11px] font-medium border transition-colors ${
                      day === d
                        ? "bg-violet-600 text-white border-violet-700"
                        : "bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-700"
                    }`}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="cls_start" className="block text-xs font-medium text-slate-700">Start Time</label>
                <select
                  id="cls_start"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors text-xs appearance-none"
                >
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="cls_end" className="block text-xs font-medium text-slate-700">End Time</label>
                <select
                  id="cls_end"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors text-xs appearance-none"
                >
                  {TIME_SLOTS.filter((t) => t > startTime).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
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
            form="add-class-form"
            disabled={loading}
            className="px-4 py-1.5 text-xs font-medium text-white bg-violet-600 border border-violet-700 rounded-md hover:bg-violet-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : null}
            Schedule Class
          </button>
        </div>
      </div>
    </div>
  );
}
