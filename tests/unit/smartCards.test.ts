import { describe, it, expect } from "vitest";
import {
  isUsable, normaliseUid, isValidUid, cardStats, maskUid,
} from "@/lib/smartCards";

describe("isUsable", () => {
  it("only an active card is usable at the reader", () => {
    expect(isUsable({ status: "active" })).toBe(true);
    expect(isUsable({ status: "lost" })).toBe(false);
    expect(isUsable({ status: "deactivated" })).toBe(false);
    expect(isUsable({ status: "replaced" })).toBe(false);
  });
});

describe("normaliseUid", () => {
  it("trims, uppercases, and strips spaces/colons", () => {
    expect(normaliseUid(" 04:a2:2b:c1 ")).toBe("04A22BC1");
    expect(normaliseUid("de ad be ef")).toBe("DEADBEEF");
  });
});

describe("isValidUid", () => {
  it("accepts hex of length >= 4 (after normalising)", () => {
    expect(isValidUid("04:A2:2B:C1")).toBe(true);
    expect(isValidUid("dead")).toBe(true);
  });
  it("rejects short or non-hex input", () => {
    expect(isValidUid("ab")).toBe(false);
    expect(isValidUid("xyz123")).toBe(false);
    expect(isValidUid("")).toBe(false);
  });
});

describe("cardStats", () => {
  it("counts each status and total", () => {
    const s = cardStats([
      { status: "active" }, { status: "active" }, { status: "lost" },
      { status: "deactivated" }, { status: "replaced" },
    ]);
    expect(s).toEqual({ total: 5, active: 2, lost: 1, deactivated: 1, replaced: 1 });
  });
  it("handles an empty registry", () => {
    expect(cardStats([])).toEqual({ total: 0, active: 0, lost: 0, deactivated: 0, replaced: 0 });
  });
});

describe("maskUid", () => {
  it("keeps the last 4 and masks the rest", () => {
    expect(maskUid("04A22BC1")).toBe("••••2BC1");
  });
  it("returns short UIDs unmasked", () => {
    expect(maskUid("2BC1")).toBe("2BC1");
  });
});
