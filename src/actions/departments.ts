"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/auditLog";

export async function setHOD(departmentId: string, staffId: string, institutionId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Get the department to see if there is an existing HOD
    const { data: dept, error: deptError } = await supabase
      .from("departments")
      .select("hod_id")
      .eq("id", departmentId)
      .single();

    if (deptError) throw deptError;
    const oldHodId = dept?.hod_id;

    // 2. Fetch the profile_id for the new HOD staff member
    const { data: newStaff, error: newStaffError } = await supabase
      .from("staff")
      .select("profile_id")
      .eq("id", staffId)
      .single();

    if (newStaffError) throw newStaffError;
    const newProfileId = newStaff?.profile_id;

    if (!newProfileId) {
      throw new Error("New HOD staff member does not have a linked user profile.");
    }

    // 3. Revert old HOD role in institution_members to 'STAFF' (if old HOD exists)
    if (oldHodId && oldHodId !== staffId) {
      const { data: oldStaff } = await supabase
        .from("staff")
        .select("profile_id")
        .eq("id", oldHodId)
        .single();
      
      const oldProfileId = oldStaff?.profile_id;

      if (oldProfileId) {
        const { data: oldMember } = await supabase
          .from("institution_members")
          .select("id, role")
          .eq("profile_id", oldProfileId)
          .eq("institution_id", institutionId)
          .maybeSingle();

        await supabase
          .from("institution_members")
          .update({ role: "STAFF" })
          .eq("profile_id", oldProfileId)
          .eq("institution_id", institutionId);

        if (oldMember) {
          await logAudit({
            institutionId,
            performedBy: user?.id ?? null,
            tableName: "institution_members",
            recordId: oldMember.id as string,
            action: "UPDATE",
            beforeData: { role: oldMember.role },
            afterData: { role: "STAFF" },
            notes: "Previous HOD demoted (department head reassigned)",
          });
        }
      }
    }

    // 4. Update new HOD's role in institution_members to 'HOD'
    const { data: newMember } = await supabase
      .from("institution_members")
      .select("id, role")
      .eq("profile_id", newProfileId)
      .eq("institution_id", institutionId)
      .maybeSingle();

    const { error: memberError } = await supabase
      .from("institution_members")
      .update({ role: "HOD" })
      .eq("profile_id", newProfileId)
      .eq("institution_id", institutionId);

    if (memberError) throw memberError;

    if (newMember) {
      await logAudit({
        institutionId,
        performedBy: user?.id ?? null,
        tableName: "institution_members",
        recordId: newMember.id as string,
        action: "UPDATE",
        beforeData: { role: newMember.role },
        afterData: { role: "HOD" },
        notes: "Appointed department head",
      });
    }

    // 5. Update departments.hod_id to staffId
    const { error: updateDeptError } = await supabase
      .from("departments")
      .update({ hod_id: staffId })
      .eq("id", departmentId);

    if (updateDeptError) throw updateDeptError;

    revalidatePath(`/institutions/${institutionId}`);
    revalidatePath(`/institutions/${institutionId}/department/${departmentId}`);
    return { success: true as const };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to set HOD" };
  }
}

export async function removeHOD(departmentId: string, institutionId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Get the department to identify the current HOD
    const { data: dept, error: deptError } = await supabase
      .from("departments")
      .select("hod_id")
      .eq("id", departmentId)
      .single();

    if (deptError) throw deptError;
    const hodId = dept?.hod_id;

    if (hodId) {
      // 2. Fetch profile_id for this HOD
      const { data: staffMember } = await supabase
        .from("staff")
        .select("profile_id")
        .eq("id", hodId)
        .single();

      const profileId = staffMember?.profile_id;

      // 3. Revert HOD role to 'STAFF'
      if (profileId) {
        const { data: member } = await supabase
          .from("institution_members")
          .select("id, role")
          .eq("profile_id", profileId)
          .eq("institution_id", institutionId)
          .maybeSingle();

        await supabase
          .from("institution_members")
          .update({ role: "STAFF" })
          .eq("profile_id", profileId)
          .eq("institution_id", institutionId);

        if (member) {
          await logAudit({
            institutionId,
            performedBy: user?.id ?? null,
            tableName: "institution_members",
            recordId: member.id as string,
            action: "UPDATE",
            beforeData: { role: member.role },
            afterData: { role: "STAFF" },
            notes: "Department head removed",
          });
        }
      }
    }

    // 4. Clear departments.hod_id
    const { error: updateDeptError } = await supabase
      .from("departments")
      .update({ hod_id: null })
      .eq("id", departmentId);

    if (updateDeptError) throw updateDeptError;

    revalidatePath(`/institutions/${institutionId}`);
    revalidatePath(`/institutions/${institutionId}/department/${departmentId}`);
    return { success: true as const };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to remove HOD" };
  }
}
