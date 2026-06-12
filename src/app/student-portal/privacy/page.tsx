import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { PrivacyCenter } from "@/components/privacy/PrivacyCenter";

export const metadata = { title: "Privacy & Data" };

export default async function StudentPrivacyPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("id, institution_id")
    .eq("email", user.email)
    .maybeSingle();
  if (!student) redirect("/login");

  return (
    <div className="px-6 py-8 w-full max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
          <ShieldCheck size={20} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Privacy &amp; Data</h1>
          <p className="text-xs text-slate-500">
            Your consents and data rights under the DPDP Act 2023
          </p>
        </div>
      </div>

      <PrivacyCenter
        institutionId={student.institution_id}
        subjectType="student"
        subjectId={student.id}
      />
    </div>
  );
}
