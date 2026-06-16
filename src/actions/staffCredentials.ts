"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export type StaffAuthStatus = {
  exists: boolean;
  blocked: boolean;
};

export async function batchGetStaffAuthStatuses(
  emails: string[]
): Promise<Record<string, StaffAuthStatus>> {
  const result: Record<string, StaffAuthStatus> = {};
  for (const e of emails) result[e] = { exists: false, blocked: false };

  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (!data) return result;

    const now = Date.now();
    for (const user of data.users) {
      if (user.email && result[user.email] !== undefined) {
        const bannedUntil = user.banned_until ? new Date(user.banned_until).getTime() : 0;
        result[user.email] = { exists: true, blocked: bannedUntil > now };
      }
    }
  } catch {
    // Returns all-false defaults if service role key is not configured
  }

  return result;
}

export async function setStaffPassword(
  email: string,
  fullName: string,
  password: string
): Promise<{ success: boolean; created: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const existing = list?.users?.find((u) => u.email === email);

    if (existing) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, { password });
      if (error) return { success: false, created: false, error: error.message };
      return { success: true, created: false };
    } else {
      const { error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (error) return { success: false, created: false, error: error.message };
      return { success: true, created: true };
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { success: false, created: false, error: msg };
  }
}

/**
 * Clears the must_reset_password flag from the current user's app_metadata.
 * Called after a successful first-login password reset.
 * Requires the service-role key (admin API — app_metadata is server-only).
 */
export async function clearMustResetPassword(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { must_reset_password: false },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function toggleStaffPortalAccess(
  email: string,
  block: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const user = list?.users?.find((u) => u.email === email);

    if (!user) {
      return { success: false, error: "No portal account found. Set credentials first." };
    }

    const { error } = await admin.auth.admin.updateUserById(user.id, {
      ban_duration: block ? "876000h" : "none",
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: msg };
  }
}
