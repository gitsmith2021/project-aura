import { describe, it, expect } from "vitest";
import {
  PARTNER_TYPES, PARTNER_TYPE_LABELS, INTERACTION_TYPES, INTERACTION_TYPE_LABELS,
  EXPIRY_WARN_DAYS, EXPIRY_CRITICAL_DAYS, daysUntil, expiryUrgency, computeExpiry,
  mouStats, interactionRollup, naacMouCsv,
  type PartnerLike, type InteractionLike, type NaacMouRow,
} from "@/lib/industryConnect";

const TODAY = new Date(2026, 5, 19); // 2026-06-19 local

describe("metadata", () => {
  it("labels every partner and interaction type", () => {
    expect(PARTNER_TYPES).toHaveLength(5);
    for (const t of PARTNER_TYPES) expect(PARTNER_TYPE_LABELS[t]).toBeTruthy();
    expect(INTERACTION_TYPES).toHaveLength(7);
    for (const t of INTERACTION_TYPES) expect(INTERACTION_TYPE_LABELS[t]).toBeTruthy();
  });
});

describe("daysUntil", () => {
  it("counts days and handles invalid input", () => {
    expect(daysUntil("2026-06-29", TODAY)).toBe(10);
    expect(daysUntil("2026-06-09", TODAY)).toBe(-10);
    expect(daysUntil(null, TODAY)).toBeNull();
  });
});

describe("expiryUrgency", () => {
  it("bands by 30/60-day thresholds", () => {
    expect(EXPIRY_CRITICAL_DAYS).toBe(30);
    expect(EXPIRY_WARN_DAYS).toBe(60);
    expect(expiryUrgency("2026-06-18", TODAY)).toBe("expired");
    expect(expiryUrgency("2026-07-10", TODAY)).toBe("critical");   // 21 days
    expect(expiryUrgency("2026-08-10", TODAY)).toBe("warning");    // 52 days
    expect(expiryUrgency("2026-12-01", TODAY)).toBe("ok");
  });
  it("treats the exact boundaries inclusively", () => {
    expect(expiryUrgency("2026-07-19", TODAY)).toBe("critical");   // 30 days
    expect(expiryUrgency("2026-08-18", TODAY)).toBe("warning");    // 60 days
  });
});

describe("computeExpiry", () => {
  it("adds validity years to the MOU date", () => {
    expect(computeExpiry("2026-06-19", 3)).toBe("2029-06-19");
    expect(computeExpiry("2024-02-29", 1)).toBe("2025-03-01"); // non-leap normalisation
  });
});

describe("mouStats", () => {
  const partners: PartnerLike[] = [
    { partner_type: "industry", expiry_date: "2026-07-10", is_active: true },  // critical
    { partner_type: "industry", expiry_date: "2026-12-01", is_active: true },  // ok
    { partner_type: "university", expiry_date: "2026-06-01", is_active: true }, // expired (still active flag)
    { partner_type: "ngo", expiry_date: "2026-08-10", is_active: false },       // warning but inactive
  ];
  const s = mouStats(partners, TODAY);

  it("counts totals, active, expiring-soon and expired", () => {
    expect(s.total).toBe(4);
    expect(s.active).toBe(3);
    expect(s.expiringSoon).toBe(1); // only the active critical one (expired & inactive excluded)
    expect(s.expired).toBe(1);
  });
  it("tallies by type", () => {
    expect(s.byType.industry).toBe(2);
    expect(s.byType.university).toBe(1);
    expect(s.byType.ngo).toBe(1);
    expect(s.byType.government).toBe(0);
  });
});

describe("interactionRollup", () => {
  it("aggregates count and students per partner, ignoring null partners", () => {
    const rows: InteractionLike[] = [
      { mou_partner_id: "p1", students_benefited: 30 },
      { mou_partner_id: "p1", students_benefited: 20 },
      { mou_partner_id: "p2", students_benefited: null },
      { mou_partner_id: null, students_benefited: 99 },
    ];
    const map = interactionRollup(rows);
    expect(map.get("p1")).toEqual({ count: 2, students: 50 });
    expect(map.get("p2")).toEqual({ count: 1, students: 0 });
    expect(map.has("")).toBe(false);
  });
});

describe("naacMouCsv", () => {
  it("renders a header + numbered rows and escapes commas", () => {
    const rows: NaacMouRow[] = [
      { partner_name: "Acme, Inc", partner_type: "industry", mou_date: "2024-01-01", expiry_date: "2027-01-01", purpose: "Internships", activityCount: 3, studentsBenefited: 45, status: "Active" },
    ];
    const csv = naacMouCsv(rows);
    const [header, line] = csv.split("\n");
    expect(header).toContain("Students Benefited");
    expect(line).toContain('"Acme, Inc"'); // quoted because of the comma
    expect(line.startsWith("1,")).toBe(true);
    expect(line).toContain("Industry");
  });
});
