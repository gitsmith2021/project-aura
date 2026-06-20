"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";
import type { OnboardingState, ParsedStaffRow } from "@/lib/onboarding";

// Arch A4 — Institution Onboarding Wizard server actions.
//
// Every mutation is gated by requireAdmin(): the caller must be an admin-tier
// member (SUPER_ADMIN / INST_ADMIN / PRINCIPAL) of the target institution.
// RLS already enforces tenant isolation, but the explicit guard keeps the
// onboarding surface admin-only and gives clean error messages.

type Ok<T = undefined> = T extends undefined
  ? { success: true }
  : { success: true; data: T };
type Result<T = undefined> = Ok<T> | { success: false; error: string };

const ADMIN_ROLES = ["SUPER_ADMIN", "INST_ADMIN", "PRINCIPAL"];

async function getSupabase() {
  return createClient(await cookies());
}

/** Resolve the caller and confirm they may administer this institution. */
async function requireAdmin(institutionId: string) {
  const supabase = await getSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false as const, error: "Unauthorized." };

  const { data: member } = await supabase
    .from("institution_members")
    .select("role, institution_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const isSuper = member?.role === "SUPER_ADMIN";
  const isInstAdmin =
    ADMIN_ROLES.includes(member?.role ?? "") && member?.institution_id === institutionId;

  if (!isSuper && !isInstAdmin) {
    return { ok: false as const, error: "You do not have permission to onboard this institution." };
  }
  return { ok: true as const, supabase, userId: user.id };
}

// ── Read ──────────────────────────────────────────────────────────────────────

export type OnboardingSnapshot = OnboardingState & {
  isOnboarded: boolean;
  departmentList: { id: string; name: string }[];
  academicYearLabel: string | null;
};

export async function getOnboardingState(
  institutionId: string
): Promise<Result<OnboardingSnapshot>> {
  const guard = await requireAdmin(institutionId);
  if (!guard.ok) return { success: false, error: guard.error };
  const { supabase } = guard;

  const [inst, depts, ay, fees, staffCount] = await Promise.all([
    supabase.from("institutions").select("is_onboarded").eq("id", institutionId).maybeSingle(),
    supabase.from("departments").select("id, name").eq("institution_id", institutionId).order("name"),
    supabase.from("academic_years").select("label").eq("institution_id", institutionId).eq("is_current", true).maybeSingle(),
    supabase.from("fee_structures").select("id", { count: "exact", head: true }).eq("institution_id", institutionId),
    supabase.from("staff").select("id", { count: "exact", head: true }).eq("institution_id", institutionId),
  ]);

  const departmentList = (depts.data ?? []) as { id: string; name: string }[];

  return {
    success: true,
    data: {
      isOnboarded: Boolean(inst.data?.is_onboarded),
      departments: departmentList.length,
      hasAcademicYear: Boolean(ay.data),
      feeStructures: fees.count ?? 0,
      staff: staffCount.count ?? 0,
      departmentList,
      academicYearLabel: ay.data?.label ?? null,
    },
  };
}

// ── Step 1: Departments ─────────────────────────────────────────────────────

export async function addOnboardingDepartment(
  institutionId: string,
  payload: { name: string; session_type?: string; funding_type?: string; color?: string }
): Promise<Result<{ id: string; name: string }>> {
  const guard = await requireAdmin(institutionId);
  if (!guard.ok) return { success: false, error: guard.error };

  const name = payload.name.trim();
  if (!name) return { success: false, error: "Department name is required." };

  const { data, error } = await guard.supabase
    .from("departments")
    .insert({
      name,
      institution_id: institutionId,
      session_type: payload.session_type ?? "NORMAL",
      funding_type: payload.funding_type ?? "AIDED",
      color: payload.color ?? "violet",
    })
    .select("id, name")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath(`/onboarding/${institutionId}`);
  return { success: true, data: data as { id: string; name: string } };
}

// ── Step 2: Academic Year ────────────────────────────────────────────────────

export async function setOnboardingAcademicYear(
  institutionId: string,
  payload: { label: string; start_date: string; end_date: string }
): Promise<Result> {
  const guard = await requireAdmin(institutionId);
  if (!guard.ok) return { success: false, error: guard.error };

  const label = payload.label.trim();
  if (!label) return { success: false, error: "Academic year label is required." };
  if (!payload.start_date || !payload.end_date)
    return { success: false, error: "Start and end dates are required." };
  if (payload.start_date >= payload.end_date)
    return { success: false, error: "End date must be after the start date." };

  // Only one current year per institution — demote any existing current row.
  await guard.supabase
    .from("academic_years")
    .update({ is_current: false })
    .eq("institution_id", institutionId)
    .eq("is_current", true);

  const { error } = await guard.supabase.from("academic_years").insert({
    institution_id: institutionId,
    label,
    start_date: payload.start_date,
    end_date: payload.end_date,
    is_current: true,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath(`/onboarding/${institutionId}`);
  return { success: true };
}

// ── Step 3: Fee Structures ───────────────────────────────────────────────────

export async function addOnboardingFeeStructure(
  institutionId: string,
  payload: { name: string; fee_type: string; amount: number; department_id?: string | null }
): Promise<Result> {
  const guard = await requireAdmin(institutionId);
  if (!guard.ok) return { success: false, error: guard.error };

  const name = payload.name.trim();
  if (!name) return { success: false, error: "Fee name is required." };
  if (!payload.amount || payload.amount <= 0)
    return { success: false, error: "Amount must be greater than 0." };

  // Link to the current academic year if one was set in the previous step.
  const { data: ay } = await guard.supabase
    .from("academic_years")
    .select("id")
    .eq("institution_id", institutionId)
    .eq("is_current", true)
    .maybeSingle();

  const { error } = await guard.supabase.from("fee_structures").insert({
    institution_id: institutionId,
    name,
    fee_type: payload.fee_type,
    amount: payload.amount,
    department_id: payload.department_id ?? null,
    academic_year_id: ay?.id ?? null,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath(`/onboarding/${institutionId}`);
  return { success: true };
}

// ── Step 4: Staff CSV import ──────────────────────────────────────────────────

export async function importOnboardingStaff(
  institutionId: string,
  rows: ParsedStaffRow[]
): Promise<Result<{ inserted: number }>> {
  const guard = await requireAdmin(institutionId);
  if (!guard.ok) return { success: false, error: guard.error };
  if (!rows.length) return { success: false, error: "No staff rows to import." };

  // Resolve department names → ids so a CSV "department" column links correctly.
  const { data: depts } = await guard.supabase
    .from("departments")
    .select("id, name")
    .eq("institution_id", institutionId);
  const deptByName = new Map(
    (depts ?? []).map((d) => [String(d.name).trim().toLowerCase(), d.id as string])
  );

  const records = rows.map((r) => ({
    institution_id: institutionId,
    full_name: r.full_name,
    email: r.email,
    designation: r.designation,
    staff_type: r.staff_type,
    department_id: r.department ? deptByName.get(r.department.trim().toLowerCase()) ?? null : null,
    is_active: true,
  }));

  const { data, error } = await guard.supabase.from("staff").insert(records).select("id");
  if (error) return { success: false, error: error.message };

  revalidatePath(`/onboarding/${institutionId}`);
  return { success: true, data: { inserted: data?.length ?? 0 } };
}

// ── Finish ────────────────────────────────────────────────────────────────────

export async function markOnboardingComplete(institutionId: string): Promise<Result> {
  const guard = await requireAdmin(institutionId);
  if (!guard.ok) return { success: false, error: guard.error };

  const { error } = await guard.supabase
    .from("institutions")
    .update({ is_onboarded: true })
    .eq("id", institutionId);

  if (error) return { success: false, error: error.message };

  await logAudit({
    institutionId,
    performedBy: guard.userId,
    tableName: "institutions",
    recordId: institutionId,
    action: "UPDATE",
    beforeData: { is_onboarded: false },
    afterData: { is_onboarded: true },
    notes: "Institution onboarding completed",
  });

  revalidatePath("/", "layout");
  return { success: true };
}
