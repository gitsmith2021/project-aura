import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getBookings } from "@/actions/venueBookings";
import { RequestsTable } from "@/components/bookings/RequestsTable";

type PageProps = { params: Promise<{ id: string }> };

export default async function BookingRequestsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getBookings(id, { status: "pending" });
  const pending = res.success ? res.data : [];

  return (
    <DashboardLayout>
      <div className="px-6 pt-6 pb-6 w-full">
        <Link href={`/institutions/${id}/bookings`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-3">
          <ChevronLeft size={14} /> Space Booking
        </Link>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-1">Booking Requests</h1>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">Approve or reject pending venue requests. Conflicts are re-checked on approval.</p>
        <div className="max-w-3xl">
          <RequestsTable institutionId={id} initial={pending} />
        </div>
      </div>
    </DashboardLayout>
  );
}
