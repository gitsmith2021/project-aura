import { describe, it, expect } from "vitest";
import {
  isOpenStatus, filterIncidents, disciplinaryStats, byTypeBreakdown, incidentsCSV,
  INCIDENT_TYPES, INCIDENT_STATUSES, ACTION_TYPES,
  type DisciplinaryIncident,
} from "@/lib/disciplinary";

function inc(over: Partial<DisciplinaryIncident>): DisciplinaryIncident {
  return {
    id: Math.random().toString(36).slice(2),
    institution_id: "i1", reported_by: null, student_id: null,
    incident_type: "misconduct", incident_date: "2026-06-01", location: null,
    description: "x", is_anonymous: false, status: "reported",
    committee_remarks: null, action_taken: null, resolved_at: null, created_at: "2026-06-01",
    students: null, ...over,
  };
}

describe("enum coverage", () => {
  it("has the expected counts", () => {
    expect(INCIDENT_TYPES).toHaveLength(6);
    expect(INCIDENT_STATUSES).toHaveLength(4);
    expect(ACTION_TYPES).toHaveLength(7);
  });
});

describe("isOpenStatus", () => {
  it("treats reported/under_review as open", () => {
    expect(isOpenStatus("reported")).toBe(true);
    expect(isOpenStatus("under_review")).toBe(true);
    expect(isOpenStatus("resolved")).toBe(false);
    expect(isOpenStatus("escalated")).toBe(false);
  });
});

describe("filterIncidents", () => {
  const rows = [
    inc({ incident_type: "ragging", status: "reported", description: "hostel night", students: { full_name: "Asha", roll_no: "22CS01" } }),
    inc({ incident_type: "misconduct", status: "resolved", location: "library" }),
    inc({ incident_type: "ragging", status: "escalated" }),
  ];
  it("filters by type and status", () => {
    expect(filterIncidents(rows, { type: "ragging" })).toHaveLength(2);
    expect(filterIncidents(rows, { status: "resolved" })).toHaveLength(1);
  });
  it("respects 'all' and combines", () => {
    expect(filterIncidents(rows, { type: "all", status: "all" })).toHaveLength(3);
    expect(filterIncidents(rows, { type: "ragging", status: "escalated" })).toHaveLength(1);
  });
  it("searches description, student and location", () => {
    expect(filterIncidents(rows, { search: "hostel" })).toHaveLength(1);
    expect(filterIncidents(rows, { search: "asha" }).map((r) => r.incident_type)).toEqual(["ragging"]);
    expect(filterIncidents(rows, { search: "library" })).toHaveLength(1);
  });
});

describe("disciplinaryStats", () => {
  it("counts open/resolved/escalated/ragging and resolution rate", () => {
    const s = disciplinaryStats([
      inc({ status: "reported", incident_type: "ragging" }),
      inc({ status: "under_review", incident_type: "misconduct" }),
      inc({ status: "resolved", incident_type: "ragging" }),
      inc({ status: "escalated", incident_type: "property_damage" }),
    ]);
    expect(s.total).toBe(4);
    expect(s.open).toBe(2);
    expect(s.resolved).toBe(1);
    expect(s.escalated).toBe(1);
    expect(s.raggingCases).toBe(2);
    expect(s.resolutionRate).toBe(25);
  });
  it("resolution rate is 0 with no incidents", () => {
    expect(disciplinaryStats([]).resolutionRate).toBe(0);
  });
});

describe("byTypeBreakdown", () => {
  it("counts per type, descending", () => {
    const out = byTypeBreakdown([
      inc({ incident_type: "ragging" }), inc({ incident_type: "ragging" }), inc({ incident_type: "misconduct" }),
    ]);
    expect(out[0]).toMatchObject({ type: "ragging", count: 2 });
    expect(out[1]).toMatchObject({ type: "misconduct", count: 1 });
  });
});

describe("incidentsCSV", () => {
  it("emits header, masks anonymous student, escapes commas", () => {
    const csv = incidentsCSV([
      inc({ incident_type: "ragging", status: "resolved", incident_date: "2026-06-01", action_taken: "Warning, written", is_anonymous: true, students: { full_name: "Secret", roll_no: "X" } }),
      inc({ incident_type: "misconduct", status: "reported", students: { full_name: "Bala", roll_no: "22CS02" } }),
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Date,Type,Student,Status,Action Taken,Anonymous");
    expect(lines[1]).toContain("Ragging");
    expect(lines[1]).toContain('"Warning, written"');
    expect(lines[1]).toContain("Yes");
    expect(lines[1]).not.toContain("Secret"); // anonymous → masked
    expect(lines[2]).toContain("Bala");
  });
});
