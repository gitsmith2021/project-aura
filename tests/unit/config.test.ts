import { describe, it, expect } from "vitest";
import {
  coerceValue, isValidValue, resolveSetting, resolveAll, groupByCategory,
  searchSettings, categoryOrder, SETTING_CATEGORIES,
  type SettingDefinition, type SettingValue,
} from "@/lib/config";

const def = (over: Partial<SettingDefinition>): SettingDefinition => ({
  key: "x.y", category: "Attendance", label: "X", description: "desc",
  type: "number", defaultValue: 75, options: null, sortOrder: 1, ...over,
});

describe("coerceValue", () => {
  it("toggles from bool and string", () => {
    expect(coerceValue("toggle", true)).toBe(true);
    expect(coerceValue("toggle", "true")).toBe(true);
    expect(coerceValue("toggle", "false")).toBe(false);
    expect(coerceValue("toggle", "nope")).toBeNull();
  });
  it("numbers from number and numeric string, rejecting non-numbers", () => {
    expect(coerceValue("number", 12)).toBe(12);
    expect(coerceValue("number", "  40 ")).toBe(40);
    expect(coerceValue("number", "abc")).toBeNull();
  });
  it("select/text stringify", () => {
    expect(coerceValue("select", "semester")).toBe("semester");
    expect(coerceValue("text", 5)).toBe("5");
    expect(coerceValue("text", null)).toBeNull();
  });
});

describe("isValidValue", () => {
  it("enforces type", () => {
    expect(isValidValue({ type: "toggle", options: null }, true)).toBe(true);
    expect(isValidValue({ type: "toggle", options: null }, "true" as unknown as SettingValue)).toBe(false);
    expect(isValidValue({ type: "number", options: null }, 5)).toBe(true);
  });
  it("enforces select option membership", () => {
    const options = [{ value: "a", label: "A" }, { value: "b", label: "B" }];
    expect(isValidValue({ type: "select", options }, "a")).toBe(true);
    expect(isValidValue({ type: "select", options }, "z")).toBe(false);
  });
});

describe("resolveSetting — precedence", () => {
  it("uses the institution override when present and valid", () => {
    const r = resolveSetting(def({}), new Map<string, SettingValue>([["x.y", 60]]));
    expect(r.value).toBe(60);
    expect(r.isOverridden).toBe(true);
  });
  it("falls back to the definition default when no override", () => {
    const r = resolveSetting(def({}), new Map());
    expect(r.value).toBe(75);
    expect(r.isOverridden).toBe(false);
  });
  it("ignores an override that fails validation (wrong type)", () => {
    const r = resolveSetting(def({}), new Map<string, SettingValue>([["x.y", "bad" as unknown as SettingValue]]));
    expect(r.value).toBe(75);
    expect(r.isOverridden).toBe(false);
  });
  it("ignores a select override outside the allowed options", () => {
    const d = def({ type: "select", defaultValue: "semester", options: [{ value: "semester", label: "Semester" }] });
    const r = resolveSetting(d, new Map<string, SettingValue>([["x.y", "weekly"]]));
    expect(r.value).toBe("semester");
    expect(r.isOverridden).toBe(false);
  });
});

describe("grouping & search", () => {
  const defs = [
    def({ key: "a", category: "Finance", label: "Fee", sortOrder: 2 }),
    def({ key: "b", category: "Attendance", label: "Min %", sortOrder: 1 }),
    def({ key: "c", category: "Finance", label: "Late fee", sortOrder: 1 }),
  ];
  const resolved = resolveAll(defs, new Map());

  it("groups by category in canonical order, settings by sortOrder", () => {
    const g = groupByCategory(resolved);
    // Attendance precedes Finance in SETTING_CATEGORIES
    expect(g.map((x) => x.category)).toEqual(["Attendance", "Finance"]);
    expect(g[1].settings.map((s) => s.key)).toEqual(["c", "a"]); // sortOrder 1 then 2
  });
  it("search matches label / key / category / description", () => {
    expect(searchSettings(resolved, "late").map((s) => s.key)).toEqual(["c"]);
    expect(searchSettings(resolved, "attendance").map((s) => s.key)).toEqual(["b"]);
    expect(searchSettings(resolved, "").length).toBe(3);
  });
  it("categoryOrder ranks known categories before unknown", () => {
    expect(categoryOrder("Institution")).toBe(0);
    expect(categoryOrder("Nonexistent")).toBe(SETTING_CATEGORIES.length);
  });
});
