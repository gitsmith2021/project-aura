import { getStaffProfile } from "@/actions/staffPortal";
import { getVenues, getMyBookings } from "@/actions/venueBookings";
import { StaffBookings } from "@/components/bookings/StaffBookings";

export const metadata = { title: "Bookings — Staff Portal" };

export default async function StaffBookingsPage() {
  const profile = await getStaffProfile();
  const staff = profile.success ? profile.data : null;

  const [venuesRes, mineRes] = staff
    ? await Promise.all([getVenues(staff.institution_id, { activeOnly: true }), getMyBookings()])
    : [null, null];
  const venues = venuesRes && venuesRes.success ? venuesRes.data : [];
  const mine = mineRes && mineRes.success ? mineRes.data : [];

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      {staff ? (
        <StaffBookings institutionId={staff.institution_id} venues={venues} initial={mine} />
      ) : (
        <p className="text-xs text-slate-400">Could not load your profile.</p>
      )}
    </div>
  );
}
