import { describe, it, expect } from "vitest";
import {
  STAFF_TYPES, STAFF_TYPE_LABELS, STAFF_TYPE_COLORS,
  staffTypeLabel, staffTypeColor, staffTypeGroup,
  isNonTeaching, isDailyWage, isWarden,
  computeDailyWageAmount,
  type StaffType,
} from "@/lib/staffTypes";

describe("STAFF_TYPES", () => {
  it("contains all 5 types", () => {
    expect(STAFF_TYPES).toHaveLength(5);
    expect(STAFF_TYPES).toContain("teaching");
    expect(STAFF_TYPES).toContain("non-teaching_support");
  });
});

describe("staffTypeLabel", () => {
  it("returns human-readable labels", () => {
    expect(staffTypeLabel("teaching")).toBe("Teaching Staff");
    expect(staffTypeLabel("non-teaching_office")).toBe("Office / Admin Staff");
    expect(staffTypeLabel("non-teaching_warden")).toBe("Hostel Warden");
    expect(staffTypeLabel("non-teaching_mess")).toBe("Mess / Canteen Staff");
    expect(staffTypeLabel("non-teaching_support")).toBe("Support / Daily Wage");
  });
});

describe("staffTypeColor", () => {
  it("returns a tailwind class string for every type", () => {
    for (const t of STAFF_TYPES) {
      expect(staffTypeColor(t)).toBeTruthy();
      expect(staffTypeColor(t)).toContain("bg-");
    }
  });

  it("falls back to teaching color for unknown type", () => {
    expect(staffTypeColor("unknown" as StaffType)).toBe(STAFF_TYPE_COLORS.teaching);
  });
});

describe("staffTypeGroup", () => {
  it("returns 'teaching' for teaching type", () => {
    expect(staffTypeGroup("teaching")).toBe("teaching");
  });

  it("returns 'non-teaching' for all non-teaching types", () => {
    const nonTeachingTypes: StaffType[] = [
      "non-teaching_office",
      "non-teaching_warden",
      "non-teaching_mess",
      "non-teaching_support",
    ];
    for (const t of nonTeachingTypes) {
      expect(staffTypeGroup(t)).toBe("non-teaching");
    }
  });
});

describe("isNonTeaching", () => {
  it("returns false for teaching", () => {
    expect(isNonTeaching("teaching")).toBe(false);
  });

  it("returns true for all non-teaching subtypes", () => {
    expect(isNonTeaching("non-teaching_office")).toBe(true);
    expect(isNonTeaching("non-teaching_warden")).toBe(true);
    expect(isNonTeaching("non-teaching_mess")).toBe(true);
    expect(isNonTeaching("non-teaching_support")).toBe(true);
  });
});

describe("isDailyWage", () => {
  it("returns true only for non-teaching_support", () => {
    expect(isDailyWage("non-teaching_support")).toBe(true);
  });

  it("returns false for all other types", () => {
    const others: StaffType[] = ["teaching", "non-teaching_office", "non-teaching_warden", "non-teaching_mess"];
    for (const t of others) {
      expect(isDailyWage(t)).toBe(false);
    }
  });
});

describe("isWarden", () => {
  it("returns true only for non-teaching_warden", () => {
    expect(isWarden("non-teaching_warden")).toBe(true);
  });

  it("returns false for all other types", () => {
    const others: StaffType[] = ["teaching", "non-teaching_office", "non-teaching_mess", "non-teaching_support"];
    for (const t of others) {
      expect(isWarden(t)).toBe(false);
    }
  });
});

describe("computeDailyWageAmount", () => {
  it("computes correctly for full attendance", () => {
    expect(computeDailyWageAmount(500, 26, 26)).toBe(13000);
  });

  it("computes correctly for partial attendance", () => {
    expect(computeDailyWageAmount(500, 26, 20)).toBe(10000);
  });

  it("caps daysPresent at workingDays", () => {
    expect(computeDailyWageAmount(500, 26, 30)).toBe(13000);
  });

  it("returns 0 if daysPresent is 0", () => {
    expect(computeDailyWageAmount(500, 26, 0)).toBe(0);
  });

  it("returns 0 if dailyWageRate is 0", () => {
    expect(computeDailyWageAmount(0, 26, 26)).toBe(0);
  });

  it("returns 0 if workingDays is 0", () => {
    expect(computeDailyWageAmount(500, 0, 0)).toBe(0);
  });

  it("rounds to 2 decimal places", () => {
    // 333.33 * 3 = 999.99
    expect(computeDailyWageAmount(333.33, 3, 3)).toBe(999.99);
  });

  it("returns 0 if daysPresent is negative", () => {
    expect(computeDailyWageAmount(500, 26, -5)).toBe(0);
  });
});
