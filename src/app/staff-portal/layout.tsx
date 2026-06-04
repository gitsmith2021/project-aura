import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { StaffSidebar } from "@/components/staff-portal/StaffSidebar";

export const metadata = { title: "AURA — Staff Portal" };

export default async function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  // Auth guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Role guard: find staff record by email
  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, title, designation, institution_id, institutions(name)")
    .eq("email", user.email)
    .eq("is_active", true)
    .maybeSingle();

  // Not a staff member → send to admin area
  if (!staff) redirect("/institutions");

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <StaffSidebar
        staffName={staff.full_name}
        staffTitle={staff.title ?? null}
        designation={staff.designation ?? null}
        institution={(staff.institutions as unknown as { name: string } | null)?.name ?? ""}
      />

      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
