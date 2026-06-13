import { describe, it, expect } from "vitest";
import { roleLabel } from "@/lib/roleLabel";

describe("roleLabel", () => {
  it("maps each institution_members role to its display label", () => {
    expect(roleLabel("SUPER_ADMIN")).toBe("Super Admin");
    expect(roleLabel("INST_ADMIN")).toBe("Admin");
    expect(roleLabel("PRINCIPAL")).toBe("Principal");
    expect(roleLabel("HOD")).toBe("HOD");
    expect(roleLabel("DEPARTMENT_HEAD")).toBe("HOD");
    expect(roleLabel("STAFF")).toBe("Staff");
    expect(roleLabel("STUDENT")).toBe("Student");
  });

  it("falls back to Admin for unknown / null / undefined roles", () => {
    expect(roleLabel(null)).toBe("Admin");
    expect(roleLabel(undefined)).toBe("Admin");
    expect(roleLabel("WHATEVER")).toBe("Admin");
  });
});
