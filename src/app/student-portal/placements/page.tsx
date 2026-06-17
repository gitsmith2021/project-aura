import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Briefcase } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getDrivesForStudent } from "@/actions/placements";
import { StudentPlacementsView } from "@/components/placements/StudentPlacementsView";

export default async function StudentPlacementsPage() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("institution_id")
    .eq("email", user.email ?? "")
    .maybeSingle();
  const institutionId = student?.institution_id as string | undefined;

  const drivesRes = institutionId ? await getDrivesForStudent(institutionId) : { success: true as const, data: [] };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Briefcase size={22} className="text-indigo-600" /> Placements
        </h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
          Browse placement drives, check your eligibility, register and track your application.
        </p>
      </div>
      <StudentPlacementsView drives={drivesRes.success ? drivesRes.data : []} />
    </div>
  );
}
