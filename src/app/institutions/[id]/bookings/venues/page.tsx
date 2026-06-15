import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getVenues } from "@/actions/venueBookings";
import { VenuesManager } from "@/components/bookings/VenuesManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function VenuesPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getVenues(id);
  const venues = res.success ? res.data : [];

  return (
    <DashboardLayout>
      <div className="px-6 pt-6 pb-6 w-full">
        <Link href={`/institutions/${id}/bookings`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-3">
          <ChevronLeft size={14} /> Space Booking
        </Link>
        <VenuesManager institutionId={id} initial={venues} />
      </div>
    </DashboardLayout>
  );
}
