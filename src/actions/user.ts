"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/auditLog";
import type { StudentProgram } from "@/lib/studentProgram";
import type { StaffType } from "@/lib/staffTypes";

export async function updatePersonProfile(payload: {
  id: string;
  role: "STAFF" | "STUDENT";
  institution_id: string;
  full_name: string;
  phone: string | null;
  department_id: string;
  staff_type?: StaffType;
  daily_wage_rate?: number | null;
  student_program?: StudentProgram | null;
  student_year?: number | null;
}): Promise<{ success: true } | { success: false; error: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // Fetch the current person's email and roll number
  const table = payload.role === "STAFF" ? "staff" : "students";
  const { data: currentPerson } = await supabase
    .from(table)
    .select("email, roll_no")
    .eq("id", payload.id)
    .single();

  let email = currentPerson?.email || null;

  // If email is not set, auto-generate it based on institution domain
  if (!email) {
    const { data: inst } = await supabase
      .from("institutions")
      .select("email_domain")
      .eq("id", payload.institution_id)
      .single();
    const domain = inst?.email_domain;

    if (domain) {
      if (payload.role === "STAFF") {
        const words = payload.full_name.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const first = words[0] ?? "";
        const last = words.length > 1 ? words[words.length - 1] : "";
        const local = last ? `${first}.${last}` : first;
        email = `${local}@${domain}`;
      } else {
        const rollNo = currentPerson?.roll_no;
        if (rollNo) {
          email = `${rollNo.toLowerCase().replace(/-/g, "")}@${domain}`;
        }
      }
    }
  }

  const base = {
    full_name: payload.full_name,
    phone: payload.phone,
    department_id: payload.department_id,
    ...(email ? { email } : {}),
  };

  if (payload.role === "STAFF") {
    const staffPatch: Record<string, unknown> = { ...base };
    if (payload.staff_type !== undefined) staffPatch.staff_type = payload.staff_type;
    if (payload.daily_wage_rate !== undefined) staffPatch.daily_wage_rate = payload.daily_wage_rate ?? null;
    const { error } = await supabase
      .from("staff")
      .update(staffPatch)
      .eq("id", payload.id)
      .eq("institution_id", payload.institution_id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/users/staff");
    revalidatePath("/users/students");
    return { success: true };
  }

  const { error } = await supabase
    .from("students")
    .update({ ...base, student_program: payload.student_program ?? null, student_year: payload.student_year ?? null })
    .eq("id", payload.id)
    .eq("institution_id", payload.institution_id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/users/staff");
  revalidatePath("/users/students");
  return { success: true };
}

// ── Institution governance role (STAFF ⇄ PRINCIPAL ⇄ INST_ADMIN) ───────────────
// HOD is intentionally NOT settable here — it's assigned via the Departments
// page (setDepartmentHead) so the department↔head link stays consistent.
// SUPER_ADMIN is platform-level and never assigned from an institution screen.

export type GovernanceRole = "STAFF" | "PRINCIPAL" | "INST_ADMIN";

/** Current institution_members.role for a staff row (by staff.id). */
export async function getStaffMembershipRole(
  staffId: string
): Promise<{ success: true; role: string | null; hasLogin: boolean } | { success: false; error: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { data: staff, error: staffErr } = await supabase
    .from("staff")
    .select("profile_id")
    .eq("id", staffId)
    .maybeSingle();
  if (staffErr) return { success: false, error: staffErr.message };
  if (!staff?.profile_id) return { success: true, role: null, hasLogin: false };

  const { data: member } = await supabase
    .from("institution_members")
    .select("role")
    .eq("profile_id", staff.profile_id)
    .maybeSingle();

  return { success: true, role: member?.role ?? "STAFF", hasLogin: true };
}

/**
 * Promote/demote a staff member's institution role. RLS already restricts
 * institution_members writes to SUPER_ADMIN / INST_ADMIN (PRINCIPAL normalizes
 * to INST_ADMIN), so a HOD calling this fails at the DB layer; we also refuse
 * to overwrite an existing HOD/DEPARTMENT_HEAD or SUPER_ADMIN here.
 */
export async function setStaffMembershipRole(payload: {
  staffId: string;
  institutionId: string;
  role: GovernanceRole;
}): Promise<{ success: true } | { success: false; error: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { data: staff } = await supabase
    .from("staff")
    .select("profile_id")
    .eq("id", payload.staffId)
    .eq("institution_id", payload.institutionId)
    .maybeSingle();
  if (!staff?.profile_id) {
    return { success: false, error: "This staff member has no login account yet. Enable portal access first, then assign a role." };
  }

  const { data: existing } = await supabase
    .from("institution_members")
    .select("id, role")
    .eq("profile_id", staff.profile_id)
    .maybeSingle();

  if (existing && (existing.role === "HOD" || existing.role === "DEPARTMENT_HEAD")) {
    return { success: false, error: "This member is a Head of Department — change that from the Departments page, not here." };
  }
  if (existing && existing.role === "SUPER_ADMIN") {
    return { success: false, error: "Super Admin is a platform role and can't be changed here." };
  }

  if (existing) {
    const { error } = await supabase
      .from("institution_members")
      .update({ role: payload.role })
      .eq("id", existing.id);
    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId: payload.institutionId,
      performedBy: user.id,
      tableName: "institution_members",
      recordId: existing.id as string,
      action: "UPDATE",
      beforeData: { role: existing.role },
      afterData: { role: payload.role },
      notes: `Institution role changed ${existing.role} → ${payload.role}`,
    });
  } else {
    const { data: inserted, error } = await supabase
      .from("institution_members")
      .insert({ profile_id: staff.profile_id, institution_id: payload.institutionId, role: payload.role })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId: payload.institutionId,
      performedBy: user.id,
      tableName: "institution_members",
      recordId: inserted.id as string,
      action: "INSERT",
      afterData: { profile_id: staff.profile_id, role: payload.role },
      notes: `Institution role assigned: ${payload.role}`,
    });
  }

  revalidatePath("/users/staff");
  return { success: true };
}

export async function registerUser(prevState: any, formData: FormData) {
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;

  if (!fullName || !email || !role) {
    return { error: "Missing required fields", success: false };
  }

  // Ensure role is mapped properly if needed (Student -> STUDENT, Faculty -> STAFF)
  const mappedRole = role === "Faculty" ? "STAFF" : "STUDENT";

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Get current user to ensure we are authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { error: "Unauthorized", success: false };
    }

    // 1. Get the current admin's active tenant_id
    // This calls the public.get_user_authorizations() function
    const { data: authData, error: authError } = await supabase
      .rpc('get_user_authorizations');

    if (authError || !authData || authData.length === 0) {
      return { error: "No active tenant context found for the current user.", success: false };
    }

    const currentTenantId = authData[0].tenant_id;

    // 2. Insert into staff or students depending on role
    const targetTable = mappedRole === "STAFF" ? "staff" : "students";
    const { data: profile, error: profileError } = await supabase
      .from(targetTable)
      .insert([{
        full_name: fullName,
        email: email,
        institution_id: currentTenantId
      }])
      .select("id")
      .single();

    if (profileError) {
      return { error: `Failed to create profile: ${profileError.message}`, success: false };
    }

    // 3. Insert into institution_members
    const { data: memberRow, error: tenantUserError } = await supabase
      .from("institution_members")
      .insert([{
        profile_id: profile.id,
        institution_id: currentTenantId,
        role: mappedRole
      }])
      .select("id")
      .single();

    if (tenantUserError) {
      // In a real app, we might want to rollback the profile creation here,
      // but for now we'll just return the error.
      return { error: `Failed to create tenant user: ${tenantUserError.message}`, success: false };
    }

    await logAudit({
      institutionId: currentTenantId,
      performedBy: user.id,
      tableName: "institution_members",
      recordId: memberRow.id as string,
      action: "INSERT",
      afterData: { profile_id: profile.id, role: mappedRole, full_name: fullName, email },
      notes: `New ${mappedRole} member added`,
    });

    revalidatePath("/users/staff");
    revalidatePath("/users/students");
    
    return { success: true, error: null };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred", success: false };
  }
}
