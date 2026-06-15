"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { hasConflict, isValidRange, type Venue, type VenueBooking, type VenueType } from "@/lib/venueBookings";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const VENUE_COLS = "id, institution_id, name, venue_type, capacity, amenities, is_active, created_at";
const BOOKING_COLS =
  "id, institution_id, venue_id, booked_by, event_title, purpose, start_datetime, end_datetime, attendees_count, status, admin_notes, created_at, venues(name, venue_type)";

export type VenueInput = {
  institution_id: string;
  name: string;
  venue_type: VenueType;
  capacity?: number | null;
  amenities?: string[] | null;
};

export type BookingWithBooker = VenueBooking & { booker_name: string };

// ── Venues ────────────────────────────────────────────────────────────────────
export async function getVenues(institutionId: string, opts?: { activeOnly?: boolean }): Promise<Result<Venue[]>> {
  try {
    const supabase = createClient(await cookies());
    let q = supabase.from("venues").select(VENUE_COLS).eq("institution_id", institutionId);
    if (opts?.activeOnly) q = q.eq("is_active", true);
    const { data, error } = await q.order("name");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as Venue[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function addVenue(input: VenueInput): Promise<Result<Venue>> {
  try {
    if (!input.name.trim()) return { success: false, error: "Venue name is required." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("venues")
      .insert({
        institution_id: input.institution_id,
        name: input.name.trim(),
        venue_type: input.venue_type,
        capacity: input.capacity ?? null,
        amenities: input.amenities ?? null,
      })
      .select(VENUE_COLS)
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institution_id}/bookings/venues`);
    return { success: true, data: data as unknown as Venue };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function setVenueActive(id: string, institutionId: string, isActive: boolean): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("venues").update({ is_active: isActive }).eq("id", id).eq("institution_id", institutionId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/bookings/venues`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Bookings ──────────────────────────────────────────────────────────────────
async function venueBookingsForConflict(venueId: string) {
  const supabase = createClient(await cookies());
  const { data } = await supabase
    .from("venue_bookings")
    .select("id, start_datetime, end_datetime, status")
    .eq("venue_id", venueId)
    .in("status", ["pending", "approved"]);
  return (data ?? []) as { id: string; start_datetime: string; end_datetime: string; status: "pending" | "approved" }[];
}

export async function createBooking(input: {
  institutionId: string; venueId: string; eventTitle: string; purpose?: string | null;
  startDatetime: string; endDatetime: string; attendeesCount?: number | null;
}): Promise<Result<null>> {
  try {
    if (!input.eventTitle.trim()) return { success: false, error: "Event title is required." };
    if (!isValidRange(input.startDatetime, input.endDatetime)) return { success: false, error: "End time must be after start time." };

    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const existing = await venueBookingsForConflict(input.venueId);
    if (hasConflict(input.startDatetime, input.endDatetime, existing)) {
      return { success: false, error: "That venue is already booked for an overlapping time slot." };
    }

    const { error } = await supabase.from("venue_bookings").insert({
      institution_id: input.institutionId,
      venue_id: input.venueId,
      booked_by: user.id,
      event_title: input.eventTitle.trim(),
      purpose: input.purpose?.trim() || null,
      start_datetime: input.startDatetime,
      end_datetime: input.endDatetime,
      attendees_count: input.attendeesCount ?? null,
      status: "pending",
    });
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/bookings`);
    revalidatePath("/staff-portal/bookings");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function approveBooking(id: string, institutionId: string, notes?: string): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { data: booking, error } = await supabase
      .from("venue_bookings").select("venue_id, start_datetime, end_datetime").eq("id", id).maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!booking) return { success: false, error: "Booking not found." };

    // Re-check against other blocking bookings (someone else may have been approved meanwhile)
    const existing = await venueBookingsForConflict(booking.venue_id as string);
    if (hasConflict(booking.start_datetime as string, booking.end_datetime as string, existing, { ignoreId: id })) {
      return { success: false, error: "Cannot approve — it now clashes with another booking for this venue." };
    }

    const { error: updErr } = await supabase
      .from("venue_bookings")
      .update({ status: "approved", admin_notes: notes?.trim() || null })
      .eq("id", id).eq("institution_id", institutionId);
    if (updErr) return { success: false, error: updErr.message };
    revalidatePath(`/institutions/${institutionId}/bookings`);
    revalidatePath(`/institutions/${institutionId}/bookings/requests`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function rejectBooking(id: string, institutionId: string, notes?: string): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase
      .from("venue_bookings")
      .update({ status: "rejected", admin_notes: notes?.trim() || null })
      .eq("id", id).eq("institution_id", institutionId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/bookings/requests`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function cancelBooking(id: string): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("venue_bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/staff-portal/bookings");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getBookings(
  institutionId: string,
  opts?: { status?: "pending" | "approved" | "rejected" | "cancelled" }
): Promise<Result<BookingWithBooker[]>> {
  try {
    const supabase = createClient(await cookies());
    let q = supabase.from("venue_bookings").select(BOOKING_COLS).eq("institution_id", institutionId);
    if (opts?.status) q = q.eq("status", opts.status);
    const { data, error } = await q.order("start_datetime", { ascending: true });
    if (error) return { success: false, error: error.message };
    const rows = (data ?? []) as unknown as VenueBooking[];

    const ids = Array.from(new Set(rows.map((r) => r.booked_by)));
    const nameById = new Map<string, string>();
    if (ids.length > 0) {
      const [staff, students] = await Promise.all([
        supabase.from("staff").select("profile_id, full_name").in("profile_id", ids),
        supabase.from("students").select("profile_id, full_name").in("profile_id", ids),
      ]);
      for (const s of staff.data ?? []) nameById.set(s.profile_id as string, s.full_name as string);
      for (const s of students.data ?? []) nameById.set(s.profile_id as string, s.full_name as string);
    }
    return { success: true, data: rows.map((r) => ({ ...r, booker_name: nameById.get(r.booked_by) ?? "Unknown" })) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getMyBookings(): Promise<Result<VenueBooking[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };
    const { data, error } = await supabase
      .from("venue_bookings").select(BOOKING_COLS).eq("booked_by", user.id).order("start_datetime", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as VenueBooking[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
