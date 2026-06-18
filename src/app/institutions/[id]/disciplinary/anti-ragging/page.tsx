import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getIncidents } from "@/actions/disciplinary";
import { AntiRaggingRegister } from "@/components/disciplinary/AntiRaggingRegister";

type PageProps = { params: Promise<{ id: string }> };

export default async function AntiRaggingPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [incRes, instRes] = await Promise.all([
    getIncidents(id),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);
  const slug = (instRes.data?.slug as string) ?? id;
  const ragging = (incRes.success ? incRes.data : []).filter((i) => i.incident_type === "ragging");

  return (
    <DashboardLayout>
      <div className="w-full p-6 space-y-5">
        <Link href={`/institutions/${slug}/disciplinary`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-purple-600"><ChevronLeft size={14} /> Disciplinary Register</Link>
        <AntiRaggingRegister instSlug={slug} incidents={ragging} />
      </div>
    </DashboardLayout>
  );
}
