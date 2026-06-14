import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getActiveNotices } from "@/actions/notices";
import { NoticeBoard } from "@/components/notices/NoticeBoard";

export const metadata = { title: "Notices — Student Portal" };

export default async function StudentNoticesPage() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("institution_id, department_id")
    .eq("email", user.email)
    .maybeSingle();

  const res = student
    ? await getActiveNotices(student.institution_id as string, {
        kind: "student",
        departmentId: (student.department_id as string | null) ?? null,
      })
    : null;
  const notices = res && res.success ? res.data : [];

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center gap-2">
        <Megaphone size={18} className="text-violet-500" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Notices</h1>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
        Announcements for students and your department.
      </p>
      <div className="max-w-3xl">
        <NoticeBoard notices={notices} emptyText="No notices for you right now." />
      </div>
    </div>
  );
}
