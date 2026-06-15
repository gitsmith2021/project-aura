import { describe, it, expect } from "vitest";
import {
  isLowStock, effectiveStatus, totalMaintenanceCost, availableStock,
  canAllocate, allocationTargetName,
} from "@/lib/assets";

describe("isLowStock", () => {
  it("is false when no reorder level is set", () => {
    expect(isLowStock({ current_stock: 0, reorder_level: null })).toBe(false);
  });
  it("is true at or below the reorder level", () => {
    expect(isLowStock({ current_stock: 5, reorder_level: 5 })).toBe(true);
    expect(isLowStock({ current_stock: 3, reorder_level: 5 })).toBe(true);
  });
  it("is false above the reorder level", () => {
    expect(isLowStock({ current_stock: 6, reorder_level: 5 })).toBe(false);
  });
});

describe("effectiveStatus", () => {
  it("respects disposed / maintenance regardless of stock", () => {
    expect(effectiveStatus({ status: "disposed", current_stock: 0, reorder_level: 5 })).toBe("disposed");
    expect(effectiveStatus({ status: "maintenance", current_stock: 0, reorder_level: 5 })).toBe("maintenance");
  });
  it("derives low_stock from stock vs reorder for active assets", () => {
    expect(effectiveStatus({ status: "active", current_stock: 2, reorder_level: 5 })).toBe("low_stock");
    expect(effectiveStatus({ status: "active", current_stock: 9, reorder_level: 5 })).toBe("active");
  });
  it("treats a stored low_stock asset by its live stock", () => {
    expect(effectiveStatus({ status: "low_stock", current_stock: 9, reorder_level: 5 })).toBe("active");
  });
});

describe("totalMaintenanceCost", () => {
  it("sums costs treating null as 0", () => {
    expect(totalMaintenanceCost([{ cost: 100 }, { cost: null }, { cost: 250 }])).toBe(350);
    expect(totalMaintenanceCost([])).toBe(0);
  });
});

describe("availableStock / canAllocate", () => {
  it("never returns negative available stock", () => {
    expect(availableStock({ current_stock: -3 })).toBe(0);
    expect(availableStock({ current_stock: 7 })).toBe(7);
  });
  it("allows allocation only within available stock", () => {
    expect(canAllocate({ current_stock: 5 }, 5)).toBe(true);
    expect(canAllocate({ current_stock: 5 }, 6)).toBe(false);
    expect(canAllocate({ current_stock: 5 }, 0)).toBe(false);
    expect(canAllocate({ current_stock: 0 }, 1)).toBe(false);
  });
});

describe("allocationTargetName", () => {
  it("resolves the right target by type", () => {
    expect(allocationTargetName({ allocated_to_type: "laboratory", laboratories: { name: "Physics Lab" } })).toBe("Physics Lab");
    expect(allocationTargetName({ allocated_to_type: "department", departments: { name: "Chemistry" } })).toBe("Chemistry");
    expect(allocationTargetName({ allocated_to_type: "staff", staff: { full_name: "Dr. Rao" } })).toBe("Dr. Rao");
  });
  it("falls back to a label when the relation is missing", () => {
    expect(allocationTargetName({ allocated_to_type: "laboratory" })).toBe("Laboratory");
  });
});
