"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

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
    const { error: tenantUserError } = await supabase
      .from("institution_members")
      .insert([{
        profile_id: profile.id,
        institution_id: currentTenantId,
        role: mappedRole
      }]);

    if (tenantUserError) {
      // In a real app, we might want to rollback the profile creation here,
      // but for now we'll just return the error.
      return { error: `Failed to create tenant user: ${tenantUserError.message}`, success: false };
    }

    revalidatePath("/users/staff");
    revalidatePath("/users/students");
    
    return { success: true, error: null };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred", success: false };
  }
}
