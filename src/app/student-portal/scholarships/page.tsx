import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getAvailableSchemes, getMyScholarshipApplications } from "@/actions/scholarships";
import { StudentScholarshipsView } from "@/components/scholarships/StudentScholarshipsView";

export default async function StudentScholarshipsPage() {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("institution_id")
    .eq("email", user.email ?? "")
    .maybeSingle();
  const institutionId = student?.institution_id as string | undefined;

  let currentAyId: string | null = null;
  if (institutionId) {
    const { data: ay } = await supabase
      .from("academic_years")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("is_current", true)
      .maybeSingle();
    currentAyId = (ay?.id as string | null) ?? null;
  }

  const [schemesRes, appsRes] = await Promise.all([
    institutionId ? getAvailableSchemes(institutionId) : Promise.resolve({ success: true as const, data: [] }),
    getMyScholarshipApplications(),
  ]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Award size={22} className="text-indigo-600" /> Scholarships
        </h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
          Browse available schemes, check your eligibility, apply with proof documents and track disbursement.
        </p>
      </div>
      <StudentScholarshipsView
        schemes={schemesRes.success ? schemesRes.data : []}
        myApplications={appsRes.success ? appsRes.data : []}
        academicYearId={currentAyId}
      />
    </div>
  );
}
