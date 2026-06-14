import { describe, it, expect } from "vitest";
import {
  overlaps, hasConflict, isValidRange, venueColorIndex, dayKey, venueTypeMeta,
  type BookingStatus,
} from "@/lib/venueBookings";

const T = (h: number) => `2026-06-20T${String(h).padStart(2, "0")}:00:00Z`;

describe("overlaps", () => {
  it("detects overlapping ranges", () => {
    expect(overlaps(T(9), T(11), T(10), T(12))).toBe(true);
    expect(overlaps(T(9), T(12), T(10), T(11))).toBe(true); // contained
  });
  it("treats touching edges as non-overlapping", () => {
    expect(overlaps(T(9), T(10), T(10), T(11))).toBe(false);
  });
  it("returns false for disjoint ranges", () => {
    expect(overlaps(T(9), T(10), T(11), T(12))).toBe(false);
  });
});

describe("hasConflict", () => {
  const existing = [
    { id: "a", start_datetime: T(9), end_datetime: T(11), status: "approved" as BookingStatus },
    { id: "b", start_datetime: T(14), end_datetime: T(16), status: "pending" as BookingStatus },
    { id: "c", start_datetime: T(9), end_datetime: T(17), status: "cancelled" as BookingStatus },
    { id: "d", start_datetime: T(9), end_datetime: T(17), status: "rejected" as BookingStatus },
  ];

  it("conflicts with approved + pending bookings", () => {
    expect(hasConflict(T(10), T(12), existing)).toBe(true);   // hits approved a
    expect(hasConflict(T(15), T(16), existing)).toBe(true);   // hits pending b
  });
  it("ignores cancelled / rejected bookings", () => {
    expect(hasConflict(T(12), T(13), existing)).toBe(false);  // only c/d (cancelled/rejected) cover gap
  });
  it("can skip a booking by id (approval re-check)", () => {
    expect(hasConflict(T(9), T(11), existing, { ignoreId: "a" })).toBe(false);
  });
});

describe("isValidRange", () => {
  it("requires end strictly after start", () => {
    expect(isValidRange(T(9), T(10))).toBe(true);
    expect(isValidRange(T(10), T(10))).toBe(false);
    expect(isValidRange(T(11), T(10))).toBe(false);
  });
});

describe("venueColorIndex", () => {
  it("is deterministic and within range", () => {
    const a = venueColorIndex("venue-123", 6);
    expect(a).toBe(venueColorIndex("venue-123", 6));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(6);
  });
});

describe("dayKey / venueTypeMeta", () => {
  it("formats a local day key", () => {
    expect(dayKey("2026-06-20T09:00:00")).toBe("2026-06-20");
  });
  it("maps venue type with a fallback", () => {
    expect(venueTypeMeta("auditorium").label).toBe("Auditorium");
    expect(venueTypeMeta("nope")).toEqual(venueTypeMeta("other"));
  });
});
