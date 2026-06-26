"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";
import { trialExpiry, TRIAL_DAYS } from "@/lib/subscriptions";

// Phase 9C — Trial Provisioning.
//
// Spinning up a new institution is a single SUPER_ADMIN operation that does
// three things atomically from the operator's point of view:
//   1. creates the institution with is_onboarded=false, so the admin's first
//      login routes into the Onboarding Wizard (Arch A4),
//   2. auto-starts a 30-day trial subscription on the entry plan (7E), and
//   3. records the provisioning in the audit trail (A8).
// The trial step is best-effort — the institution is created regardless, and a
// super-admin can assign a plan later from /admin/billing if none exists yet.

type Result<T> = { success: true; data: T } | { success: false; error: string };

export type ProvisionInstitutionInput = {
  name: string;
  collegeType: string;
  subdomain: string;
  sessionTypes: string[];
};

export type ProvisionInstitutionResult = {
  id: string;
  slug: string | null;
  trialStarted: boolean;
  trialDays: number;
};

async function db() {
  return createClient(await cookies());
}

export async function provisionInstitution(
  input: ProvisionInstitutionInput,
): Promise<Result<ProvisionInstitutionResult>> {
  try {
    const supabase = await db();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    // Provisioning a tenant is a platform operation — SUPER_ADMIN only.
    const { data: member } = await supabase
      .from("institution_members")
      .select("id")
      .eq("profile_id", user.id)
      .eq("role", "SUPER_ADMIN")
      .limit(1)
      .maybeSingle();
    if (!member) return { success: false, error: "Not authorised." };

    const name = input.name.trim();
    const subdomain = input.subdomain.trim();
    const collegeType = input.collegeType.trim();
    if (!name || !collegeType || !subdomain || input.sessionTypes.length === 0) {
      return { success: false, error: "Name, type, subdomain and at least one session type are required." };
    }

    // 1) Spin up the institution. is_onboarded=false is set explicitly (not left
    //    to a DB default) because the first-login redirect checks `=== false`.
    const { data: inst, error: instErr } = await supabase
      .from("institutions")
      .insert({
        name,
        college_type: collegeType,
        subdomain,
        status: "Active",
        session_types: input.sessionTypes,
        is_onboarded: false,
      })
      .select("id, slug")
      .single();
    if (instErr || !inst) {
      return { success: false, error: instErr?.message ?? "Failed to create institution." };
    }
    const institutionId = inst.id as string;

    // 2) Auto-start a 30-day trial on the entry plan (lowest active sort_order).
    //    Best-effort: never fail provisioning if no plan exists yet.
    let trialStarted = false;
    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("id")
      .eq("is_active", true)
      .order("sort_order")
      .limit(1)
      .maybeSingle();
    if (plan?.id) {
      const { error: subErr } = await supabase
        .from("institution_subscriptions")
        .upsert(
          {
            institution_id: institutionId,
            plan_id: plan.id as string,
            billing_cycle: "monthly",
            status: "trial",
            expires_at: trialExpiry(),
          },
          { onConflict: "institution_id" },
        );
      if (!subErr) trialStarted = true;
    }

    await logAudit({
      institutionId,
      performedBy: user.id,
      tableName: "institutions",
      recordId: institutionId,
      action: "INSERT",
      afterData: { name, is_onboarded: false, trial_started: trialStarted, trial_days: TRIAL_DAYS },
      notes: trialStarted
        ? `Institution provisioned with a ${TRIAL_DAYS}-day trial`
        : "Institution provisioned (no active plan — trial not started)",
    });

    revalidatePath("/");
    revalidatePath("/admin/billing");
    return {
      success: true,
      data: { id: institutionId, slug: (inst.slug as string | null) ?? null, trialStarted, trialDays: TRIAL_DAYS },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
