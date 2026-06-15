import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getMyClubMemberships } from "@/actions/clubs";
import StudentClubs from "@/components/clubs/StudentClubs";

export const metadata = { title: "Clubs & Groups — Student Portal" };

export default async function StudentClubsPage() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getMyClubMemberships();
  const memberships = res.success ? res.data : [];

  // Also fetch the current student's full info for the certificates
  const { data: student } = await supabase
    .from("students")
    .select("full_name, roll_no")
    .eq("profile_id", user.id)
    .maybeSingle();

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <StudentClubs
        memberships={memberships}
        studentName={student?.full_name ?? "Student"}
        rollNo={student?.roll_no ?? ""}
      />
    </div>
  );
}
