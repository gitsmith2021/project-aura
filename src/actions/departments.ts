"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setHOD(departmentId: string, staffId: string, institutionId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

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
        await supabase
          .from("institution_members")
          .update({ role: "STAFF" })
          .eq("profile_id", oldProfileId)
          .eq("institution_id", institutionId);
      }
    }

    // 4. Update new HOD's role in institution_members to 'HOD'
    const { error: memberError } = await supabase
      .from("institution_members")
      .update({ role: "HOD" })
      .eq("profile_id", newProfileId)
      .eq("institution_id", institutionId);

    if (memberError) throw memberError;

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
        await supabase
          .from("institution_members")
          .update({ role: "STAFF" })
          .eq("profile_id", profileId)
          .eq("institution_id", institutionId);
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
