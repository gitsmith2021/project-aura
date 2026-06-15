"use client";

import { useState } from "react";
import { X, Search, UserMinus } from "lucide-react";
import { searchAllocatableStudents, allocateStudent, vacateAllocation, type RoomAllocationView } from "@/actions/hostels";
import { occupancyState, type HostelRoom } from "@/lib/hostels";

export function AllocationDrawer({
  institutionId, hostelId, room, occupants, onClose, onAllocated, onVacated,
}: {
  institutionId: string;
  hostelId: string;
  room: HostelRoom;
  occupants: RoomAllocationView[];
  onClose: () => void;
  onAllocated: (view: RoomAllocationView) => void;
  onVacated: (allocationId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; roll_no: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const full = occupants.length >= room.capacity;
  const state = occupancyState(occupants.length, room.capacity);

  const runSearch = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    const res = await searchAllocatableStudents(institutionId, query);
    setSearching(false);
    if (res.success) setResults(res.data);
  };

  const allocate = async (s: { id: string; name: string; roll_no: string | null }) => {
    setBusy(true); setError(null);
    const res = await allocateStudent({ institutionId, hostelId, roomId: room.id, studentId: s.id });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    onAllocated({ allocation_id: res.data.allocationId, student_id: s.id, student_name: s.name, roll_no: s.roll_no });
    setResults((prev) => prev.filter((r) => r.id !== s.id));
  };

  const vacate = async (allocationId: string) => {
    setBusy(true); setError(null);
    const res = await vacateAllocation({ institutionId, hostelId, allocationId, roomId: room.id });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    onVacated(allocationId);
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <aside className="relative h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Room {room.room_number}</h2>
            <p className="text-[10px] text-slate-400">Floor {room.floor} · {room.room_type} · {occupants.length}/{room.capacity} ({state})</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}

          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">Occupants</p>
            {occupants.length === 0 ? (
              <p className="text-[11px] text-slate-400">Empty room.</p>
            ) : (
              <div className="space-y-1.5">
                {occupants.map((o) => (
                  <div key={o.allocation_id} className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2">
                    <span className="text-xs text-slate-800 dark:text-slate-200">{o.student_name}{o.roll_no ? <span className="text-slate-400"> · {o.roll_no}</span> : null}</span>
                    <button type="button" disabled={busy} onClick={() => vacate(o.allocation_id)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-40">
                      <UserMinus size={12} /> Vacate
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!full ? (
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">Allocate a student</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runSearch()} placeholder="Search student by name…" className="w-full h-9 pl-8 pr-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                </div>
                <button type="button" onClick={runSearch} className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">Search</button>
              </div>
              {searching && <p className="text-[11px] text-slate-400 mt-2">Searching…</p>}
              {results.length > 0 && (
                <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-md divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                  {results.map((s) => (
                    <button key={s.id} type="button" disabled={busy} onClick={() => allocate(s)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-40">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{s.name}</span>
                      {s.roll_no && <span className="text-slate-400"> · {s.roll_no}</span>}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-2">Only students without an existing hostel room are shown.</p>
            </div>
          ) : (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">This room is full. Vacate an occupant to allocate someone new.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
