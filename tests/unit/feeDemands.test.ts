import { describe, it, expect } from "vitest";
import {
  balance, demandStatus, isOverdue, daysOverdue, concessionFor, demandTally,
  type DemandStoredStatus,
} from "@/lib/feeDemands";

const NOW = new Date("2026-06-15T12:00:00.000Z");
const d = (net: number, status: DemandStoredStatus, due: string) => ({ net_due: net, status, due_date: due });

describe("balance", () => {
  it("never goes negative and rounds to paise", () => {
    expect(balance(5000, 2000)).toBe(3000);
    expect(balance(5000, 6000)).toBe(0);
    expect(balance(100.5, 0)).toBe(100.5);
  });
});

describe("demandStatus", () => {
  it("paid when balance clears", () => {
    expect(demandStatus(d(5000, "pending", "2026-07-01"), 5000, NOW)).toBe("paid");
  });
  it("overdue when unpaid past due date", () => {
    expect(demandStatus(d(5000, "pending", "2026-06-01"), 0, NOW)).toBe("overdue");
    expect(demandStatus(d(5000, "pending", "2026-06-01"), 2000, NOW)).toBe("overdue");
  });
  it("pending vs partial before due date", () => {
    expect(demandStatus(d(5000, "pending", "2026-07-01"), 0, NOW)).toBe("pending");
    expect(demandStatus(d(5000, "pending", "2026-07-01"), 2000, NOW)).toBe("partial");
  });
  it("waived / cancelled are sticky", () => {
    expect(demandStatus(d(5000, "waived", "2026-06-01"), 0, NOW)).toBe("waived");
    expect(demandStatus(d(5000, "cancelled", "2026-06-01"), 0, NOW)).toBe("cancelled");
  });
});

describe("isOverdue / daysOverdue", () => {
  it("isOverdue tracks demandStatus", () => {
    expect(isOverdue(d(5000, "pending", "2026-06-01"), 0, NOW)).toBe(true);
    expect(isOverdue(d(5000, "pending", "2026-07-01"), 0, NOW)).toBe(false);
  });
  it("daysOverdue counts whole days past due", () => {
    expect(daysOverdue("2026-06-10", NOW)).toBe(4);
    expect(daysOverdue("2026-06-20", NOW)).toBe(0);
  });
});

describe("concessionFor", () => {
  it("combines fixed + percentage, capped at the gross", () => {
    expect(concessionFor(10000, 2000, 10)).toBe(3000);      // 2000 + 10% of 10000
    expect(concessionFor(10000, 0, 25)).toBe(2500);
    expect(concessionFor(10000, 9000, 50)).toBe(10000);     // capped
  });
});

describe("demandTally", () => {
  it("rolls up demanded / collected / outstanding / overdue, ignoring cancelled & waived", () => {
    const t = demandTally([
      { ...d(5000, "pending", "2026-06-01"), amount_paid: 0 },      // overdue, owes 5000
      { ...d(4000, "pending", "2026-07-01"), amount_paid: 4000 },   // paid
      { ...d(3000, "pending", "2026-07-01"), amount_paid: 1000 },   // partial, owes 2000
      { ...d(9999, "cancelled", "2026-06-01"), amount_paid: 0 },    // ignored
      { ...d(2000, "waived", "2026-06-01"), amount_paid: 0 },       // waived → excluded from demanded
    ], NOW);
    expect(t.demanded).toBe(12000);     // 5000 + 4000 + 3000
    expect(t.collected).toBe(5000);     // 0 + 4000 + 1000
    expect(t.outstanding).toBe(7000);   // 5000 + 0 + 2000
    expect(t.overdue).toBe(1);
  });
});
