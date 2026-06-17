import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getDrive, getDriveRegistrations } from "@/actions/placements";
import { DriveDetailView } from "@/components/placements/DriveDetailView";

type PageProps = { params: Promise<{ id: string; driveId: string }> };

export default async function DrivePage({ params }: PageProps) {
  const { id, driveId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [driveRes, regsRes, deptRes, instRes] = await Promise.all([
    getDrive(driveId),
    getDriveRegistrations(driveId),
    supabase.from("departments").select("id, name").eq("institution_id", id),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);
  if (!driveRes.success) redirect(`/institutions/${id}/placements`);
  const departments = new Map((deptRes.data ?? []).map((d) => [d.id as string, d.name as string]));
  const deptObj: Record<string, string> = {};
  departments.forEach((v, k) => { deptObj[k] = v; });
  const slug = (instRes.data?.slug as string) ?? id;

  return (
    <DashboardLayout>
      <div className="w-full p-6 space-y-5">
        <Link href={`/institutions/${slug}/placements`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-purple-600"><ChevronLeft size={14} /> Placements</Link>
        <DriveDetailView
          institutionId={id}
          drive={driveRes.success ? driveRes.data : null}
          registrations={regsRes.success ? regsRes.data : []}
          deptNames={deptObj}
        />
      </div>
    </DashboardLayout>
  );
}
