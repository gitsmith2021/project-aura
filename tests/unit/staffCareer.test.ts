import { describe, it, expect } from "vitest";
import {
  serviceYears, formatServiceYears, isOffboardingEvent, sortEventsByDate,
  careerStats, filterCareerEvents, careerEventsCSV,
  CAREER_EVENT_TYPES, CAREER_EVENT_LABELS,
  type StaffCareerEvent, type CareerEventType,
} from "@/lib/staffCareer";

function evt(over: Partial<StaffCareerEvent>): StaffCareerEvent {
  return {
    id: Math.random().toString(36).slice(2),
    institution_id: "i1",
    staff_id: "s1",
    event_type: "joining",
    effective_date: "2020-01-01",
    previous_value: null,
    new_value: null,
    order_number: null,
    document_url: null,
    remarks: null,
    recorded_by: null,
    created_at: "2020-01-01T00:00:00Z",
    staff: { full_name: "Jane Doe", designation: "Assistant Professor", department_id: "d1", departments: { name: "Computer Science" } },
    ...over,
  };
}

describe("serviceYears", () => {
  it("returns null for missing or invalid dates", () => {
    expect(serviceYears(null)).toBeNull();
    expect(serviceYears(undefined)).toBeNull();
    expect(serviceYears("not-a-date")).toBeNull();
  });

  it("computes years between joining and asOf", () => {
    const asOf = new Date(2025, 0, 1); // 1 Jan 2025
    expect(serviceYears("2020-01-01", asOf)).toBe(5);
  });

  it("returns 0 for a future joining date", () => {
    const asOf = new Date(2020, 0, 1);
    expect(serviceYears("2025-01-01", asOf)).toBe(0);
  });

  it("returns fractional years for partial service", () => {
    const asOf = new Date(2020, 6, 2); // ~6 months after 2020-01-01
    const years = serviceYears("2020-01-01", asOf);
    expect(years).toBeGreaterThan(0.4);
    expect(years).toBeLessThan(0.6);
  });
});

describe("formatServiceYears", () => {
  it("handles null", () => {
    expect(formatServiceYears(null)).toBe("—");
  });
  it("handles sub-year service", () => {
    expect(formatServiceYears(0.5)).toBe("< 1 year");
  });
  it("pluralizes correctly", () => {
    expect(formatServiceYears(1)).toBe("1 year");
    expect(formatServiceYears(5.3)).toBe("5.3 years");
  });
});

describe("isOffboardingEvent", () => {
  it("flags resignation, retirement, termination", () => {
    expect(isOffboardingEvent("resignation")).toBe(true);
    expect(isOffboardingEvent("retirement")).toBe(true);
    expect(isOffboardingEvent("termination")).toBe(true);
  });
  it("does not flag other event types", () => {
    expect(isOffboardingEvent("joining")).toBe(false);
    expect(isOffboardingEvent("promotion")).toBe(false);
    expect(isOffboardingEvent("increment")).toBe(false);
    expect(isOffboardingEvent("transfer")).toBe(false);
    expect(isOffboardingEvent("confirmation")).toBe(false);
    expect(isOffboardingEvent("other")).toBe(false);
  });
});

describe("sortEventsByDate", () => {
  it("sorts chronologically, oldest first", () => {
    const events = [
      evt({ id: "c", effective_date: "2023-01-01" }),
      evt({ id: "a", effective_date: "2020-01-01" }),
      evt({ id: "b", effective_date: "2021-06-15" }),
    ];
    const sorted = sortEventsByDate(events);
    expect(sorted.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the input array", () => {
    const events = [evt({ id: "b", effective_date: "2021-01-01" }), evt({ id: "a", effective_date: "2020-01-01" })];
    const original = [...events];
    sortEventsByDate(events);
    expect(events).toEqual(original);
  });
});

describe("careerStats", () => {
  it("counts events by type", () => {
    const events = [
      evt({ event_type: "promotion" }),
      evt({ event_type: "promotion" }),
      evt({ event_type: "increment" }),
      evt({ event_type: "resignation" }),
      evt({ event_type: "retirement" }),
    ];
    const stats = careerStats(events);
    expect(stats.total).toBe(5);
    expect(stats.promotions).toBe(2);
    expect(stats.increments).toBe(1);
    expect(stats.offboarded).toBe(2);
    expect(stats.byType.promotion).toBe(2);
  });

  it("handles empty input", () => {
    const stats = careerStats([]);
    expect(stats.total).toBe(0);
    expect(stats.promotions).toBe(0);
    expect(stats.offboarded).toBe(0);
    for (const t of CAREER_EVENT_TYPES) expect(stats.byType[t]).toBe(0);
  });
});

describe("filterCareerEvents", () => {
  const events = [
    evt({ id: "1", event_type: "promotion", staff: { full_name: "Alice Smith", designation: null, department_id: "d1", departments: null } }),
    evt({ id: "2", event_type: "increment", order_number: "HR/2026/099", staff: { full_name: "Bob Jones", designation: null, department_id: "d1", departments: null } }),
    evt({ id: "3", event_type: "transfer", new_value: "Physics", staff: { full_name: "Carol White", designation: null, department_id: "d2", departments: null } }),
  ];

  it("filters by event type", () => {
    const result = filterCareerEvents(events, { eventType: "promotion" });
    expect(result.map((e) => e.id)).toEqual(["1"]);
  });

  it("'all' event type returns everything", () => {
    expect(filterCareerEvents(events, { eventType: "all" })).toHaveLength(3);
  });

  it("searches by staff name", () => {
    const result = filterCareerEvents(events, { search: "bob" });
    expect(result.map((e) => e.id)).toEqual(["2"]);
  });

  it("searches by order number", () => {
    const result = filterCareerEvents(events, { search: "HR/2026" });
    expect(result.map((e) => e.id)).toEqual(["2"]);
  });

  it("searches by new value", () => {
    const result = filterCareerEvents(events, { search: "physics" });
    expect(result.map((e) => e.id)).toEqual(["3"]);
  });

  it("combines type and search filters", () => {
    const result = filterCareerEvents(events, { eventType: "increment", search: "bob" });
    expect(result.map((e) => e.id)).toEqual(["2"]);
  });
});

describe("careerEventsCSV", () => {
  it("produces a header row and one row per event", () => {
    const events = [
      evt({ event_type: "promotion", previous_value: "Lecturer", new_value: "Assistant Professor", order_number: "HR/1" }),
    ];
    const csv = careerEventsCSV(events);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Staff");
    expect(lines[1]).toContain("Jane Doe");
    expect(lines[1]).toContain(CAREER_EVENT_LABELS.promotion);
  });

  it("escapes commas and quotes in fields", () => {
    const events = [evt({ remarks: 'Contains, a comma and "quotes"' })];
    const csv = careerEventsCSV(events);
    expect(csv).toContain('"Contains, a comma and ""quotes"""');
  });

  it("handles empty events list", () => {
    const csv = careerEventsCSV([]);
    expect(csv.split("\n")).toHaveLength(1); // header only
  });
});

describe("CAREER_EVENT_TYPES / CAREER_EVENT_LABELS coverage", () => {
  it("every event type has a label", () => {
    const types: CareerEventType[] = CAREER_EVENT_TYPES;
    for (const t of types) expect(CAREER_EVENT_LABELS[t]).toBeTruthy();
  });
});
