"use client";

import { useState, useCallback } from "react";
import { X, Search, Trash2, UserPlus } from "lucide-react";
import {
  addTeam,
  addTeamMember,
  removeTeamMember,
  getTeamMembers,
  searchStudentsForSports,
  type TeamMember,
  type StudentOption,
} from "@/actions/sports";
import { TEAM_CATEGORIES, TEAM_CATEGORY_LABEL, type TeamCategory } from "@/lib/sports";

type AcademicYearOption = { id: string; label: string };
type CoachOption = { id: string; full_name: string; title: string | null };

type Props = {
  institutionId: string;
  coaches: CoachOption[];
  academicYears: AcademicYearOption[];
  onClose: () => void;
  onSaved: (newTeamId?: string) => void;
};

export function TeamDrawer({ institutionId, coaches, academicYears, onClose, onSaved }: Props) {
  // Step 1: create team
  const [sportName, setSportName] = useState("");
  const [category, setCategory] = useState<TeamCategory>("men");
  const [coachId, setCoachId] = useState("");
  const [academicYearId, setAcademicYearId] = useState(academicYears[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2: manage roster (after team created)
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberOptions, setMemberOptions] = useState<StudentOption[]>([]);
  const [selectedMember, setSelectedMember] = useState<StudentOption | null>(null);
  const [memberPosition, setMemberPosition] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleCreateTeam = async () => {
    if (!sportName.trim()) { setError("Sport name is required."); return; }
    setBusy(true); setError(null);
    const res = await addTeam({
      institutionId,
      sportName,
      teamCategory: category,
      coachId: coachId || undefined,
      academicYearId: academicYearId || undefined,
    });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setCreatedTeamId(res.data.id);
    setMembers([]);
  };

  const searchMembers = useCallback(async (q: string) => {
    setMemberQuery(q);
    setSelectedMember(null);
    if (q.trim().length < 2) { setMemberOptions([]); return; }
    setSearching(true);
    const res = await searchStudentsForSports(institutionId, q);
    setSearching(false);
    setMemberOptions(res.success ? res.data : []);
  }, [institutionId]);

  const handleAddMember = async () => {
    if (!selectedMember || !createdTeamId) return;
    setAddingMember(true);
    const res = await addTeamMember({
      teamId: createdTeamId,
      studentId: selectedMember.id,
      position: memberPosition || undefined,
      institutionId,
    });
    setAddingMember(false);
    if (!res.success) { setError(res.error); return; }
    const rosterRes = await getTeamMembers(createdTeamId);
    if (rosterRes.success) setMembers(rosterRes.data);
    setSelectedMember(null);
    setMemberQuery("");
    setMemberPosition("");
  };

  const handleRemoveMember = async (memberId: string) => {
    const res = await removeTeamMember(memberId, institutionId);
    if (res.success) setMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const inputCls = "w-full h-8 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500";
  const labelCls = "block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1";

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-50 w-full max-w-md bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {createdTeamId ? "Manage Roster" : "Add Sports Team"}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!createdTeamId ? (
            /* ── Step 1: Team details ── */
            <>
              <div>
                <label className={labelCls}>Sport Name <span className="text-red-500">*</span></label>
                <input value={sportName} onChange={(e) => setSportName(e.target.value)} placeholder="e.g. Cricket, Kabaddi, Athletics" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Category</label>
                <div className="flex gap-2">
                  {TEAM_CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                        category === c
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      {TEAM_CATEGORY_LABEL[c]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Coach (optional)</label>
                <select value={coachId} onChange={(e) => setCoachId(e.target.value)} className={inputCls}>
                  <option value="">— None —</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title ? `${c.title} ` : ""}{c.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Academic Year</label>
                <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} className={inputCls}>
                  <option value="">— None —</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>{y.label}</option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
              )}
            </>
          ) : (
            /* ── Step 2: Roster management ── */
            <>
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 px-4 py-2.5">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">✓ Team created — now add players to the roster.</p>
              </div>

              {/* Add member */}
              <div>
                <label className={labelCls}>Add Player</label>
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    value={memberQuery}
                    onChange={(e) => searchMembers(e.target.value)}
                    placeholder="Search student by name or roll no…"
                    className={`${inputCls} pl-7`}
                  />
                  {memberOptions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-10 mt-1 max-h-40 overflow-y-auto">
                      {memberOptions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => { setSelectedMember(s); setMemberQuery(s.full_name); setMemberOptions([]); }}
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
                <div className="flex gap-2">
                  <input value={memberPosition} onChange={(e) => setMemberPosition(e.target.value)} placeholder="Position (Captain, Bowler…)" className="flex-1 h-7 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200" />
                  <button
                    type="button"
                    onClick={handleAddMember}
                    disabled={!selectedMember || addingMember}
                    className="h-7 px-3 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    <UserPlus size={11} /> Add
                  </button>
                </div>
                {error && (
                  <p className="text-xs text-red-600 mt-2">{error}</p>
                )}
              </div>

              {/* Roster list */}
              <div>
                <p className={labelCls}>Current Roster ({members.length})</p>
                {members.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No players added yet.</p>
                ) : (
                  <div className="space-y-1">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                        <div>
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-100">{m.student?.full_name ?? "—"}</p>
                          <p className="text-[10px] text-slate-400">{m.student?.roll_no}{m.position ? ` · ${m.position}` : ""}</p>
                        </div>
                        <button type="button" onClick={() => handleRemoveMember(m.id)} className="p-1 text-red-400 hover:text-red-600">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-4 flex justify-end gap-2">
          {!createdTeamId ? (
            <>
              <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={handleCreateTeam} disabled={busy || !sportName.trim()} className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
                {busy ? "Creating…" : "Create Team →"}
              </button>
            </>
          ) : (
            <button onClick={() => onSaved(createdTeamId ?? undefined)} className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700">
              Done
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
