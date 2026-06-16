import { notFound } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { getPublicInstitution } from "@/actions/admissions";
import { PublicApplyForm } from "@/components/admissions/PublicApplyForm";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const res = await getPublicInstitution(slug);
  return { title: res.success ? `Apply — ${res.data.name}` : "Admissions" };
}

export default async function AdmissionsApplyPage({ params }: PageProps) {
  const { slug } = await params;
  const res = await getPublicInstitution(slug);
  if (!res.success) notFound();
  const institution = res.data;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
            <GraduationCap className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{institution.name}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Online Admissions — Application Form</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6">
          <PublicApplyForm institution={institution} />
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">Powered by Aura Campus</p>
      </div>
    </div>
  );
}
