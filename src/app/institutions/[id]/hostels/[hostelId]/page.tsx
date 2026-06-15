import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getHostel, getRooms, getRoomRosters } from "@/actions/hostels";
import { HostelDetail } from "@/components/hostels/HostelDetail";

type PageProps = { params: Promise<{ id: string; hostelId: string }> };

export default async function HostelDetailPage({ params }: PageProps) {
  const { id, hostelId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [hostelRes, roomsRes, rostersRes] = await Promise.all([
    getHostel(hostelId),
    getRooms(hostelId),
    getRoomRosters(hostelId),
  ]);
  if (!hostelRes.success) notFound();

  return (
    <DashboardLayout>
      <HostelDetail
        institutionId={id}
        hostel={hostelRes.data}
        initialRooms={roomsRes.success ? roomsRes.data : []}
        initialRosters={rostersRes.success ? rostersRes.data : {}}
      />
    </DashboardLayout>
  );
}
