import { describe, it, expect } from "vitest";
import {
  messPlanDefaultAmount, priorityRank, sortMaintenance, currentMonth, monthLabel,
  type MaintenanceStatus, type MaintenancePriority,
} from "@/lib/messMaintenance";

describe("messPlanDefaultAmount", () => {
  it("returns plan defaults", () => {
    expect(messPlanDefaultAmount("full")).toBe(3000);
    expect(messPlanDefaultAmount("veg_only")).toBe(2500);
    expect(messPlanDefaultAmount("custom")).toBe(0);
  });
});

describe("priorityRank", () => {
  it("orders urgent < normal < low", () => {
    expect(priorityRank("urgent")).toBeLessThan(priorityRank("normal"));
    expect(priorityRank("normal")).toBeLessThan(priorityRank("low"));
  });
});

describe("sortMaintenance", () => {
  it("puts open/in-progress first, then urgent, then newest", () => {
    const row = (id: string, status: MaintenanceStatus, priority: MaintenancePriority, created_at: string) =>
      ({ id, status, priority, created_at });
    const list = [
      row("a", "resolved", "urgent", "2026-06-10T00:00:00Z"),
      row("b", "open", "low", "2026-06-09T00:00:00Z"),
      row("c", "open", "urgent", "2026-06-08T00:00:00Z"),
      row("d", "in_progress", "normal", "2026-06-07T00:00:00Z"),
    ];
    expect(sortMaintenance(list).map((r) => r.id)).toEqual(["c", "b", "d", "a"]);
  });
});

describe("month helpers", () => {
  it("formats current month as YYYY-MM", () => {
    expect(currentMonth(new Date(2026, 5, 14))).toBe("2026-06");
  });
  it("labels a month", () => {
    expect(monthLabel("2026-06")).toBe("June 2026");
    expect(monthLabel("bad")).toBe("bad");
  });
});
