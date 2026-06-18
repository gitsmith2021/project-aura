import { describe, it, expect } from "vitest";
import {
  VEHICLE_TYPES, VEHICLE_TYPE_LABELS, EXPIRY_WARN_DAYS,
  daysUntil, expiryState, vehicleAlerts, fleetAlerts,
  parseStops, pickupTimeFor, formatTime,
  type VehicleLike,
} from "@/lib/transport";

const TODAY = new Date(2026, 5, 19); // 2026-06-19 (local)

describe("vehicle type labels", () => {
  it("labels every vehicle type", () => {
    for (const t of VEHICLE_TYPES) expect(VEHICLE_TYPE_LABELS[t]).toBeTruthy();
  });
});

describe("daysUntil", () => {
  it("returns null for missing/invalid dates", () => {
    expect(daysUntil(null, TODAY)).toBeNull();
    expect(daysUntil("not-a-date", TODAY)).toBeNull();
  });
  it("counts forward and backward from today", () => {
    expect(daysUntil("2026-06-19", TODAY)).toBe(0);
    expect(daysUntil("2026-06-29", TODAY)).toBe(10);
    expect(daysUntil("2026-06-09", TODAY)).toBe(-10);
  });
});

describe("expiryState", () => {
  it("classifies none/expired/expiring/ok at the 30-day boundary", () => {
    expect(expiryState(null, TODAY)).toBe("none");
    expect(expiryState("2026-06-18", TODAY)).toBe("expired");
    expect(expiryState("2026-06-19", TODAY)).toBe("expiring"); // 0 days
    expect(expiryState(`2026-07-19`, TODAY)).toBe("expiring"); // 30 days
    expect(expiryState("2026-07-20", TODAY)).toBe("ok");       // 31 days
  });
  it("uses EXPIRY_WARN_DAYS as the threshold", () => {
    const edge = new Date(TODAY);
    edge.setDate(edge.getDate() + EXPIRY_WARN_DAYS);
    const iso = edge.toISOString().slice(0, 10);
    expect(expiryState(iso, TODAY)).toBe("expiring");
  });
});

describe("vehicleAlerts / fleetAlerts", () => {
  const fleet: VehicleLike[] = [
    { vehicle_number: "TN01A1", insurance_expiry: "2026-06-10", fitness_expiry: "2027-01-01" }, // ins expired
    { vehicle_number: "TN02B2", insurance_expiry: "2026-07-01", fitness_expiry: "2026-06-25" }, // both expiring
    { vehicle_number: "TN03C3", insurance_expiry: "2027-01-01", fitness_expiry: null },          // none
  ];

  it("flags only expired/expiring certificates", () => {
    expect(vehicleAlerts(fleet[0], TODAY)).toEqual([
      { vehicleNumber: "TN01A1", kind: "insurance", state: "expired", date: "2026-06-10", days: -9 },
    ]);
    expect(vehicleAlerts(fleet[2], TODAY)).toEqual([]);
  });

  it("produces two alerts when both certs are due", () => {
    expect(vehicleAlerts(fleet[1], TODAY)).toHaveLength(2);
  });

  it("sorts fleet alerts expired/soonest first", () => {
    const alerts = fleetAlerts(fleet, TODAY);
    expect(alerts[0].days).toBe(-9); // expired insurance first
    // remaining sorted ascending by days
    const days = alerts.map((a) => a.days);
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });
});

describe("parseStops", () => {
  it("returns [] for non-arrays", () => {
    expect(parseStops(null)).toEqual([]);
    expect(parseStops("x")).toEqual([]);
  });
  it("keeps well-formed named stops and drops nameless ones", () => {
    const stops = parseStops([
      { name: "Gandhi Road", pickup_time: "07:30", lat: 11.1, lng: 77.2 },
      { name: "", pickup_time: "07:40" },
      { pickup_time: "07:50" },
      "garbage",
    ]);
    expect(stops).toEqual([{ name: "Gandhi Road", pickup_time: "07:30", lat: 11.1, lng: 77.2 }]);
  });
});

describe("pickupTimeFor", () => {
  const stops = parseStops([
    { name: "Gandhi Road", pickup_time: "07:30" },
    { name: "Market", pickup_time: "07:45" },
  ]);
  it("matches case-insensitively", () => {
    expect(pickupTimeFor(stops, "gandhi road")).toBe("07:30");
  });
  it("returns null for unknown/empty stop", () => {
    expect(pickupTimeFor(stops, "Unknown")).toBeNull();
    expect(pickupTimeFor(stops, null)).toBeNull();
  });
});

describe("formatTime", () => {
  it("formats 24h to 12h", () => {
    expect(formatTime("07:30")).toBe("7:30 AM");
    expect(formatTime("13:05")).toBe("1:05 PM");
    expect(formatTime("00:15")).toBe("12:15 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
  });
  it("handles empty/odd input", () => {
    expect(formatTime(null)).toBe("—");
    expect(formatTime("nonsense")).toBe("nonsense");
  });
});
