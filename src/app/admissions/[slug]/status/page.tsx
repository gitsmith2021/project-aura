import { notFound } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { getPublicInstitution } from "@/actions/admissions";
import { StatusCheck } from "@/components/admissions/StatusCheck";

type PageProps = { params: Promise<{ slug: string }> };

export const metadata = { title: "Application Status" };

export default async function AdmissionStatusPage({ params }: PageProps) {
  const { slug } = await params;
  const res = await getPublicInstitution(slug);
  if (!res.success) notFound();
  const institution = res.data;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
            <ClipboardCheck className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{institution.name}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Check your application status</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6">
          <StatusCheck slug={institution.slug} />
        </div>
      </div>
    </div>
  );
}
