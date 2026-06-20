"use client";

import { useState, useCallback } from "react";
import { X, Search, Upload } from "lucide-react";
import { addParticipant, searchStudentsForEvent, type StudentSearchResult } from "@/actions/campusEvents";
import { PARTICIPANT_ROLES, PARTICIPANT_ROLE_LABEL, type ParticipantRole } from "@/lib/campusEvents";

type Props = {
  eventId: string;
  institutionId: string;
  onClose: () => void;
  onSaved: () => void;
};

export function ParticipantDrawer({ eventId, institutionId, onClose }: Props) {
  const [role, setRole] = useState<ParticipantRole>("participant");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<StudentSearchResult[]>([]);
  const [selected, setSelected] = useState<StudentSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    setSelected(null);
    if (q.trim().length < 2) { setOptions([]); return; }
    setSearching(true);
    const res = await searchStudentsForEvent(institutionId, q);
    setSearching(false);
    setOptions(res.success ? res.data : []);
  }, [institutionId]);

  const handleAdd = async () => {
    if (!selected) { setError("Please select a student."); return; }
    setBusy(true); setError(null); setSuccess(null);
    const res = await addParticipant(eventId, selected.id, role, institutionId);
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setSuccess(`${selected.full_name} added as ${PARTICIPANT_ROLE_LABEL[role]}.`);
    setSelected(null);
    setQuery("");
    setOptions([]);
  };

  const inputCls = "w-full h-8 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500";
  const labelCls = "block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1";

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-50 w-full max-w-md bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Add Participant</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Role selector */}
          <div>
            <label className={labelCls}>Role</label>
            <div className="flex flex-wrap gap-1.5">
              {PARTICIPANT_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                    role === r
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {PARTICIPANT_ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>

          {/* Student search */}
          <div>
            <label className={labelCls}>Student <span className="text-red-500">*</span></label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => search(e.target.value)}
                placeholder="Search by name or roll number…"
                className={`${inputCls} pl-7`}
              />
              {options.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-10 mt-1 max-h-48 overflow-y-auto">
                  {options.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setSelected(s); setQuery(s.full_name); setOptions([]); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center gap-2"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-100">{s.full_name}</span>
                      {s.roll_no && <span className="text-slate-400">· {s.roll_no}</span>}
                    </button>
                  ))}
                </div>
              )}
              {searching && <p className="text-[10px] text-slate-400 mt-1">Searching…</p>}
            </div>
            {selected && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">✓ {selected.full_name}</p>
            )}
          </div>

          {/* Feedback */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg px-3 py-2">{success}</p>
          )}

          {/* Info */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              <Upload size={12} /> <span className="font-semibold">Bulk Import</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              For large rosters, prepare a CSV with one roll number per line and use the bulk import option from the participants table toolbar.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">Done</button>
          <button onClick={handleAdd} disabled={busy || !selected} className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {busy ? "Adding…" : "Add Participant"}
          </button>
        </div>
      </aside>
    </div>
  );
}
