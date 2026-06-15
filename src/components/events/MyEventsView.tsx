"use client";

import { useState } from "react";
import { CalendarDays, MapPin, Users, Check } from "lucide-react";
import { registerForEvent, type CampusEvent } from "@/actions/campusEvents";
import {
  EVENT_TYPE_LABEL,
  eventTypeBadgeClass,
  PARTICIPANT_ROLE_LABEL,
  type ParticipantRole,
} from "@/lib/campusEvents";

type MyRegistration = { event: CampusEvent; role: ParticipantRole };

type Props = {
  upcoming: CampusEvent[];
  myRegistrations: MyRegistration[];
};

const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

const isRegistered = (eventId: string, registrations: MyRegistration[]) =>
  registrations.some((r) => r.event.id === eventId);

export function MyEventsView({ upcoming, myRegistrations }: Props) {
  const [registrations, setRegistrations] = useState(myRegistrations);
  const [registering, setRegistering] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleRegister = async (eventId: string) => {
    setRegistering(eventId);
    setErrors((e) => ({ ...e, [eventId]: "" }));
    const res = await registerForEvent(eventId);
    setRegistering(null);
    if (!res.success) {
      setErrors((e) => ({ ...e, [eventId]: res.error }));
    } else {
      const event = upcoming.find((e) => e.id === eventId);
      if (event) {
        setRegistrations((prev) => [...prev, { event, role: "participant" }]);
      }
    }
  };

  if (upcoming.length === 0 && registrations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center text-violet-400">
          <CalendarDays size={26} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No events scheduled</p>
          <p className="text-xs text-slate-400 mt-1">Upcoming campus events will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Upcoming events */}
      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={14} className="text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Upcoming Events</h2>
            <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-1.5 py-0.5 rounded-full">{upcoming.length}</span>
          </div>
          <div className="space-y-3">
            {upcoming.map((e) => {
              const registered = isRegistered(e.id, registrations);
              const today = e.event_date === new Date().toISOString().slice(0, 10);

              return (
                <div key={e.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {today && (
                        <span className="inline-block mb-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse">
                          TODAY
                        </span>
                      )}
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">{e.title}</p>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                          <CalendarDays size={10} /> {fmtDate(e.event_date)}
                        </span>
                        {e.venue && (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} /> {e.venue}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users size={10} /> {e.participant_count ?? 0} registered
                        </span>
                      </div>
                      {e.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{e.description}</p>
                      )}
                      {errors[e.id] && (
                        <p className="text-[10px] text-red-500 mt-1">{errors[e.id]}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${eventTypeBadgeClass(e.event_type)}`}>
                        {EVENT_TYPE_LABEL[e.event_type]}
                      </span>
                      {registered ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                          <Check size={10} /> Registered
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRegister(e.id)}
                          disabled={registering === e.id}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                          {registering === e.id ? "Registering…" : "Register"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* My registrations */}
      {registrations.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Check size={14} className="text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">My Registrations</h2>
            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">{registrations.length}</span>
          </div>
          <div className="space-y-2">
            {registrations.map(({ event: e, role }) => (
              <div key={e.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{e.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(e.event_date)}{e.venue ? ` · ${e.venue}` : ""}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${eventTypeBadgeClass(e.event_type)}`}>
                    {EVENT_TYPE_LABEL[e.event_type]}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {PARTICIPANT_ROLE_LABEL[role]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
