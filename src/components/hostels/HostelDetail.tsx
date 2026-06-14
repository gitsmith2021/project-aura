"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, X, ChevronLeft, BedDouble } from "lucide-react";
import { addRoom, type RoomAllocationView } from "@/actions/hostels";
import {
  ROOM_TYPES, ROOM_TYPE_CAPACITY, HOSTEL_TYPE_LABEL, hostelStats,
  type Hostel, type HostelRoom, type RoomType,
} from "@/lib/hostels";
import { RoomGrid } from "./RoomGrid";
import { AllocationDrawer } from "./AllocationDrawer";

const inputCls =
  "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";

export function HostelDetail({
  institutionId, hostel, initialRooms, initialRosters,
}: {
  institutionId: string;
  hostel: Hostel;
  initialRooms: HostelRoom[];
  initialRosters: Record<string, RoomAllocationView[]>;
}) {
  const [rooms, setRooms] = useState<HostelRoom[]>(initialRooms);
  const [rosters, setRosters] = useState<Record<string, RoomAllocationView[]>>(initialRosters);
  const [selected, setSelected] = useState<HostelRoom | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [roomNumber, setRoomNumber] = useState("");
  const [floor, setFloor] = useState("1");
  const [roomType, setRoomType] = useState<RoomType>("double");
  const [capacity, setCapacity] = useState("2");
  const [saving, setSaving] = useState(false);

  const stats = hostelStats(rooms);

  const submitRoom = async () => {
    setSaving(true); setError(null);
    const res = await addRoom({
      hostelId: hostel.id, institutionId, room_number: roomNumber, floor: parseInt(floor, 10) || 1,
      room_type: roomType, capacity: parseInt(capacity, 10) || ROOM_TYPE_CAPACITY[roomType],
    });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    setRooms((p) => [...p, res.data]);
    setRoomNumber("");
    setAddOpen(false);
  };

  const onAllocated = (roomId: string, view: RoomAllocationView) => {
    setRosters((p) => ({ ...p, [roomId]: [...(p[roomId] ?? []), view] }));
    setRooms((p) => p.map((r) => (r.id === roomId ? { ...r, occupied: r.occupied + 1 } : r)));
  };
  const onVacated = (roomId: string, allocationId: string) => {
    setRosters((p) => ({ ...p, [roomId]: (p[roomId] ?? []).filter((o) => o.allocation_id !== allocationId) }));
    setRooms((p) => p.map((r) => (r.id === roomId ? { ...r, occupied: Math.max(0, r.occupied - 1) } : r)));
  };

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <Link href={`/institutions/${institutionId}/hostels`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2">
        <ChevronLeft size={14} /> Hostels
      </Link>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">{hostel.name}</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {HOSTEL_TYPE_LABEL[hostel.hostel_type]} hostel · {stats.rooms} rooms · {stats.occupied}/{stats.capacity} beds ({stats.pct}% full)
          </p>
        </div>
        <button type="button" onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 border border-purple-700">
          <Plus size={14} strokeWidth={2.5} /> Add Room
        </button>
      </div>

      {error && <p className="mb-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex items-center gap-3 mb-4 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded border border-slate-300 bg-white dark:bg-slate-800" /> Empty</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded border border-amber-300 bg-amber-100" /> Partial</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded border border-rose-300 bg-rose-100" /> Full</span>
        <span className="ml-auto inline-flex items-center gap-1"><BedDouble size={12} /> click a room to allocate / vacate</span>
      </div>

      <RoomGrid rooms={rooms} onSelect={setSelected} />

      {selected && (
        <AllocationDrawer
          institutionId={institutionId}
          hostelId={hostel.id}
          room={selected}
          occupants={rosters[selected.id] ?? []}
          onClose={() => setSelected(null)}
          onAllocated={(view) => onAllocated(selected.id, view)}
          onVacated={(allocationId) => onVacated(selected.id, allocationId)}
        />
      )}

      {addOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setAddOpen(false)} />
          <aside className="relative h-full w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Add Room</h2>
              <button type="button" onClick={() => setAddOpen(false)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Room number</label><input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className={inputCls} placeholder="e.g. 101" /></div>
                <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Floor</label><input type="number" value={floor} onChange={(e) => setFloor(e.target.value)} className={inputCls} /></div>
              </div>
              <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Type</label>
                <select value={roomType} onChange={(e) => { const t = e.target.value as RoomType; setRoomType(t); setCapacity(String(ROOM_TYPE_CAPACITY[t])); }} className={inputCls}>
                  {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Capacity</label><input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputCls} /></div>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setAddOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
              <button type="button" onClick={submitRoom} disabled={saving || !roomNumber.trim()} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Adding…" : "Add room"}</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
