// ════════════════════════════════════════════════════════════════════════════
// AURA CORE FOUNDATION · CF-1 — App Configuration (the @aura/config seam)
//
// Pure, product-agnostic configuration helpers — types, the value resolver, and
// grouping/search. No I/O, no Campus-specific nouns. Unit-tested. Server actions
// (src/actions/config.ts) do the database work and call into here.
//
// Resolution precedence: institution value → definition default.
// ════════════════════════════════════════════════════════════════════════════

export type SettingType = "toggle" | "select" | "number" | "text";

/** A primitive setting value as stored in jsonb. */
export type SettingValue = boolean | number | string;

export type SettingOption = { value: string; label: string };

/** Registry row — what *can* be configured (product-supplied, global). */
export type SettingDefinition = {
  key: string;
  category: string;
  label: string;
  description: string | null;
  type: SettingType;
  defaultValue: SettingValue;
  options: SettingOption[] | null;
  sortOrder: number;
};

/** A definition resolved against an institution's stored value. */
export type ResolvedSetting = SettingDefinition & {
  /** The effective value (institution override, else the default). */
  value: SettingValue;
  /** True when the institution has overridden the default. */
  isOverridden: boolean;
};

/**
 * The 17 configuration categories. This is the canonical display order. Adding a
 * category is seed-data only — the engine never hardcodes behaviour against these.
 */
export const SETTING_CATEGORIES = [
  "Institution", "Admissions", "Academics", "Attendance", "Examination",
  "Finance", "HR", "Student Portal", "Parent Portal", "Faculty Portal",
  "Knowledge Hub", "AI Features", "Notifications", "Integrations", "Security",
  "Mobile", "Feature Flags",
] as const;

export type SettingCategory = (typeof SETTING_CATEGORIES)[number];

/** Stable sort index for a category (unknown categories sort last, alpha). */
export function categoryOrder(category: string): number {
  const i = (SETTING_CATEGORIES as readonly string[]).indexOf(category);
  return i === -1 ? SETTING_CATEGORIES.length : i;
}

// ── Value coercion ─────────────────────────────────────────────────────────────

/**
 * Coerce a raw input (from a form control or jsonb) into the canonical typed
 * value for a setting. Keeps the store consistent regardless of input source.
 * Returns null when the input can't be made valid for the type.
 */
export function coerceValue(type: SettingType, raw: unknown): SettingValue | null {
  switch (type) {
    case "toggle":
      if (typeof raw === "boolean") return raw;
      if (raw === "true") return true;
      if (raw === "false") return false;
      return null;
    case "number": {
      const n = typeof raw === "number" ? raw : Number(String(raw).trim());
      return Number.isFinite(n) ? n : null;
    }
    case "select":
    case "text":
      if (raw === null || raw === undefined) return null;
      return String(raw);
    default:
      return null;
  }
}

/** Validate a value for a definition (type + select membership). */
export function isValidValue(def: Pick<SettingDefinition, "type" | "options">, value: SettingValue): boolean {
  if (def.type === "toggle") return typeof value === "boolean";
  if (def.type === "number") return typeof value === "number" && Number.isFinite(value);
  if (def.type === "text") return typeof value === "string";
  if (def.type === "select") {
    if (typeof value !== "string") return false;
    if (!def.options || def.options.length === 0) return true;
    return def.options.some((o) => o.value === value);
  }
  return false;
}

// ── Resolution ──────────────────────────────────────────────────────────────────

/**
 * Resolve one definition against an institution's stored values.
 * Precedence: institution value (if present & valid) → definition default.
 */
export function resolveSetting(
  def: SettingDefinition,
  values: Map<string, SettingValue>,
): ResolvedSetting {
  const override = values.get(def.key);
  const hasOverride = override !== undefined && isValidValue(def, override);
  return {
    ...def,
    value: hasOverride ? (override as SettingValue) : def.defaultValue,
    isOverridden: hasOverride,
  };
}

/** Resolve every definition; the convenient bulk form of resolveSetting. */
export function resolveAll(
  defs: SettingDefinition[],
  values: Map<string, SettingValue>,
): ResolvedSetting[] {
  return defs.map((d) => resolveSetting(d, values));
}

// ── Grouping & search ────────────────────────────────────────────────────────────

/** Group resolved settings by category in canonical order, each sorted by sortOrder. */
export function groupByCategory(settings: ResolvedSetting[]): { category: string; settings: ResolvedSetting[] }[] {
  const map = new Map<string, ResolvedSetting[]>();
  for (const s of settings) {
    const arr = map.get(s.category) ?? [];
    arr.push(s);
    map.set(s.category, arr);
  }
  return [...map.entries()]
    .map(([category, arr]) => ({
      category,
      settings: arr.sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .sort((a, b) => categoryOrder(a.category) - categoryOrder(b.category));
}

/** Case-insensitive filter over label, description, key and category. */
export function searchSettings(settings: ResolvedSetting[], query: string): ResolvedSetting[] {
  const q = query.trim().toLowerCase();
  if (!q) return settings;
  return settings.filter((s) =>
    s.label.toLowerCase().includes(q) ||
    s.key.toLowerCase().includes(q) ||
    s.category.toLowerCase().includes(q) ||
    (s.description ?? "").toLowerCase().includes(q));
}
