import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getLinkedStudents } from "@/actions/parentPortal";
import { ParentPortalShell } from "@/components/parent-portal/ParentPortalShell";

export const metadata = { title: "AURA — Parent Portal" };

export default async function ParentPortalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Gate: the signed-in user must have a parent account.
  const { data: parent } = await supabase
    .from("parents")
    .select("name, email, institution_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!parent) redirect("/login");

  const [kidsRes, { data: inst }] = await Promise.all([
    getLinkedStudents(),
    supabase.from("institutions").select("name").eq("id", parent.institution_id).maybeSingle(),
  ]);
  const kids = kidsRes.success ? kidsRes.data : [];

  const cookieChild = cookieStore.get("aura-parent-child")?.value ?? null;
  const selectedChildId = kids.some((k) => k.studentId === cookieChild) ? cookieChild : (kids[0]?.studentId ?? null);

  return (
    <ParentPortalShell
      parentName={(parent.name as string) ?? "Parent"}
      email={(parent.email as string) ?? user.email ?? ""}
      kids={kids}
      selectedChildId={selectedChildId}
      institution={(inst?.name as string | null) ?? null}
    >
      {children}
    </ParentPortalShell>
  );
}
