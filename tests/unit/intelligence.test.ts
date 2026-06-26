import { describe, it, expect } from "vitest";
import { extractSlots, matchIntent } from "@/lib/intelligence/matcher";
import { composeDashboard, formatValue, sumOf, sumWhere, ratioPct } from "@/lib/intelligence/composer";
import { INTENTS } from "@/lib/intelligence/registry";
import type { DashboardSpec } from "@/lib/intelligence/types";
import type { ResultRow } from "@/lib/dataExplorer";

describe("extractSlots", () => {
  const now = new Date("2026-09-15T00:00:00Z"); // mid-AY (Jun 2026 → May 2027)
  it("extracts a 'below N%' threshold", () => {
    expect(extractSlots("students below 75% attendance").threshold).toBe(75);
    expect(extractSlots("show admissions").threshold).toBeNull();
  });
  it("maps 'this academic year' to a June→May range", () => {
    const r = extractSlots("fee collection this academic year", now).timeRange;
    expect(r?.from).toBe("2026-06-01");
    expect(r?.to).toBe("2027-05-31");
  });
  it("detects grouping + comparison", () => {
    const s = extractSlots("compare admissions by department vs last year");
    expect(s.groupBy).toBe("department");
    expect(s.comparison).toBe(true);
  });
});

describe("matchIntent", () => {
  it("routes fee questions to fee_collection for an admin", () => {
    const m = matchIntent("what is the fee collection status", INTENTS, "INST_ADMIN");
    expect(m?.intent.id).toBe("finance.fee_collection");
  });
  it("routes admissions questions to admissions.overview", () => {
    expect(matchIntent("show departments with low admissions", INTENTS, "PRINCIPAL")?.intent.id).toBe("admissions.overview");
  });
  it("routes enrolment questions to people.enrollment", () => {
    expect(matchIntent("how many students do we have", INTENTS, "IQAC")?.intent.id).toBe("people.enrollment");
  });
  it("routes attendance questions to attendance_risk (over enrollment)", () => {
    expect(matchIntent("show students below 75% attendance", INTENTS, "INST_ADMIN")?.intent.id).toBe("academics.attendance_risk");
  });
  it("routes faculty questions to people.faculty", () => {
    expect(matchIntent("how many faculty do we have", INTENTS, "INST_ADMIN")?.intent.id).toBe("people.faculty");
  });
  it("returns null for an unknown question", () => {
    expect(matchIntent("what is the weather today", INTENTS, "INST_ADMIN")).toBeNull();
  });
  it("respects role permissions (a student can't run fee collection)", () => {
    expect(matchIntent("fee collection", INTENTS, "STUDENT")).toBeNull();
  });
  it("attendance risk is admin-scoped — never served to a principal (who can't read attendance)", () => {
    // A principal may still match a permitted intent (e.g. enrollment via 'students'),
    // but must NEVER be routed to attendance_risk.
    expect(matchIntent("students below 75% attendance", INTENTS, "PRINCIPAL")?.intent.id).not.toBe("academics.attendance_risk");
    expect(matchIntent("students below 75% attendance", INTENTS, "INST_ADMIN")?.intent.id).toBe("academics.attendance_risk");
  });
});

describe("composer KPI helpers", () => {
  const rows: ResultRow[] = [
    { payment_status: "completed", total: 800, n: 80 },
    { payment_status: "pending", total: 200, n: 20 },
  ];
  it("sumOf / sumWhere / ratioPct", () => {
    expect(sumOf("total")(rows)).toBe(1000);
    expect(sumWhere("total", "payment_status", "completed")(rows)).toBe(800);
    expect(ratioPct("total", "payment_status", "completed", ["completed", "pending"])(rows)).toBe(80);
  });
  it("formatValue formats currency / percent / number", () => {
    expect(formatValue(101990, "currency")).toBe("₹1,01,990");
    expect(formatValue(87.3, "percent")).toBe("87.3%");
    expect(formatValue(1234, "number")).toBe("1,234");
    expect(formatValue(null, "number")).toBe("—");
  });
});

describe("composeDashboard", () => {
  const spec: DashboardSpec = {
    kpis: [{ label: "Collected", fromQuery: "s", compute: sumWhere("total", "payment_status", "completed"), format: "currency" }],
    widgets: [{ type: "donut", title: "By status", fromQuery: "s", category: "payment_status", value: "total" }],
  };
  const datasets = new Map<string, ResultRow[]>([["s", [
    { payment_status: "completed", total: 800 },
    { payment_status: "pending", total: 200 },
  ]]]);
  it("computes KPI display + shapes widgets, sorted by value", () => {
    const d = composeDashboard(spec, datasets);
    expect(d.kpis[0].display).toBe("₹800");
    expect(d.empty).toBe(false);
    expect(d.widgets[0].rows[0].payment_status).toBe("completed"); // highest value first
  });
  it("flags empty when all datasets are empty", () => {
    expect(composeDashboard(spec, new Map([["s", []]])).empty).toBe(true);
  });
});

describe("registry intents are well-formed", () => {
  it("every intent builds queries + a dashboard and has followups", () => {
    for (const intent of INTENTS) {
      const { queries, dashboard } = intent.build({ question: "", threshold: null, timeRange: null, groupBy: null, comparison: false }, { role: "INST_ADMIN", institutionId: "x" });
      expect(queries.length).toBeGreaterThan(0);
      expect(dashboard.kpis.length + dashboard.widgets.length).toBeGreaterThan(0);
      expect(intent.followups.length).toBeGreaterThan(0);
      // queries only reference CF-2 entities
      for (const q of queries) expect(["fee_payments", "admissions", "students", "staff", "departments", "student_attendance"]).toContain(q.model.entity);
    }
  });
});
