"use client";

import { useState } from "react";
import {
  ArrowLeft, Calendar, MapPin, Users, Wallet, Edit, UserPlus, Trash2, RefreshCw,
} from "lucide-react";
import {
  getEventParticipants,
  getCampusEvent,
  removeParticipant,
  updateCampusEvent,
  type CampusEvent,
  type EventParticipant,
  type StaffOption,
} from "@/actions/campusEvents";
import {
  EVENT_TYPE_LABEL,
  eventTypeBadgeClass,
  budgetStatus,
  budgetBarWidth,
  budgetStatusClass,
  formatBudget,
  PARTICIPANT_ROLE_LABEL,
  type ParticipantRole,
} from "@/lib/campusEvents";
import { EventDrawer } from "./EventDrawer";
import { ParticipantDrawer } from "./ParticipantDrawer";

type Props = {
  event: CampusEvent;
  initialParticipants: EventParticipant[];
  institutionId: string;
  staff: StaffOption[];
  academicYears: Array<{ id: string; label: string }>;
  onBack: () => void;
};

const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

const ROLE_COLOR: Record<ParticipantRole, string> = {
  participant: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  organizer:   "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  performer:   "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  volunteer:   "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
};

export function EventDetail({
  event: initialEvent,
  initialParticipants,
  institutionId,
  staff,
  academicYears,
  onBack,
}: Props) {
  const [event, setEvent] = useState(initialEvent);
  const [participants, setParticipants] = useState(initialParticipants);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [actualSpend, setActualSpend] = useState(event.actual_spend.toString());
  const [editingSpend, setEditingSpend] = useState(false);
  const [savingSpend, setSavingSpend] = useState(false);

  const refresh = async () => {
    const [er, pr] = await Promise.all([
      getCampusEvent(event.id, institutionId),
      getEventParticipants(event.id),
    ]);
    if (er.success && er.data) setEvent(er.data);
    if (pr.success) setParticipants(pr.data);
  };

  const handleSaveSpend = async () => {
    setSavingSpend(true);
    const res = await updateCampusEvent(event.id, institutionId, {
      actualSpend: parseFloat(actualSpend) || 0,
    });
    setSavingSpend(false);
    if (res.success) {
      setEvent((e) => ({ ...e, actual_spend: parseFloat(actualSpend) || 0 }));
      setEditingSpend(false);
    }
  };

  const handleRemoveParticipant = async (id: string) => {
    const res = await removeParticipant(id, institutionId, event.id);
    if (res.success) setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const status = budgetStatus(event.budget_allocated, event.actual_spend);
  const barWidth = budgetBarWidth(event.budget_allocated, event.actual_spend);

  return (
    <div className="space-y-5">
      {/* Back + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 font-medium"
        >
          <ArrowLeft size={13} /> Back to Events
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddParticipant(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-950/50"
          >
            <UserPlus size={13} /> Add Participant
          </button>
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Edit size={13} /> Edit
          </button>
          <button onClick={refresh} className="p-1.5 text-slate-400 hover:text-slate-600 border border-slate-200 dark:border-slate-700 rounded-lg">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Event header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">{event.title}</h2>
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${eventTypeBadgeClass(event.event_type)}`}>
            {EVENT_TYPE_LABEL[event.event_type]}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400">
            <Calendar size={13} /> {fmtDate(event.event_date)}
          </span>
          {event.venue && (
            <span className="flex items-center gap-1.5">
              <MapPin size={13} /> {event.venue}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users size={13} /> {participants.length} registered
          </span>
        </div>

        {event.description && (
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">{event.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Budget section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Wallet size={14} className="text-amber-500" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Budget</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
              <p className="text-[10px] text-slate-400">Allocated</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{formatBudget(event.budget_allocated)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
              <p className="text-[10px] text-slate-400">Actual Spend</p>
              {editingSpend ? (
                <div className="flex gap-1 mt-0.5">
                  <input
                    type="number"
                    value={actualSpend}
                    onChange={(e) => setActualSpend(e.target.value)}
                    className="flex-1 h-7 px-2 text-xs border border-indigo-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    autoFocus
                  />
                  <button onClick={handleSaveSpend} disabled={savingSpend} className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-1">✓</button>
                  <button onClick={() => { setEditingSpend(false); setActualSpend(event.actual_spend.toString()); }} className="text-[10px] text-slate-400 px-1">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingSpend(true)}
                  className="text-lg font-bold text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 text-left w-full"
                >
                  {formatBudget(event.actual_spend)}
                </button>
              )}
            </div>
          </div>

          {event.budget_allocated && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Utilisation</span>
                <span className={`font-bold px-1.5 rounded ${budgetStatusClass(status)}`}>
                  {status === "over" ? "Over Budget" : status === "on_track" ? "Near Limit" : "Within Budget"}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${status === "over" ? "bg-red-500" : status === "on_track" ? "bg-amber-400" : "bg-emerald-500"}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Organizing Committee */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Organizing Committee</h3>
          {event.organizing_committee.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No committee assigned. Edit event to add members.</p>
          ) : (
            <div className="space-y-1.5">
              {event.organizing_committee.map((m) => (
                <div key={m.staff_id} className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-100">{m.name}</p>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{m.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Participants table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
            Participants <span className="font-normal text-slate-400 ml-1 normal-case">({participants.length})</span>
          </h3>
          <button
            onClick={() => setShowAddParticipant(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <UserPlus size={11} /> Add
          </button>
        </div>
        {participants.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-8">No participants yet.</p>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-100">{p.student?.full_name ?? "—"}</p>
                  <p className="text-[10px] text-slate-400">
                    {p.student?.roll_no}
                    {p.student?.department?.name ? ` · ${p.student.department.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_COLOR[p.role]}`}>
                    {PARTICIPANT_ROLE_LABEL[p.role]}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(p.id)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showEdit && (
        <EventDrawer
          institutionId={institutionId}
          event={event}
          staff={staff}
          academicYears={academicYears}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false);
            await refresh();
          }}
        />
      )}

      {showAddParticipant && (
        <ParticipantDrawer
          eventId={event.id}
          institutionId={institutionId}
          onClose={() => setShowAddParticipant(false)}
          onSaved={async () => {
            const pr = await getEventParticipants(event.id);
            if (pr.success) setParticipants(pr.data);
          }}
        />
      )}
    </div>
  );
}
