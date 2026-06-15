import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, ClipboardList } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getVenues, getBookings } from "@/actions/venueBookings";
import { WeekCalendar } from "@/components/bookings/WeekCalendar";

type PageProps = { params: Promise<{ id: string }> };

export default async function BookingsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [venuesRes, bookingsRes] = await Promise.all([getVenues(id), getBookings(id)]);
  const venues = venuesRes.success ? venuesRes.data : [];
  const bookings = bookingsRes.success ? bookingsRes.data : [];

  const active = bookings.filter((b) => b.status === "approved" || b.status === "pending");
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  return (
    <DashboardLayout>
      <div className="px-6 pt-6 pb-6 w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Space Booking</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Upcoming bookings across all venues.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/institutions/${id}/bookings/venues`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              <Building2 size={14} /> Venues ({venues.length})
            </Link>
            <Link href={`/institutions/${id}/bookings/requests`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30">
              <ClipboardList size={14} /> Requests{pendingCount > 0 ? ` (${pendingCount})` : ""}
            </Link>
          </div>
        </div>

        <WeekCalendar bookings={active} />
      </div>
    </DashboardLayout>
  );
}
