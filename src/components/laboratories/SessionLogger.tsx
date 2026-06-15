"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, CalendarDays, ClipboardList, Check, Loader2, ChevronRight, Users } from "lucide-react";
import {
  logLabSession, getSessionAttendance, submitLabAttendance,
  type RosterStudent, type AttendanceEntry,
} from "@/actions/laboratories";
import { normaliseMarks, sessionTally, type Laboratory, type LabBatch, type LabExperiment, type LabSession } from "@/lib/laboratories";

const inputCls =
  "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";

const MAX_MARKS = 100;

type GridRow = { isPresent: boolean; marks: string };

export function SessionLogger({
  lab, batches, experiments, roster, initialSessions, onBack,
}: {
  lab: Laboratory;
  batches: LabBatch[];
  experiments: LabExperiment[];
  roster: RosterStudent[];
  initialSessions: LabSession[];
  /** When provided, the back control is a button (used inside the staff portal). */
  onBack?: () => void;
}) {
  const institutionId = lab.institution_id;
  const [sessions, setSessions] = useState<LabSession[]>(initialSessions);
  const [logOpen, setLogOpen] = useState(false);
  const [active, setActive] = useState<LabSession | null>(null);

  const canLog = batches.length > 0 && experiments.length > 0;

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      {onBack ? (
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-purple-600 font-medium mb-4">
          <ArrowLeft size={13} /> {lab.name}
        </button>
      ) : (
        <Link href={`/institutions/${institutionId}/laboratories/${lab.id}`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-purple-600 font-medium mb-4">
          <ArrowLeft size={13} /> {lab.name}
        </Link>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Sessions &amp; Grading</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Log experiment sessions, mark attendance and record lab marks.</p>
        </div>
        <button
          type="button"
          onClick={() => setLogOpen(true)}
          disabled={!canLog}
          title={canLog ? "" : "Add at least one batch and experiment first"}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 border border-purple-700 disabled:opacity-50"
        >
          <Plus size={14} strokeWidth={2.5} /> Log Session
        </button>
      </div>

      {!canLog && (
        <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2 mb-4">
          Add at least one batch and one experiment on the lab page before logging a session.
        </p>
      )}

      {sessions.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-16">No sessions logged yet.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-purple-50/40 dark:hover:bg-purple-950/10 text-left transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <CalendarDays size={15} className="text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{s.laboratory_experiments?.title ?? "Experiment"}</p>
                  <p className="text-[11px] text-slate-400">{s.session_date} · {s.laboratory_batches?.name ?? "Batch"}</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 shrink-0">
                <ClipboardList size={13} /> Attendance <ChevronRight size={13} />
              </span>
            </button>
          ))}
        </div>
      )}

      {logOpen && (
        <LogSessionDrawer
          lab={lab}
          batches={batches}
          experiments={experiments}
          onClose={() => setLogOpen(false)}
          onLogged={(s) => { setSessions((prev) => [s, ...prev]); setActive(s); }}
        />
      )}

      {active && (
        <AttendanceDrawer
          lab={lab}
          session={active}
          roster={roster}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}

function LogSessionDrawer({ lab, batches, experiments, onClose, onLogged }: {
  lab: Laboratory; batches: LabBatch[]; experiments: LabExperiment[];
  onClose: () => void; onLogged: (s: LabSession) => void;
}) {
  const [batchId, setBatchId] = useState(batches[0]?.id ?? "");
  const [experimentId, setExperimentId] = useState(experiments[0]?.id ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setError(null);
    const res = await logLabSession({
      institutionId: lab.institution_id, laboratoryId: lab.id,
      batchId, experimentId, sessionDate: date, remarks: remarks || null,
    });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    onLogged(res.data); onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <aside className="relative h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Log Session</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Batch</label>
            <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className={inputCls}>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.year_semester}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Experiment</label>
            <select value={experimentId} onChange={(e) => setExperimentId(e.target.value)} className={inputCls}>
              {experiments.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Session date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Remarks (optional)</label>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} className={`${inputCls} h-auto py-2`} />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
          <button type="button" onClick={submit} disabled={saving || !batchId || !experimentId} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Logging…" : "Log session"}</button>
        </div>
      </aside>
    </div>
  );
}

function AttendanceDrawer({ lab, session, roster, onClose }: {
  lab: Laboratory; session: LabSession; roster: RosterStudent[]; onClose: () => void;
}) {
  const [rows, setRows] = useState<Record<string, GridRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load existing attendance once on mount.
  useEffect(() => {
    let active = true;
    getSessionAttendance(session.id).then((res) => {
      if (!active) return;
      const next: Record<string, GridRow> = {};
      for (const s of roster) {
        const existing = res.success ? res.data[s.id] : undefined;
        next[s.id] = existing
          ? { isPresent: existing.is_present, marks: existing.marks_secured != null ? String(existing.marks_secured) : "" }
          : { isPresent: true, marks: "" };
      }
      setRows(next);
      setLoading(false);
    });
    return () => { active = false; };
  }, [session.id, roster]);

  const setRow = (id: string, patch: Partial<GridRow>) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const tally = sessionTally(Object.values(rows).map((r) => ({ is_present: r.isPresent })));

  const submit = async () => {
    setSaving(true); setError(null); setSaved(false);
    const entries: AttendanceEntry[] = roster.map((s) => ({
      studentId: s.id,
      isPresent: rows[s.id]?.isPresent ?? true,
      marks: normaliseMarks(rows[s.id]?.marks ?? "", MAX_MARKS),
    }));
    const res = await submitLabAttendance({ institutionId: lab.institution_id, laboratoryId: lab.id, sessionId: session.id, entries });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <aside className="relative h-full w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{session.laboratory_experiments?.title ?? "Attendance"}</h2>
            <p className="text-[11px] text-slate-400">{session.session_date} · {session.laboratory_batches?.name ?? "Batch"}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>

        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 text-[11px] text-slate-500 shrink-0">
          <span className="flex items-center gap-1"><Users size={12} /> {tally.total}</span>
          <span className="text-emerald-600">Present {tally.present}</span>
          <span className="text-rose-500">Absent {tally.absent}</span>
          <span className="ml-auto font-semibold text-slate-600 dark:text-slate-300">{tally.rate}%</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-purple-500" /></div>
          ) : roster.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-16">No students found for this lab&apos;s department.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {roster.map((s) => {
                const row = rows[s.id] ?? { isPresent: true, marks: "" };
                return (
                  <div key={s.id} className="flex items-center gap-2 px-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{s.name}</p>
                      {s.roll_no && <p className="text-[10px] text-slate-400">{s.roll_no}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setRow(s.id, { isPresent: !row.isPresent })}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                        row.isPresent
                          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400"
                          : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {row.isPresent ? "Present" : "Absent"}
                    </button>
                    <input
                      type="number" min={0} max={MAX_MARKS} step="0.5"
                      value={row.marks}
                      onChange={(e) => setRow(s.id, { marks: e.target.value })}
                      placeholder="Marks"
                      disabled={!row.isPresent}
                      className="w-20 h-8 px-2 text-xs text-center border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-40"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between gap-2 shrink-0">
          {error ? <p className="text-[11px] text-red-600 truncate">{error}</p> : <span className="text-[11px] text-slate-400">Marks out of {MAX_MARKS}</span>}
          <button type="button" onClick={submit} disabled={saving || loading || roster.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50 shrink-0">
            {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
            {saving ? "Saving…" : saved ? "Saved" : "Save attendance"}
          </button>
        </div>
      </aside>
    </div>
  );
}
