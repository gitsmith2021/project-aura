import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import { createClient }       from "@/utils/supabase/server";
import { StudentViewShell }   from "@/components/student-portal/StudentViewShell";

type Props = {
  children: React.ReactNode;
  params:   Promise<{ studentId: string }>;
};

export default async function StudentViewLayout({ children, params }: Props) {
  const { studentId } = await params;

  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, roll_no, student_program, student_year, department_id, institution_id, departments(name), institutions(name)")
    .eq("id", studentId)
    .single();

  if (!student) redirect("/users/students");

  const dept = (student.departments as unknown as { name: string } | null)?.name ?? null;
  const inst = (student.institutions as unknown as { name: string } | null)?.name ?? null;

  return (
    <StudentViewShell
      studentId={studentId}
      displayName={student.full_name}
      rollNo={student.roll_no ?? null}
      program={student.student_program ?? null}
      studentYear={student.student_year ?? null}
      department={dept}
      institution={inst}
    >
      {children}
    </StudentViewShell>
  );
}
