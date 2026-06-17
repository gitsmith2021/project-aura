import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getAlumniProfile } from "@/actions/alumni";
import { graduationYearToBatch } from "@/lib/alumni";
import { AlumniPortalShell } from "@/components/alumni-portal/AlumniPortalShell";

export const metadata = { title: "AURA — Alumni Portal" };

export default async function AlumniPortalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Gate: the signed-in user must have an active alumni record.
  const profileRes = await getAlumniProfile();
  if (!profileRes.success || !profileRes.data) redirect("/login");
  const alum = profileRes.data;

  const { data: inst } = await supabase
    .from("institutions")
    .select("name")
    .eq("id", alum.institution_id)
    .maybeSingle();

  return (
    <AlumniPortalShell
      displayName={alum.full_name}
      batch={alum.batch ?? graduationYearToBatch(alum.graduation_year, alum.program)}
      department={(alum.departments as { name: string } | null)?.name ?? null}
      institution={(inst?.name as string | null) ?? null}
      email={user.email ?? ""}
    >
      {children}
    </AlumniPortalShell>
  );
}
