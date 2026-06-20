"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";
import { isValidTimezone, withLocalizationDefaults, type Localization } from "@/lib/locale";

// Arch A6 — per-institution localization settings. Admin-gated (SUPER_ADMIN /
// INST_ADMIN / PRINCIPAL of the target institution).

type Result<T = undefined> = T extends undefined
  ? { success: true } | { success: false; error: string }
  : { success: true; data: T } | { success: false; error: string };

const ADMIN_ROLES = ["SUPER_ADMIN", "INST_ADMIN", "PRINCIPAL"];

async function requireAdmin(institutionId: string) {
  const supabase = createClient(await cookies());
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { ok: false as const, error: "Unauthorized." };

  const { data: member } = await supabase
    .from("institution_members")
    .select("role, institution_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const isSuper = member?.role === "SUPER_ADMIN";
  const isInstAdmin = ADMIN_ROLES.includes(member?.role ?? "") && member?.institution_id === institutionId;
  if (!isSuper && !isInstAdmin) {
    return { ok: false as const, error: "You do not have permission to edit this institution's settings." };
  }
  return { ok: true as const, supabase, userId: user.id };
}

export type InstitutionLocalization = Localization & { name: string };

export async function getInstitutionLocalization(
  institutionId: string,
): Promise<Result<InstitutionLocalization>> {
  const guard = await requireAdmin(institutionId);
  if (!guard.ok) return { success: false, error: guard.error };

  const { data, error } = await guard.supabase
    .from("institutions")
    .select("name, currency, locale, timezone")
    .eq("id", institutionId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Institution not found." };

  const loc = withLocalizationDefaults({
    currency: data.currency, locale: data.locale, timezone: data.timezone,
  });
  return { success: true, data: { ...loc, name: data.name as string } };
}

export async function updateInstitutionLocalization(
  institutionId: string,
  payload: Localization,
): Promise<Result> {
  const guard = await requireAdmin(institutionId);
  if (!guard.ok) return { success: false, error: guard.error };

  const currency = payload.currency?.trim().toUpperCase();
  const locale = payload.locale?.trim();
  const timezone = payload.timezone?.trim();

  if (!currency || !/^[A-Z]{3}$/.test(currency)) {
    return { success: false, error: "Currency must be a 3-letter ISO code (e.g. INR, USD)." };
  }
  if (!locale) return { success: false, error: "Locale is required." };
  if (!timezone || !isValidTimezone(timezone)) {
    return { success: false, error: "A valid IANA timezone is required (e.g. Asia/Kolkata)." };
  }

  // Snapshot for the audit trail.
  const { data: before } = await guard.supabase
    .from("institutions")
    .select("currency, locale, timezone")
    .eq("id", institutionId)
    .maybeSingle();

  const { error } = await guard.supabase
    .from("institutions")
    .update({ currency, locale, timezone })
    .eq("id", institutionId);

  if (error) return { success: false, error: error.message };

  await logAudit({
    institutionId,
    performedBy: guard.userId,
    tableName: "institutions",
    recordId: institutionId,
    action: "UPDATE",
    beforeData: before ?? undefined,
    afterData: { currency, locale, timezone },
    notes: "Updated institution localization (currency/locale/timezone)",
  });

  revalidatePath(`/institutions/${institutionId}/settings`);
  revalidatePath("/", "layout");
  return { success: true };
}
