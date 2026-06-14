"use client";

import { useState } from "react";
import { Plus, X, Users } from "lucide-react";
import { addVenue, setVenueActive } from "@/actions/venueBookings";
import { VENUE_TYPES, venueTypeMeta, type Venue, type VenueType } from "@/lib/venueBookings";
import { VenueBadge } from "./VenueBadge";

const inputCls =
  "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";

export function VenuesManager({ institutionId, initial }: { institutionId: string; initial: Venue[] }) {
  const [venues, setVenues] = useState<Venue[]>(initial);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<VenueType>("seminar_hall");
  const [capacity, setCapacity] = useState("");
  const [amenities, setAmenities] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true); setError(null);
    const res = await addVenue({
      institution_id: institutionId, name, venue_type: type,
      capacity: capacity ? parseInt(capacity, 10) : null,
      amenities: amenities.trim() ? amenities.split(",").map((a) => a.trim()).filter(Boolean) : null,
    });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    setVenues((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
    setName(""); setCapacity(""); setAmenities(""); setType("seminar_hall");
    setOpen(false);
  };

  const toggle = async (v: Venue) => {
    setBusyId(v.id);
    const res = await setVenueActive(v.id, institutionId, !v.is_active);
    setBusyId(null);
    if (res.success) setVenues((prev) => prev.map((x) => (x.id === v.id ? { ...x, is_active: !x.is_active } : x)));
    else setError(res.error);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Venues</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Auditoriums, halls, labs and grounds available for booking.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 border border-purple-700">
          <Plus size={14} strokeWidth={2.5} /> Add Venue
        </button>
      </div>

      {error && <p className="mb-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}

      {venues.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-16">No venues yet — add the first one.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((v) => (
            <article key={v.id} className={`rounded-xl border bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm shadow-sm p-4 ${v.is_active ? "border-slate-200/70 dark:border-slate-700/50" : "border-slate-200/70 dark:border-slate-700/50 opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{v.name}</p>
                <VenueBadge type={v.venue_type} />
              </div>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                {v.capacity != null && <span className="inline-flex items-center gap-1"><Users size={11} /> {v.capacity}</span>}
                {v.amenities && v.amenities.length > 0 && <span className="truncate">{v.amenities.join(", ")}</span>}
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className={`text-[10px] font-semibold ${v.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>{v.is_active ? "Active" : "Inactive"}</span>
                <button type="button" disabled={busyId === v.id} onClick={() => toggle(v)} className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-violet-700 dark:hover:text-violet-400 disabled:opacity-40">
                  {v.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Add Venue</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Main Auditorium" /></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value as VenueType)} className={inputCls}>
                  {VENUE_TYPES.map((t) => <option key={t} value={t}>{venueTypeMeta(t).label}</option>)}
                </select>
              </div>
              <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Capacity (optional)</label><input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputCls} /></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Amenities (comma-separated, optional)</label><input value={amenities} onChange={(e) => setAmenities(e.target.value)} className={inputCls} placeholder="Projector, AC, Mic" /></div>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
              <button type="button" onClick={submit} disabled={saving || !name.trim()} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Adding…" : "Add venue"}</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
