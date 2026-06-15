"use client";

import { useState, useCallback } from "react";
import { X, Search } from "lucide-react";
import {
  logAchievement,
  searchStudentsForSports,
  type SportsTeam,
  type StudentOption,
} from "@/actions/sports";
import {
  ACHIEVEMENT_LEVELS,
  ACHIEVEMENT_LEVEL_LABEL,
  type AchievementLevel,
} from "@/lib/sports";

const COMMON_POSITIONS = ["Gold", "Silver", "Bronze", "Participant", "Runner-up", "4th Place"];

type Props = {
  institutionId: string;
  teams: SportsTeam[];
  onClose: () => void;
  onSaved: () => void;
};

export function AchievementDrawer({ institutionId, teams, onClose, onSaved }: Props) {
  const [eventName, setEventName] = useState("");
  const [level, setLevel] = useState<AchievementLevel>("state");
  const [position, setPosition] = useState("Gold");
  const [customPosition, setCustomPosition] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [achievementType, setAchievementType] = useState<"team" | "individual">("team");
  const [teamId, setTeamId] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [searching, setSearching] = useState(false);
  const [certificateUrl, setCertificateUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchStudents = useCallback(async (q: string) => {
    setStudentQuery(q);
    setSelectedStudent(null);
    if (q.trim().length < 2) { setStudentOptions([]); return; }
    setSearching(true);
    const res = await searchStudentsForSports(institutionId, q);
    setSearching(false);
    setStudentOptions(res.success ? res.data : []);
  }, [institutionId]);

  const finalPosition = position === "custom" ? customPosition.trim() : position;

  const handleSubmit = async () => {
    if (!eventName.trim()) { setError("Event name is required."); return; }
    if (!finalPosition) { setError("Position is required."); return; }
    if (achievementType === "team" && !teamId) { setError("Please select a team."); return; }
    if (achievementType === "individual" && !selectedStudent) { setError("Please select a student."); return; }

    setBusy(true); setError(null);
    const res = await logAchievement({
      institutionId,
      eventName,
      level,
      position: finalPosition,
      eventDate,
      teamId: achievementType === "team" ? teamId : undefined,
      studentId: achievementType === "individual" ? selectedStudent?.id : undefined,
      certificateUrl: certificateUrl || undefined,
    });

    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    onSaved();
  };

  const inputCls = "w-full h-8 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500";
  const labelCls = "block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1";

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-50 w-full max-w-md bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Log Achievement</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          <div>
            <label className={labelCls}>Event Name <span className="text-red-500">*</span></label>
            <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. South Zone Inter-University Athletics Meet 2026" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Level <span className="text-red-500">*</span></label>
              <select value={level} onChange={(e) => setLevel(e.target.value as AchievementLevel)} className={inputCls}>
                {ACHIEVEMENT_LEVELS.map((l) => (
                  <option key={l} value={l}>{ACHIEVEMENT_LEVEL_LABEL[l]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date <span className="text-red-500">*</span></label>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Position / Result <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_POSITIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPosition(p)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                    position === p && position !== "custom"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPosition("custom")}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                  position === "custom"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                Other…
              </button>
            </div>
            {position === "custom" && (
              <input
                value={customPosition}
                onChange={(e) => setCustomPosition(e.target.value)}
                placeholder="Enter position (e.g. 4th, Runner-up, Consolation)"
                className={inputCls}
                autoFocus
              />
            )}
          </div>

          {/* Team vs Individual */}
          <div>
            <label className={labelCls}>Achievement Type <span className="text-red-500">*</span></label>
            <div className="flex gap-2 mb-3">
              {(["team", "individual"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAchievementType(t)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                    achievementType === t
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {t === "team" ? "Team Achievement" : "Individual Achievement"}
                </button>
              ))}
            </div>

            {achievementType === "team" ? (
              <div>
                <label className={labelCls}>Team</label>
                <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={inputCls}>
                  <option value="">— Select team —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.sport_name} ({t.team_category})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className={labelCls}>Student</label>
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    value={studentQuery}
                    onChange={(e) => searchStudents(e.target.value)}
                    placeholder="Search student name or roll no…"
                    className={`${inputCls} pl-7`}
                  />
                  {studentOptions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-10 mt-1 max-h-40 overflow-y-auto">
                      {studentOptions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => { setSelectedStudent(s); setStudentQuery(s.full_name); setStudentOptions([]); }}
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
                {selectedStudent && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">✓ {selectedStudent.full_name}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Certificate URL (optional)</label>
            <input value={certificateUrl} onChange={(e) => setCertificateUrl(e.target.value)} placeholder="https://…" className={inputCls} />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
          <button onClick={handleSubmit} disabled={busy || !eventName.trim() || !finalPosition} className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {busy ? "Saving…" : "Log Achievement"}
          </button>
        </div>
      </aside>
    </div>
  );
}
