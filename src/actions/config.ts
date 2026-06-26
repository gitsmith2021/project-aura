"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";
import {
  coerceValue, isValidValue, resolveAll, type ResolvedSetting,
  type SettingDefinition, type SettingType, type SettingValue,
} from "@/lib/config";

// AURA CORE FOUNDATION · CF-1 — App Configuration server actions.
//
// Institution-scoped: an admin-tier member of the institution (or any
// SUPER_ADMIN) may read and write that institution's configuration. The DB
// gate below mirrors RLS (defence in depth) and gives clean errors. Every
// write is audited (A8) — these entries surface in the CF-4 Activity Center.

type Result<T> = { success: true; data: T } | { success: false; error: string };

const ADMIN_ROLES = ["SUPER_ADMIN", "INST_ADMIN", "PRINCIPAL"];

async function db() {
  return createClient(await cookies());
}

/** Confirm the caller may administer this institution's configuration. */
async function requireConfigAdmin(institutionId: string): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await db();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized." };

  const { data: member } = await supabase
    .from("institution_members")
    .select("role, institution_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!member || !ADMIN_ROLES.includes(member.role as string)) {
    return { ok: false, error: "Not authorised." };
  }
  // SUPER_ADMIN may configure any institution; others only their own.
  if (member.role !== "SUPER_ADMIN" && member.institution_id !== institutionId) {
    return { ok: false, error: "Not authorised for this institution." };
  }
  return { ok: true, userId: user.id };
}

function mapDefinition(row: Record<string, unknown>): SettingDefinition {
  return {
    key: row.key as string,
    category: row.category as string,
    label: row.label as string,
    description: (row.description as string | null) ?? null,
    type: row.type as SettingType,
    defaultValue: row.default_value as SettingValue,
    options: (row.options as { value: string; label: string }[] | null) ?? null,
    sortOrder: (row.sort_order as number) ?? 0,
  };
}

/** All settings for an institution, resolved (definition default ← institution override). */
export async function listInstitutionSettings(institutionId: string): Promise<Result<ResolvedSetting[]>> {
  try {
    const guard = await requireConfigAdmin(institutionId);
    if (!guard.ok) return { success: false, error: guard.error };

    const supabase = await db();
    const [{ data: defs, error: defErr }, { data: vals, error: valErr }] = await Promise.all([
      supabase
        .from("app_setting_definitions")
        .select("key, category, label, description, type, default_value, options, sort_order")
        .eq("is_active", true),
      supabase
        .from("app_setting_values")
        .select("setting_key, value")
        .eq("institution_id", institutionId),
    ]);
    if (defErr) return { success: false, error: defErr.message };
    if (valErr) return { success: false, error: valErr.message };

    const valueMap = new Map<string, SettingValue>();
    for (const v of vals ?? []) valueMap.set(v.setting_key as string, v.value as SettingValue);

    const definitions = (defs ?? []).map(mapDefinition);
    return { success: true, data: resolveAll(definitions, valueMap) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Set (override) one setting for an institution. Coerces + validates against the definition. */
export async function setSetting(input: {
  institutionId: string; key: string; value: unknown;
}): Promise<Result<{ value: SettingValue }>> {
  try {
    const guard = await requireConfigAdmin(input.institutionId);
    if (!guard.ok) return { success: false, error: guard.error };

    const supabase = await db();
    const { data: def, error: defErr } = await supabase
      .from("app_setting_definitions")
      .select("key, type, options")
      .eq("key", input.key)
      .maybeSingle();
    if (defErr) return { success: false, error: defErr.message };
    if (!def) return { success: false, error: "Unknown setting." };

    const coerced = coerceValue(def.type as SettingType, input.value);
    if (coerced === null) return { success: false, error: "Invalid value for this setting type." };
    const options = (def.options as { value: string; label: string }[] | null) ?? null;
    if (!isValidValue({ type: def.type as SettingType, options }, coerced)) {
      return { success: false, error: "Value is not allowed for this setting." };
    }

    const { error } = await supabase
      .from("app_setting_values")
      .upsert(
        { setting_key: input.key, institution_id: input.institutionId, value: coerced, updated_at: new Date().toISOString() },
        { onConflict: "setting_key,institution_id" },
      );
    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId: input.institutionId,
      performedBy: guard.userId,
      tableName: "app_setting_values",
      recordId: input.key,
      action: "UPDATE",
      afterData: { key: input.key, value: coerced },
      notes: `Configuration changed: ${input.key}`,
    });

    revalidatePath("/settings");
    return { success: true, data: { value: coerced } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Clear an institution's override so the setting falls back to its default. */
export async function resetSetting(input: { institutionId: string; key: string }): Promise<Result<null>> {
  try {
    const guard = await requireConfigAdmin(input.institutionId);
    if (!guard.ok) return { success: false, error: guard.error };

    const supabase = await db();
    const { error } = await supabase
      .from("app_setting_values")
      .delete()
      .eq("institution_id", input.institutionId)
      .eq("setting_key", input.key);
    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId: input.institutionId,
      performedBy: guard.userId,
      tableName: "app_setting_values",
      recordId: input.key,
      action: "DELETE",
      notes: `Configuration reset to default: ${input.key}`,
    });

    revalidatePath("/settings");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
