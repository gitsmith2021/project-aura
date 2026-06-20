import { describe, it, expect } from "vitest";
import {
  formatCurrency, formatDate, formatDateTime, currencySymbol,
  withLocalizationDefaults, isValidTimezone, DEFAULT_LOCALIZATION,
} from "@/lib/locale";

const nospace = (s: string) => s.replace(/\s/g, "");

describe("withLocalizationDefaults", () => {
  it("falls back to India defaults for missing fields", () => {
    expect(withLocalizationDefaults(null)).toEqual(DEFAULT_LOCALIZATION);
    expect(withLocalizationDefaults({ currency: "USD" })).toEqual({
      currency: "USD", locale: "en-IN", timezone: "Asia/Kolkata",
    });
    expect(withLocalizationDefaults({ currency: "", locale: "" }).currency).toBe("INR");
  });
});

describe("formatCurrency", () => {
  it("formats INR with Indian digit grouping and the ₹ symbol", () => {
    const s = formatCurrency(123456, { currency: "INR", locale: "en-IN" });
    expect(s).toContain("₹");
    expect(nospace(s)).toContain("1,23,456");
  });

  it("formats USD with Western grouping and decimals when asked", () => {
    const s = formatCurrency(1234.5, { currency: "USD", locale: "en-US" }, { decimals: 2 });
    expect(nospace(s)).toBe("$1,234.50");
  });

  it("formats EUR", () => {
    expect(formatCurrency(1000, { currency: "EUR", locale: "en-IE" })).toContain("€");
  });

  it("defaults to whole numbers (no decimals)", () => {
    expect(nospace(formatCurrency(2500, { currency: "USD", locale: "en-US" }))).toBe("$2,500");
  });

  it("uses India defaults when no localization is given", () => {
    const s = formatCurrency(500);
    expect(s).toContain("₹");
  });

  it("returns the null display for null/undefined/NaN", () => {
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency(undefined)).toBe("—");
    expect(formatCurrency(NaN)).toBe("—");
    expect(formatCurrency(null, null, { nullDisplay: "N/A" })).toBe("N/A");
  });

  it("does not throw on an unknown currency code", () => {
    expect(() => formatCurrency(100, { currency: "XYZ" })).not.toThrow();
  });
});

describe("currencySymbol", () => {
  it("returns curated symbols", () => {
    expect(currencySymbol("INR")).toBe("₹");
    expect(currencySymbol("USD")).toBe("$");
    expect(currencySymbol("GBP")).toBe("£");
  });
  it("never throws on unknown codes", () => {
    expect(() => currencySymbol("ZZZ")).not.toThrow();
  });
});

describe("formatDate / formatDateTime", () => {
  // 2026-06-15 19:30 UTC = 16 Jun 01:00 in IST (+5:30) but 15 Jun 15:30 in New York (EDT -4)
  const instant = "2026-06-15T19:30:00Z";

  it("converts a UTC instant into the institution timezone", () => {
    const kolkata = formatDate(instant, { timezone: "Asia/Kolkata", locale: "en-GB" });
    const newYork = formatDate(instant, { timezone: "America/New_York", locale: "en-GB" });
    expect(kolkata).toContain("16");
    expect(newYork).toContain("15");
    expect(kolkata).not.toBe(newYork);
  });

  it("returns empty string for null/invalid input", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate("not-a-date")).toBe("");
  });

  it("formatDateTime includes a time component", () => {
    const s = formatDateTime(instant, { timezone: "Asia/Kolkata", locale: "en-GB" });
    expect(s).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe("isValidTimezone", () => {
  it("accepts IANA zones and rejects junk", () => {
    expect(isValidTimezone("Asia/Kolkata")).toBe(true);
    expect(isValidTimezone("America/New_York")).toBe(true);
    expect(isValidTimezone("UTC")).toBe(true);
    expect(isValidTimezone("Not/AZone")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
  });
});
