"use client";

import { occupancyState, roomsByFloor, type HostelRoom } from "@/lib/hostels";

const STATE_CLS: Record<string, string> = {
  empty: "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-700",
  partial: "border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/25 text-amber-800 dark:text-amber-300 hover:border-amber-400",
  full: "border-rose-300 dark:border-rose-700/60 bg-rose-50 dark:bg-rose-950/25 text-rose-800 dark:text-rose-300 hover:border-rose-400",
};

export function RoomGrid({ rooms, onSelect }: { rooms: HostelRoom[]; onSelect: (room: HostelRoom) => void }) {
  if (rooms.length === 0) {
    return <p className="text-center text-xs text-slate-400 py-10">No rooms yet — add rooms to start allocating.</p>;
  }
  const floors = roomsByFloor(rooms);

  return (
    <div className="space-y-5">
      {floors.map(({ floor, rooms: fRooms }) => (
        <div key={floor}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Floor {floor}</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {fRooms.map((r) => {
              const state = occupancyState(r.occupied, r.capacity);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onSelect(r)}
                  title={`${r.room_number} · ${r.room_type} · ${r.occupied}/${r.capacity}`}
                  className={`rounded-lg border p-2 text-left transition-colors ${STATE_CLS[state]}`}
                >
                  <div className="text-xs font-bold leading-tight truncate">{r.room_number}</div>
                  <div className="text-[10px] opacity-80 mt-0.5">{r.occupied}/{r.capacity}</div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
