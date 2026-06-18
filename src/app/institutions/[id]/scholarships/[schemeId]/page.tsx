import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getScheme, getSchemeApplications } from "@/actions/scholarships";
import { SchemeApplications } from "@/components/scholarships/SchemeApplications";

type PageProps = { params: Promise<{ id: string; schemeId: string }> };

export default async function SchemeApplicationsPage({ params }: PageProps) {
  const { id, schemeId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [schemeRes, appsRes, instRes] = await Promise.all([
    getScheme(schemeId),
    getSchemeApplications(schemeId),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);
  if (!schemeRes.success) redirect(`/institutions/${id}/scholarships`);
  const slug = (instRes.data?.slug as string) ?? id;

  return (
    <DashboardLayout>
      <div className="w-full p-6 space-y-5">
        <Link href={`/institutions/${slug}/scholarships`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-purple-600"><ChevronLeft size={14} /> Scholarships</Link>
        <SchemeApplications
          institutionId={id}
          scheme={schemeRes.success ? schemeRes.data : null}
          applications={appsRes.success ? appsRes.data : []}
        />
      </div>
    </DashboardLayout>
  );
}
