import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { StaffViewShell } from "@/components/staff-portal/StaffViewShell";

type Props = {
  children: React.ReactNode;
  params: Promise<{ staffId: string }>;
};

export default async function StaffViewLayout({ children, params }: Props) {
  const { staffId } = await params;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, title, designation, department_id, institution_id, departments(name), institutions(name)")
    .eq("id", staffId)
    .single();

  if (!staff) redirect("/users/staff");

  const displayName = `${staff.title ? staff.title + " " : ""}${staff.full_name}`;
  const dept = (staff.departments as unknown as { name: string } | null)?.name ?? null;
  const inst = (staff.institutions as unknown as { name: string } | null)?.name ?? null;

  return (
    <StaffViewShell
      staffId={staffId}
      displayName={displayName}
      designation={staff.designation ?? null}
      department={dept}
      institution={inst}
    >
      {children}
    </StaffViewShell>
  );
}
