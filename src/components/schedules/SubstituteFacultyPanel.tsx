"use client";

import { useCallback, useEffect, useState } from "react";
import { X, UserCheck, Trash2, CalendarClock, Loader2 } from "lucide-react";
import {
  getSubstitutionContext,
  assignSubstitute,
  removeSubstitute,
  type SchedulePeriod,
  type StaffOption,
  type SubstitutionRow,
} from "@/actions/substitutions";

// PHASE 8 · P8.4 — Substitute Faculty drawer.
// Operates on the attendance-linked timetable (public.class_schedules), so an
// assigned substitute is honoured by the card/NFC validation. RLS gates who can
// assign; the UI simply surfaces the class_schedules periods + active staff.

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const DAY_ORDER: Record<string, number> = {
  Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7,
};

export function SubstituteFacultyPanel({
  institutionId,
  onClose,
}: {
  institutionId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<SchedulePeriod[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [subs, setSubs] = useState<SubstitutionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [scheduleId, setScheduleId] = useState("");
  const [subDate, setSubDate] = useState(today());
  const [substituteStaffId, setSubstituteStaffId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    const res = await getSubstitutionContext(institutionId);
    if (res.success) {
      const sorted = [...res.data.periods].sort(
        (a, b) =>
          (DAY_ORDER[a.day_of_week ?? ""] ?? 9) - (DAY_ORDER[b.day_of_week ?? ""] ?? 9) ||
          (a.start_time ?? "").localeCompare(b.start_time ?? ""),
      );
      setPeriods(sorted);
      setStaff(res.data.staff);
      setSubs(res.data.substitutions);
      setError(null);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, [institutionId]);

  useEffect(() => { load(); }, [load]);

  const selectedPeriod = periods.find((p) => p.id === scheduleId);
  // A substitute must differ from the class's own teacher.
  const eligibleStaff = staff.filter((s) => s.id !== selectedPeriod?.staff_id);

  const handleAssign = async () => {
    if (!scheduleId || !subDate || !substituteStaffId) return;
    setSaving(true);
    const res = await assignSubstitute({ institutionId, scheduleId, subDate, substituteStaffId, reason });
    setSaving(false);
    if (res.success) {
      setScheduleId(""); setSubstituteStaffId(""); setReason("");
      await load();
    } else {
      setError(res.error);
    }
  };

  const handleRemove = async (id: string) => {
    const res = await removeSubstitute(institutionId, id);
    if (res.success) await load();
    else setError(res.error);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm transition-all">
      <div className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-slate-50 shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-900">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <UserCheck size={15} />
              </span>
              Substitute Faculty
            </h2>
            <p className="mt-1 text-xs text-slate-500">Reassign a class for a date — the substitute may mark attendance, the original is blocked.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-amber-500" /></div>
          ) : periods.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              No attendance-linked classes found for this institution yet.
            </div>
          ) : (
            <>
              {/* Assign form */}
              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Class</label>
                  <select
                    value={scheduleId}
                    onChange={(e) => { setScheduleId(e.target.value); setSubstituteStaffId(""); }}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  >
                    <option value="">Select a class…</option>
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.day_of_week} {p.start_time?.slice(0, 5)} · {p.subject_name ?? "Class"} · {p.staff_name ?? "Unassigned"}
                        {p.classroom_label ? ` · ${p.classroom_label}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date</label>
                  <input
                    type="date"
                    value={subDate}
                    min={today()}
                    onChange={(e) => setSubDate(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Substitute</label>
                  <select
                    value={substituteStaffId}
                    onChange={(e) => setSubstituteStaffId(e.target.value)}
                    disabled={!scheduleId}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">Select a teacher…</option>
                    {eligibleStaff.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reason (optional)</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. sick leave, official duty"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleAssign}
                  disabled={!scheduleId || !subDate || !substituteStaffId || saving}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-amber-700 bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                  Assign Substitute
                </button>
              </div>

              {/* Existing substitutions */}
              <div className="mt-6">
                <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <CalendarClock size={12} /> Scheduled Substitutions
                </h3>
                {subs.length === 0 ? (
                  <p className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-400">None yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {subs.map((s) => (
                      <li key={s.id} className="flex items-start justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-800">
                            {s.subject_name ?? "Class"} · {s.day_of_week} {s.start_time?.slice(0, 5)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            <span className="font-medium text-amber-700">{s.substitute_name ?? "—"}</span>
                            {s.original_name ? <> for {s.original_name}</> : null} · {s.sub_date}
                          </p>
                          {s.reason && <p className="mt-0.5 truncate text-[11px] italic text-slate-400">{s.reason}</p>}
                        </div>
                        <button
                          onClick={() => handleRemove(s.id)}
                          className="shrink-0 rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title="Remove substitution"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
