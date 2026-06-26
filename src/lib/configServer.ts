// ════════════════════════════════════════════════════════════════════════════
// AURA CORE FOUNDATION · CF-1 — App Configuration: server-side consumption
//
// The read path that makes settings actually *do* something. Feature code calls
// these to branch on an institution's configuration.
//
// SERVER-ONLY. Reads via the service-role client because consumption happens in
// non-admin contexts too (a student portal checking show_fees, the public
// admissions form) where RLS would otherwise hide app_setting_values. The values
// gate behaviour only — no secrets — so a service-role read is justified
// (Dev Rule 16). Request-cached so a page that checks several settings hits the
// DB once.
//
// Fail-open: gates fall back to a caller-supplied default (true by default) when
// a value is absent or the read fails, so a config glitch never hard-blocks an
// existing feature.
// ════════════════════════════════════════════════════════════════════════════

import { cache } from "react";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolveSetting, type SettingDefinition, type SettingType, type SettingValue } from "@/lib/config";

/** Resolve every setting for an institution to its effective value, once per request. */
export const getInstitutionSettings = cache(async (institutionId: string): Promise<Map<string, SettingValue>> => {
  const out = new Map<string, SettingValue>();
  try {
    const admin = createAdminClient();
    const [{ data: defs }, { data: vals }] = await Promise.all([
      admin
        .from("app_setting_definitions")
        .select("key, category, label, description, type, default_value, options, sort_order")
        .eq("is_active", true),
      admin
        .from("app_setting_values")
        .select("setting_key, value")
        .eq("institution_id", institutionId),
    ]);

    const valueMap = new Map<string, SettingValue>();
    for (const v of vals ?? []) valueMap.set(v.setting_key as string, v.value as SettingValue);

    for (const row of defs ?? []) {
      const def: SettingDefinition = {
        key: row.key as string,
        category: row.category as string,
        label: row.label as string,
        description: (row.description as string | null) ?? null,
        type: row.type as SettingType,
        defaultValue: row.default_value as SettingValue,
        options: (row.options as { value: string; label: string }[] | null) ?? null,
        sortOrder: (row.sort_order as number) ?? 0,
      };
      out.set(def.key, resolveSetting(def, valueMap).value);
    }
  } catch (err) {
    console.error("[configServer] failed to load institution settings:", err);
    // fall through with an empty map → callers fall back to their defaults
  }
  return out;
});

/** Raw resolved value (or undefined if unknown / unreadable). */
export async function getSetting(institutionId: string, key: string): Promise<SettingValue | undefined> {
  return (await getInstitutionSettings(institutionId)).get(key);
}

/** Boolean gate. Fail-open: when the value is absent/unreadable, returns `fallback` (default true). */
export async function isSettingEnabled(institutionId: string, key: string, fallback = true): Promise<boolean> {
  const v = await getSetting(institutionId, key);
  return typeof v === "boolean" ? v : fallback;
}

/** Numeric setting with an explicit fallback. */
export async function getNumberSetting(institutionId: string, key: string, fallback: number): Promise<number> {
  const v = await getSetting(institutionId, key);
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/** Text/select setting with an explicit fallback. */
export async function getTextSetting(institutionId: string, key: string, fallback: string): Promise<string> {
  const v = await getSetting(institutionId, key);
  return typeof v === "string" && v.length > 0 ? v : fallback;
}
