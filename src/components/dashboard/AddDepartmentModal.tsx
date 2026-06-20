"use client";

import { X } from "lucide-react";
import { useState, useEffect, createElement } from "react";
import { createClient } from "@/utils/supabase/client";
import { getDeptColor, DEPT_COLOR_PALETTE, randomDeptColorKey } from "@/lib/deptColors";
import { getDeptIcon } from "@/lib/deptIcons";
import { normalizeFundingType, type DepartmentFundingType } from "@/lib/deptFunding";

export type DepartmentEditPayload = {
  id: string;
  name: string;
  session_type: string | null;
  funding_type: string | null;
  color: string | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onSuccess: () => void;
  /** When set, updates this department instead of creating a new one */
  departmentToEdit?: DepartmentEditPayload | null;
  /** Session types the institution supports. If only one, locks the field. */
  allowedSessionTypes?: string[];
};

const SESSION_LABELS: Record<string, string> = {
  NORMAL: "General Shift (9 AM – 4 PM)",
  DAY:    "Day Shift 1 (8:15 AM – 1:15 PM)",
  EVENING:"Evening Shift 2 (1:30 PM – 6:30 PM)",
};

export function AddDepartmentModal({
  isOpen,
  onClose,
  tenantId,
  onSuccess,
  departmentToEdit = null,
  allowedSessionTypes,
}: Props) {
  const singleShift = allowedSessionTypes?.length === 1 ? allowedSessionTypes[0] : null;
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [sessionType, setSessionType] = useState<'NORMAL' | 'DAY' | 'EVENING'>('NORMAL');
  const [fundingType, setFundingType] = useState<DepartmentFundingType>('AIDED');
  const [color, setColor] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (departmentToEdit) {
        setName(departmentToEdit.name);
        const st = departmentToEdit.session_type;
        setSessionType(
          singleShift as 'NORMAL' | 'DAY' | 'EVENING'
          ?? (st === "DAY" || st === "EVENING" ? st : "NORMAL")
        );
        setFundingType(normalizeFundingType(departmentToEdit.funding_type));
        setColor(departmentToEdit.color || randomDeptColorKey());
      } else {
        setName("");
        setSessionType((singleShift as 'NORMAL' | 'DAY' | 'EVENING') ?? "NORMAL");
        setFundingType("AIDED");
        setColor(randomDeptColorKey());
      }
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- (re)initialise the form only when the modal opens or its target changes
  }, [isOpen, departmentToEdit]);

  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);

    const supabase = createClient();
    const error = departmentToEdit
      ? (
          await supabase
            .from("departments")
            .update({ name, session_type: sessionType, funding_type: fundingType, color })
            .eq("id", departmentToEdit.id)
            .eq("institution_id", tenantId)
        ).error
      : (
          await supabase.from("departments").insert([
            {
              name,
              institution_id: tenantId,
              color,
              session_type: sessionType,
              funding_type: fundingType,
            },
          ])
        ).error;

    setLoading(false);

    if (error) {
      console.error("Error saving department:", error);
      alert("Failed to save department: " + error.message);
    } else {
      onSuccess();
      onClose();
    }
  };

  const isEdit = Boolean(departmentToEdit);
  const Icon = getDeptIcon(name);
  const activeColorTone = getDeptColor(color);

  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-200 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div 
        className={`fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose}
      />
      
      <div className={`relative w-full max-w-sm h-full bg-white flex flex-col transform transition-transform duration-300 ease-out border-l border-slate-200 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white">
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              {isEdit ? "Edit Department" : "Add Department"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit ? "Update department details." : "Create a new department for this college."}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          <form id={isEdit ? "edit-dept-form" : "add-dept-form"} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="dept_name" className="block text-xs font-medium text-slate-700">
                Department Name
              </label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border"
                  style={{ 
                    backgroundColor: activeColorTone.bg, 
                    borderColor: activeColorTone.border,
                    color: activeColorTone.hex
                  }}
                  title="Dynamic icon based on department name"
                >
                  {createElement(Icon, { size: 20, strokeWidth: 2.5 })}
                </div>
                <input 
                  type="text" 
                  id="dept_name" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Anatomy" 
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-medium text-slate-700">
                Department Color
              </label>
              <div className="flex flex-wrap gap-2">
                {DEPT_COLOR_PALETTE.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setColor(p.key)}
                    className={`w-6 h-6 rounded-full border transition-transform ${color === p.key ? 'scale-110 ring-2 ring-offset-1' : 'hover:scale-110'}`}
                    style={{
                      background: `linear-gradient(135deg, ${p.bg}, ${p.bg2})`,
                      borderColor: p.border,
                      "--tw-ring-color": p.hex
                    } as React.CSSProperties}
                    title={p.key}
                    aria-label={`Select ${p.key} color`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="dept_session_type" className="block text-xs font-medium text-slate-700">
                College Session Type
              </label>
              {singleShift ? (
                <div className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-500 cursor-not-allowed">
                  {SESSION_LABELS[singleShift] ?? singleShift}
                </div>
              ) : (
                <select
                  id="dept_session_type"
                  value={sessionType}
                  onChange={e => setSessionType(e.target.value as 'NORMAL' | 'DAY' | 'EVENING')}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs"
                >
                  {(allowedSessionTypes ?? ["NORMAL", "DAY", "EVENING"]).map(key => (
                    <option key={key} value={key}>{SESSION_LABELS[key] ?? key}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="dept_funding_type" className="block text-xs font-medium text-slate-700">
                Funding
              </label>
              <select
                id="dept_funding_type"
                value={fundingType}
                onChange={e => setFundingType(e.target.value as DepartmentFundingType)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs"
              >
                <option value="AIDED">Aided</option>
                <option value="SELF_FINANCING">Self-Financing</option>
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
            form={isEdit ? "edit-dept-form" : "add-dept-form"}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 border border-purple-700 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span> : null}
            {isEdit ? "Save changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
