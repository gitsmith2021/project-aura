import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getHostel } from "@/actions/hostels";
import { getHostelAnnouncements } from "@/actions/hostelAnnouncements";
import { AnnouncementsManager } from "@/components/hostels/AnnouncementsManager";

type PageProps = { params: Promise<{ id: string; hostelId: string }> };

export default async function HostelAnnouncementsPage({ params }: PageProps) {
  const { id, hostelId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [hostelRes, annRes] = await Promise.all([getHostel(hostelId), getHostelAnnouncements(hostelId)]);
  if (!hostelRes.success) notFound();

  return (
    <DashboardLayout>
      <div className="px-6 pt-6 pb-6 w-full">
        <Link href={`/institutions/${id}/hostels/${hostelId}`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2">
          <ChevronLeft size={14} /> {hostelRes.data.name}
        </Link>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-1">Announcements — {hostelRes.data.name}</h1>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">Notices for residents of this hostel.</p>
        <div className="max-w-3xl">
          <AnnouncementsManager institutionId={id} hostelId={hostelId} initial={annRes.success ? annRes.data : []} />
        </div>
      </div>
    </DashboardLayout>
  );
}
