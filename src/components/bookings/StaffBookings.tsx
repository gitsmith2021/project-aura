"use client";

import { useState } from "react";
import { Plus, X, Clock, MapPin } from "lucide-react";
import { createBooking, cancelBooking } from "@/actions/venueBookings";
import type { Venue, VenueBooking } from "@/lib/venueBookings";
import { venueTypeMeta } from "@/lib/venueBookings";
import { BookingStatusBadge } from "./VenueBadge";

const fmt = (dt: string) => new Date(dt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const inputCls =
  "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";

export function StaffBookings({
  institutionId, venues, initial,
}: {
  institutionId: string;
  venues: Venue[];
  initial: VenueBooking[];
}) {
  const [bookings, setBookings] = useState<VenueBooking[]>(initial);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [venueId, setVenueId] = useState(venues[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [attendees, setAttendees] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true); setError(null);
    const res = await createBooking({
      institutionId, venueId, eventTitle: title, purpose: purpose || null,
      startDatetime: new Date(start).toISOString(),
      endDatetime: new Date(end).toISOString(),
      attendeesCount: attendees ? parseInt(attendees, 10) : null,
    });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    // optimistic: prepend a pending row (venue name resolved from list)
    const v = venues.find((x) => x.id === venueId);
    setBookings((prev) => [{
      id: `tmp-${Date.now()}`, institution_id: institutionId, venue_id: venueId, booked_by: "",
      event_title: title, purpose: purpose || null,
      start_datetime: new Date(start).toISOString(), end_datetime: new Date(end).toISOString(),
      attendees_count: attendees ? parseInt(attendees, 10) : null, status: "pending", admin_notes: null,
      created_at: new Date().toISOString(), venues: v ? { name: v.name, venue_type: v.venue_type } : null,
    }, ...prev]);
    setTitle(""); setPurpose(""); setStart(""); setEnd(""); setAttendees("");
    setOpen(false);
  };

  const cancel = async (id: string) => {
    if (!confirm("Cancel this booking?")) return;
    setBusyId(id);
    const res = await cancelBooking(id);
    setBusyId(null);
    if (res.success) setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)));
    else setError(res.error);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Venue Bookings</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Request a venue and track your booking approvals.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} disabled={venues.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 border border-purple-700 disabled:opacity-50">
          <Plus size={14} strokeWidth={2.5} /> Request Booking
        </button>
      </div>

      {error && <p className="mb-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
      {venues.length === 0 && <p className="text-[11px] text-amber-700 dark:text-amber-400 mb-3">No bookable venues have been set up yet.</p>}

      {bookings.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-16">You haven't requested any bookings yet.</p>
      ) : (
        <div className="space-y-2.5 max-w-3xl">
          {bookings.map((b) => (
            <div key={b.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm shadow-sm px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{b.event_title}</p>
                <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  <span className="inline-flex items-center gap-1"><MapPin size={11} /> {b.venues?.name ?? "—"}</span>
                  <span className="inline-flex items-center gap-1"><Clock size={11} /> {fmt(b.start_datetime)} – {fmt(b.end_datetime)}</span>
                </div>
                {b.admin_notes && <p className="text-[11px] text-slate-400 mt-1 italic">Note: {b.admin_notes}</p>}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <BookingStatusBadge status={b.status} />
                {(b.status === "pending" || b.status === "approved") && !b.id.startsWith("tmp-") && (
                  <button type="button" disabled={busyId === b.id} onClick={() => cancel(b.id)} className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-40">Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Request Booking</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Venue</label>
                <select value={venueId} onChange={(e) => setVenueId(e.target.value)} className={inputCls}>
                  {venues.map((v) => <option key={v.id} value={v.id}>{v.name} · {venueTypeMeta(v.venue_type).label}</option>)}
                </select>
              </div>
              <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Event title</label><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} /></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Purpose (optional)</label><input value={purpose} onChange={(e) => setPurpose(e.target.value)} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Start</label><input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} /></div>
                <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">End</label><input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} /></div>
              </div>
              <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Expected attendees (optional)</label><input type="number" value={attendees} onChange={(e) => setAttendees(e.target.value)} className={inputCls} /></div>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
              <button type="button" onClick={submit} disabled={saving || !venueId || !title.trim() || !start || !end} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Submitting…" : "Submit request"}</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
