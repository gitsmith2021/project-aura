"use client";

import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { provisionInstitution } from "@/actions/institutions";

type SessionTypeKey = "NORMAL" | "DAY" | "EVENING";

const SESSION_OPTIONS: { key: SessionTypeKey; label: string; sub: string }[] = [
  { key: "NORMAL", label: "General Shift",  sub: "9 AM – 4 PM" },
  { key: "DAY",    label: "Day Shift 1",    sub: "8:15 AM – 1:15 PM" },
  { key: "EVENING",label: "Evening Shift 2",sub: "1:30 PM – 6:30 PM" },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function AddInstitutionModal({ isOpen, onClose, onSuccess }: Props) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [sessionTypes, setSessionTypes] = useState<SessionTypeKey[]>(["NORMAL"]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setName('');
      setType('');
      setSubdomain('');
      setSessionTypes(["NORMAL"]);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!mounted) return null;

  function toggleSession(key: SessionTypeKey) {
    setSessionTypes(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !type || !subdomain || sessionTypes.length === 0) return;
    setLoading(true);

    // Phase 9C — provision through the server action: creates the institution
    // (is_onboarded=false → onboarding wizard) and auto-starts a 30-day trial.
    const res = await provisionInstitution({
      name, collegeType: type, subdomain, sessionTypes,
    });

    setLoading(false);

    if (!res.success) {
      console.error('Error provisioning institution:', res.error);
      alert('Failed to save institution: ' + res.error);
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
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">Add Institution</h2>
            <p className="text-xs text-slate-500 mt-0.5">Create a new college workspace.</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          <form id="add-college-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="name" className="block text-xs font-medium text-slate-700">College Name</label>
              <input
                type="text" id="name" value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. ABC College of Nursing"
                required
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="type" className="block text-xs font-medium text-slate-700">College Type</label>
              <select
                id="type" value={type}
                onChange={e => setType(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs appearance-none"
              >
                <option value="" disabled>Select type...</option>
                <option value="Arts & Science">Arts &amp; Science</option>
                <option value="Nursing">Nursing</option>
                <option value="Engineering">Engineering</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="subdomain" className="block text-xs font-medium text-slate-700">Subdomain</label>
              <div className="flex items-stretch rounded-md">
                <input
                  type="text" id="subdomain" value={subdomain}
                  onChange={e => setSubdomain(e.target.value)}
                  placeholder="your-preferred-domain-name"
                  required
                  className="flex-1 px-3 py-1.5 bg-white border border-r-0 border-slate-200 rounded-l-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:z-10 transition-colors text-xs"
                />
                <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-r-md text-slate-500 text-xs flex items-center">.aura.edu</span>
              </div>
            </div>

            {/* Session Types */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                College Session Types
                <span className="ml-1 text-slate-400 font-normal">(select all that apply)</span>
              </label>
              <div className="space-y-2">
                {SESSION_OPTIONS.map(({ key, label, sub }) => {
                  const checked = sessionTypes.includes(key);
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        checked
                          ? "bg-violet-50 border-violet-300"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSession(key)}
                        className="w-3.5 h-3.5 rounded accent-violet-600 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className={`text-xs font-medium leading-tight ${checked ? "text-violet-800" : "text-slate-700"}`}>{label}</p>
                        <p className="text-[10px] text-slate-400 leading-tight">{sub}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              {sessionTypes.length === 0 && (
                <p className="text-[10px] text-red-500">Select at least one session type.</p>
              )}
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors">
            Cancel
          </button>
          <button type="submit" form="add-college-form" disabled={loading || sessionTypes.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 border border-purple-700 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
            {loading && <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
