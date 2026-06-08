import { cookies }  from "next/headers";
import { headers }  from "next/headers";
import { redirect } from "next/navigation";
import { createClient }         from "@/utils/supabase/server";
import { StudentPortalShell }   from "@/components/student-portal/StudentPortalShell";

export const metadata = { title: "AURA — Student Portal" };

export default async function StudentPortalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // View routes (/student-portal/view/*) have their own StudentViewShell layout.
  // Skip StudentPortalShell here to avoid a double topbar/sidebar.
  const headerList = await headers();
  const pathname   = headerList.get("x-pathname") ?? "";
  if (pathname.startsWith("/student-portal/view/")) {
    return <>{children}</>;
  }

  const role = cookieStore.get("aura-role")?.value;
  if (role !== "student") redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, email, roll_no, student_program, student_year, department_id, institution_id, departments(name), institutions(name)")
    .eq("email", user.email)
    .maybeSingle();

  if (!student) redirect("/login");

  const dept = (student.departments as unknown as { name: string } | null)?.name ?? null;
  const inst = (student.institutions as unknown as { name: string } | null)?.name ?? null;

  return (
    <StudentPortalShell
      studentId={student.id}
      displayName={student.full_name}
      rollNo={student.roll_no ?? null}
      program={student.student_program ?? null}
      studentYear={student.student_year ?? null}
      department={dept}
      institution={inst}
      email={user.email ?? ""}
    >
      {children}
    </StudentPortalShell>
  );
}
