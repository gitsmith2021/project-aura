import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getPlacementStats } from "@/actions/placements";
import { PlacementStatistics } from "@/components/placements/PlacementStatistics";

type PageProps = { params: Promise<{ id: string }> };

export default async function PlacementStatisticsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [statsRes, instRes] = await Promise.all([
    getPlacementStats(id),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);
  const slug = (instRes.data?.slug as string) ?? id;
  const data = statsRes.success ? statsRes.data : { stats: { registeredStudents: 0, placedStudents: 0, placementRate: 0, offers: 0, avgCTC: null, highestCTC: null }, deptwise: [] };

  return (
    <DashboardLayout>
      <div className="w-full p-6 space-y-5">
        <Link href={`/institutions/${slug}/placements`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-purple-600"><ChevronLeft size={14} /> Placements</Link>
        <PlacementStatistics stats={data.stats} deptwise={data.deptwise} />
      </div>
    </DashboardLayout>
  );
}
