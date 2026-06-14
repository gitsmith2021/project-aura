// Phase 4C — Hostel domain model + pure occupancy helpers (unit-testable).

export const HOSTEL_TYPES = ["boys", "girls", "co-ed"] as const;
export type HostelType = (typeof HOSTEL_TYPES)[number];

export const ROOM_TYPES = ["single", "double", "triple", "dormitory"] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const ROOM_TYPE_CAPACITY: Record<RoomType, number> = {
  single: 1, double: 2, triple: 3, dormitory: 8,
};

export type Hostel = {
  id: string;
  institution_id: string;
  name: string;
  hostel_type: HostelType;
  warden_id: string | null;
  total_rooms: number | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  hostel_rooms?: { capacity: number; occupied: number }[];
};

export type HostelRoom = {
  id: string;
  hostel_id: string;
  room_number: string;
  floor: number;
  room_type: RoomType;
  capacity: number;
  occupied: number;
  amenities: string[] | null;
};

export type HostelAllocation = {
  id: string;
  hostel_id: string;
  room_id: string;
  student_id: string;
  allocated_from: string;
  allocated_to: string | null;
  status: "active" | "vacated" | "transferred";
};

export const HOSTEL_TYPE_LABEL: Record<HostelType, string> = {
  boys: "Boys", girls: "Girls", "co-ed": "Co-ed",
};

export type OccupancyState = "empty" | "partial" | "full";

export function occupancyState(occupied: number, capacity: number): OccupancyState {
  if (occupied <= 0) return "empty";
  if (occupied >= capacity) return "full";
  return "partial";
}

export function occupancyPct(occupied: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((occupied / capacity) * 100));
}

/** Aggregate room rows into hostel-level stats. */
export function hostelStats(rooms: { capacity: number; occupied: number }[]): {
  rooms: number; capacity: number; occupied: number; available: number; pct: number;
} {
  const capacity = rooms.reduce((s, r) => s + r.capacity, 0);
  const occupied = rooms.reduce((s, r) => s + r.occupied, 0);
  return {
    rooms: rooms.length,
    capacity,
    occupied,
    available: Math.max(0, capacity - occupied),
    pct: occupancyPct(occupied, capacity),
  };
}

/** Group rooms by floor (ascending), each floor's rooms sorted by room_number. */
export function roomsByFloor<T extends { floor: number; room_number: string }>(
  rooms: T[]
): { floor: number; rooms: T[] }[] {
  const map = new Map<number, T[]>();
  for (const r of rooms) {
    const list = map.get(r.floor);
    if (list) list.push(r);
    else map.set(r.floor, [r]);
  }
  return Array.from(map.keys())
    .sort((a, b) => a - b)
    .map((floor) => ({
      floor,
      rooms: map.get(floor)!.sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true })),
    }));
}
