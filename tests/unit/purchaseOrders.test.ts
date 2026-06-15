import { describe, it, expect } from "vitest";
import {
  lineItemTotal, poTotal, normaliseLineItem, formatPoNumber,
  nextStatus, canCancel, hasReached, poStats,
} from "@/lib/purchaseOrders";

describe("line item + PO totals", () => {
  it("computes a line total", () => {
    expect(lineItemTotal({ qty: 3, unit_price: 250 })).toBe(750);
    expect(lineItemTotal({ qty: 2.5, unit_price: 10 })).toBe(25);
  });
  it("sums line items into a PO total (recomputed)", () => {
    expect(poTotal([{ qty: 3, unit_price: 250 }, { qty: 1, unit_price: 100 }])).toBe(850);
    expect(poTotal([])).toBe(0);
  });
  it("rounds to 2 decimals", () => {
    expect(poTotal([{ qty: 3, unit_price: 0.1 }])).toBe(0.3);
  });
});

describe("normaliseLineItem", () => {
  it("trims, defaults unit, and computes total", () => {
    expect(normaliseLineItem({ name: " Beaker ", qty: 12, unit_price: 40 }))
      .toEqual({ name: "Beaker", qty: 12, unit: "pcs", unit_price: 40, total: 480 });
  });
  it("keeps an explicit unit", () => {
    expect(normaliseLineItem({ name: "Ethanol", qty: 500, unit: "ml", unit_price: 2 }).unit).toBe("ml");
  });
});

describe("formatPoNumber", () => {
  it("zero-pads the sequence to 4 digits", () => {
    expect(formatPoNumber(2026, 1)).toBe("PO-2026-0001");
    expect(formatPoNumber(2026, 42)).toBe("PO-2026-0042");
    expect(formatPoNumber(2026, 12345)).toBe("PO-2026-12345");
  });
});

describe("nextStatus", () => {
  it("advances along the happy path", () => {
    expect(nextStatus("draft")).toBe("submitted");
    expect(nextStatus("submitted")).toBe("approved");
    expect(nextStatus("approved")).toBe("received");
    expect(nextStatus("received")).toBe("paid");
  });
  it("is null at terminal states", () => {
    expect(nextStatus("paid")).toBeNull();
    expect(nextStatus("cancelled")).toBeNull();
  });
});

describe("canCancel", () => {
  it("allows cancel until received", () => {
    expect(canCancel("draft")).toBe(true);
    expect(canCancel("submitted")).toBe(true);
    expect(canCancel("approved")).toBe(true);
    expect(canCancel("received")).toBe(false);
    expect(canCancel("paid")).toBe(false);
    expect(canCancel("cancelled")).toBe(false);
  });
});

describe("hasReached", () => {
  it("is monotonic along the flow", () => {
    expect(hasReached("approved", "submitted")).toBe(true);
    expect(hasReached("approved", "approved")).toBe(true);
    expect(hasReached("approved", "received")).toBe(false);
  });
  it("cancelled has reached nothing", () => {
    expect(hasReached("cancelled", "draft")).toBe(false);
  });
});

describe("poStats", () => {
  it("rolls up counters and value, excluding cancelled from value", () => {
    const s = poStats([
      { status: "submitted", total_amount: 1000 },
      { status: "approved", total_amount: 2000 },
      { status: "received", total_amount: 500 },
      { status: "paid", total_amount: 3000 },
      { status: "cancelled", total_amount: 9999 },
    ]);
    expect(s.total).toBe(5);
    expect(s.totalValue).toBe(6500); // excludes cancelled
    expect(s.pendingApproval).toBe(1); // submitted
    expect(s.awaitingPayment).toBe(2); // approved + received
    expect(s.open).toBe(3); // not paid, not cancelled
  });
});
