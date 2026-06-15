"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { createCampusEvent, updateCampusEvent, type CampusEvent, type StaffOption } from "@/actions/campusEvents";
import { EVENT_TYPES, EVENT_TYPE_LABEL, type CampusEventType } from "@/lib/campusEvents";

type AcademicYearOption = { id: string; label: string };
type CommitteeMember = { staff_id: string; name: string; role: string };

type Props = {
  institutionId: string;
  event?: CampusEvent;
  staff: StaffOption[];
  academicYears: AcademicYearOption[];
  onClose: () => void;
  onSaved: () => void;
};

export function EventDrawer({ institutionId, event, staff, academicYears, onClose, onSaved }: Props) {
  const editing = !!event;

  const [title, setTitle] = useState(event?.title ?? "");
  const [eventType, setEventType] = useState<CampusEventType>(event?.event_type ?? "annual_day");
  const [eventDate, setEventDate] = useState(event?.event_date ?? new Date().toISOString().slice(0, 10));
  const [venue, setVenue] = useState(event?.venue ?? "");
  const [academicYearId, setAcademicYearId] = useState(event?.academic_year_id ?? (academicYears[0]?.id ?? ""));
  const [budgetAllocated, setBudgetAllocated] = useState(event?.budget_allocated?.toString() ?? "");
  const [description, setDescription] = useState(event?.description ?? "");

  const [committee, setCommittee] = useState<CommitteeMember[]>(event?.organizing_committee ?? []);
  const [newMemberId, setNewMemberId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Coordinator");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCommitteeMember = () => {
    if (!newMemberId) return;
    const staffMember = staff.find((s) => s.id === newMemberId);
    if (!staffMember) return;
    if (committee.find((m) => m.staff_id === newMemberId)) return;
    setCommittee((prev) => [...prev, {
      staff_id: staffMember.id,
      name: `${staffMember.title ? staffMember.title + " " : ""}${staffMember.full_name}`,
      role: newMemberRole.trim() || "Coordinator",
    }]);
    setNewMemberId("");
    setNewMemberRole("Coordinator");
  };

  const removeCommitteeMember = (staffId: string) => {
    setCommittee((prev) => prev.filter((m) => m.staff_id !== staffId));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Event title is required."); return; }
    if (!eventDate) { setError("Event date is required."); return; }
    setBusy(true); setError(null);

    let res;
    if (editing && event) {
      res = await updateCampusEvent(event.id, institutionId, {
        title, eventType, eventDate,
        venue: venue || undefined,
        budgetAllocated: budgetAllocated ? parseFloat(budgetAllocated) : null,
        description: description || undefined,
        organizingCommittee: committee,
      });
    } else {
      res = await createCampusEvent({
        institutionId, title, eventType, eventDate,
        venue: venue || undefined,
        academicYearId: academicYearId || undefined,
        budgetAllocated: budgetAllocated ? parseFloat(budgetAllocated) : undefined,
        description: description || undefined,
        organizingCommittee: committee,
      });
    }

    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    onSaved();
  };

  const inputCls = "w-full h-8 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500";
  const labelCls = "block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1";

  const COMMITTEE_ROLES = ["Coordinator", "Stage Manager", "MC", "Treasurer", "Logistics", "Volunteer Head", "Technical Head", "Cultural Head"];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-50 w-full max-w-lg bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {editing ? "Edit Event" : "Create Campus Event"}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          <div>
            <label className={labelCls}>Event Title <span className="text-red-500">*</span></label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Annual Day 2026" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Event Type <span className="text-red-500">*</span></label>
              <select value={eventType} onChange={(e) => setEventType(e.target.value as CampusEventType)} className={inputCls}>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{EVENT_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date <span className="text-red-500">*</span></label>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Venue</label>
              <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="College Auditorium" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Academic Year</label>
              <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} className={inputCls} disabled={editing}>
                <option value="">— None —</option>
                {academicYears.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Budget Allocated (₹)</label>
            <input type="number" value={budgetAllocated} onChange={(e) => setBudgetAllocated(e.target.value)} placeholder="0.00" min="0" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the event, theme, or objectives…"
              rows={3}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Organizing Committee */}
          <div>
            <label className={labelCls}>Organizing Committee</label>
            <div className="flex gap-2 mb-2">
              <select value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)} className={`${inputCls} flex-1`}>
                <option value="">— Select staff —</option>
                {staff.filter((s) => !committee.find((m) => m.staff_id === s.id)).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title ? `${s.title} ` : ""}{s.full_name}
                  </option>
                ))}
              </select>
              <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)} className="h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 w-36">
                {COMMITTEE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button
                type="button"
                onClick={addCommitteeMember}
                disabled={!newMemberId}
                className="h-8 px-3 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-1"
              >
                <Plus size={12} />
              </button>
            </div>

            {committee.length > 0 && (
              <div className="space-y-1">
                {committee.map((m) => (
                  <div key={m.staff_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-100">{m.name}</p>
                      <p className="text-[10px] text-slate-400">{m.role}</p>
                    </div>
                    <button type="button" onClick={() => removeCommitteeMember(m.staff_id)} className="p-1 text-red-400 hover:text-red-600">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
          <button onClick={handleSubmit} disabled={busy || !title.trim()} className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {busy ? "Saving…" : editing ? "Save Changes" : "Create Event"}
          </button>
        </div>
      </aside>
    </div>
  );
}
