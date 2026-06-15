import { describe, it, expect } from "vitest";
import {
  daysOverdue, calculateFine, lendingStatus, isAvailable, availabilityLabel, addDays,
  FINE_PER_DAY,
} from "@/lib/library";

const NOW = new Date(2026, 5, 20, 12, 0, 0); // 20 Jun 2026, local noon

describe("daysOverdue", () => {
  it("is 0 on or before the due date", () => {
    expect(daysOverdue("2026-06-20", NOW)).toBe(0);
    expect(daysOverdue("2026-06-25", NOW)).toBe(0);
  });
  it("counts whole days past due", () => {
    expect(daysOverdue("2026-06-13", NOW)).toBe(7);
    expect(daysOverdue("2026-06-19", NOW)).toBe(1);
  });
});

describe("calculateFine", () => {
  it("is 0 when returned on time", () => {
    expect(calculateFine("2026-06-20", "2026-06-18")).toBe(0);
  });
  it("charges the daily rate to the return date", () => {
    expect(calculateFine("2026-06-13", "2026-06-20")).toBe(7 * FINE_PER_DAY);
    expect(calculateFine("2026-06-13", "2026-06-20", 5)).toBe(35);
  });
  it("accrues to asOf when still unreturned", () => {
    expect(calculateFine("2026-06-13", null, FINE_PER_DAY, NOW)).toBe(14);
    expect(calculateFine("2026-06-25", null, FINE_PER_DAY, NOW)).toBe(0);
  });
});

describe("lendingStatus", () => {
  it("returns 'returned' / 'lost' from stored state", () => {
    expect(lendingStatus({ returned_date: "2026-06-19", status: "returned", due_date: "2026-06-13" }, NOW)).toBe("returned");
    expect(lendingStatus({ returned_date: null, status: "lost", due_date: "2026-06-13" }, NOW)).toBe("lost");
  });
  it("derives overdue vs issued for an open loan", () => {
    expect(lendingStatus({ returned_date: null, status: "issued", due_date: "2026-06-13" }, NOW)).toBe("overdue");
    expect(lendingStatus({ returned_date: null, status: "issued", due_date: "2026-06-25" }, NOW)).toBe("issued");
  });
});

describe("availability helpers", () => {
  it("isAvailable / availabilityLabel", () => {
    expect(isAvailable({ available_copies: 0 })).toBe(false);
    expect(isAvailable({ available_copies: 3 })).toBe(true);
    expect(availabilityLabel(2, 5)).toBe("2 / 5 available");
    expect(availabilityLabel(-1, 5)).toBe("0 / 5 available");
  });
});

describe("addDays", () => {
  it("returns an ISO date N days out", () => {
    expect(addDays(14, new Date(2026, 5, 1))).toBe("2026-06-15");
  });
});
