import { describe, it, expect } from "vitest";
import { occupancyState, occupancyPct, hostelStats, roomsByFloor } from "@/lib/hostels";

describe("occupancyState", () => {
  it("classifies empty / partial / full", () => {
    expect(occupancyState(0, 2)).toBe("empty");
    expect(occupancyState(1, 2)).toBe("partial");
    expect(occupancyState(2, 2)).toBe("full");
    expect(occupancyState(3, 2)).toBe("full"); // over-capacity still full
  });
});

describe("occupancyPct", () => {
  it("computes a clamped percentage", () => {
    expect(occupancyPct(1, 4)).toBe(25);
    expect(occupancyPct(0, 0)).toBe(0);
    expect(occupancyPct(5, 4)).toBe(100);
  });
});

describe("hostelStats", () => {
  it("aggregates room rows", () => {
    const s = hostelStats([
      { capacity: 2, occupied: 2 },
      { capacity: 3, occupied: 1 },
      { capacity: 1, occupied: 0 },
    ]);
    expect(s).toEqual({ rooms: 3, capacity: 6, occupied: 3, available: 3, pct: 50 });
  });
  it("handles no rooms", () => {
    expect(hostelStats([])).toEqual({ rooms: 0, capacity: 0, occupied: 0, available: 0, pct: 0 });
  });
});

describe("roomsByFloor", () => {
  it("groups by floor ascending, rooms numerically sorted", () => {
    const grouped = roomsByFloor([
      { floor: 2, room_number: "201" },
      { floor: 1, room_number: "102" },
      { floor: 1, room_number: "101" },
      { floor: 1, room_number: "10" },
    ]);
    expect(grouped.map((g) => g.floor)).toEqual([1, 2]);
    expect(grouped[0].rooms.map((r) => r.room_number)).toEqual(["10", "101", "102"]);
  });
});
