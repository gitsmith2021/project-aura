"use client";

import { useState } from "react";
import { Check, X, Clock, MapPin, User, Users } from "lucide-react";
import { approveBooking, rejectBooking, type BookingWithBooker } from "@/actions/venueBookings";

const fmt = (dt: string) => new Date(dt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function RequestsTable({ institutionId, initial }: { institutionId: string; initial: BookingWithBooker[] }) {
  const [rows, setRows] = useState<BookingWithBooker[]>(initial);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (id: string, kind: "approve" | "reject") => {
    setBusyId(id); setError(null);
    const note = notes[id];
    const res = kind === "approve"
      ? await approveBooking(id, institutionId, note)
      : await rejectBooking(id, institutionId, note);
    setBusyId(null);
    if (!res.success) { setError(res.error); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  if (rows.length === 0) return <p className="text-center text-xs text-slate-400 py-16">No pending booking requests. 🎉</p>;

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
      {rows.map((r) => (
        <article key={r.id} className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm shadow-sm p-4">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{r.event_title}</p>
          {r.purpose && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{r.purpose}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            <span className="inline-flex items-center gap-1"><MapPin size={11} /> {r.venues?.name ?? "—"}</span>
            <span className="inline-flex items-center gap-1"><Clock size={11} /> {fmt(r.start_datetime)} – {fmt(r.end_datetime)}</span>
            <span className="inline-flex items-center gap-1"><User size={11} /> {r.booker_name}</span>
            {r.attendees_count != null && <span className="inline-flex items-center gap-1"><Users size={11} /> {r.attendees_count}</span>}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input
              value={notes[r.id] ?? ""}
              onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))}
              placeholder="Note (optional)"
              className="flex-1 h-8 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button type="button" disabled={busyId === r.id} onClick={() => act(r.id, "reject")} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-40">
              <X size={12} /> Reject
            </button>
            <button type="button" disabled={busyId === r.id} onClick={() => act(r.id, "approve")} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40">
              <Check size={12} /> Approve
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
