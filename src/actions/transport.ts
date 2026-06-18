"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { fleetAlerts, parseStops, pickupTimeFor, type ComplianceAlert, type RouteStop, type VehicleType } from "@/lib/transport";

type Result<T> = { success: true; data: T } | { success: false; error: string };

async function db() {
  return createClient(await cookies());
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type VehicleRow = {
  id: string;
  vehicle_number: string;
  vehicle_type: VehicleType;
  capacity: number;
  driver_name: string;
  driver_phone: string;
  driver_license: string | null;
  insurance_expiry: string | null;
  fitness_expiry: string | null;
  is_active: boolean;
};

export type RouteRow = {
  id: string;
  route_name: string;
  morning_start: string | null;
  evening_start: string | null;
  stops: RouteStop[];
  stopCount: number;
  studentCount: number;
  vehicle: { id: string; vehicle_number: string; capacity: number } | null;
};

export type AllocationRow = {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string | null;
  boardingStop: string;
};

export type RouteDetail = {
  id: string;
  route_name: string;
  morning_start: string | null;
  evening_start: string | null;
  stops: RouteStop[];
  vehicle: VehicleRow | null;
  allocations: AllocationRow[];
};

export type StudentRouteView = {
  routeName: string;
  boardingStop: string;
  pickupTime: string | null;
  morningStart: string | null;
  eveningStart: string | null;
  stops: RouteStop[];
  vehicleNumber: string | null;
  vehicleType: VehicleType | null;
  driverName: string | null;
  driverPhone: string | null;
};

// ── Vehicles ──────────────────────────────────────────────────────────────────

export async function getVehicles(institutionId: string): Promise<Result<VehicleRow[]>> {
  try {
    const supabase = await db();
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, vehicle_number, vehicle_type, capacity, driver_name, driver_phone, driver_license, insurance_expiry, fitness_expiry, is_active")
      .eq("institution_id", institutionId)
      .order("vehicle_number");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as VehicleRow[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getExpiryAlerts(institutionId: string): Promise<Result<ComplianceAlert[]>> {
  try {
    const supabase = await db();
    const { data, error } = await supabase
      .from("vehicles")
      .select("vehicle_number, insurance_expiry, fitness_expiry, is_active")
      .eq("institution_id", institutionId)
      .eq("is_active", true);
    if (error) return { success: false, error: error.message };
    return { success: true, data: fleetAlerts((data ?? []) as never) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function createVehicle(input: {
  institutionId: string; vehicleNumber: string; vehicleType: VehicleType; capacity: number;
  driverName: string; driverPhone: string; driverLicense?: string | null;
  insuranceExpiry?: string | null; fitnessExpiry?: string | null;
}): Promise<Result<{ id: string }>> {
  try {
    if (!input.vehicleNumber.trim()) return { success: false, error: "Vehicle number is required." };
    if (!input.driverName.trim()) return { success: false, error: "Driver name is required." };
    if (!input.driverPhone.trim()) return { success: false, error: "Driver phone is required." };
    const supabase = await db();
    const { data, error } = await supabase.from("vehicles").insert({
      institution_id: input.institutionId,
      vehicle_number: input.vehicleNumber.trim().toUpperCase(),
      vehicle_type: input.vehicleType,
      capacity: input.capacity,
      driver_name: input.driverName.trim(),
      driver_phone: input.driverPhone.trim(),
      driver_license: input.driverLicense?.trim() || null,
      insurance_expiry: input.insuranceExpiry || null,
      fitness_expiry: input.fitnessExpiry || null,
    }).select("id").single();
    if (error) {
      if (error.code === "23505") return { success: false, error: "A vehicle with this number already exists." };
      return { success: false, error: error.message };
    }
    revalidatePath(`/institutions/${input.institutionId}/transport/vehicles`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateVehicle(input: {
  institutionId: string; id: string; vehicleNumber: string; vehicleType: VehicleType; capacity: number;
  driverName: string; driverPhone: string; driverLicense?: string | null;
  insuranceExpiry?: string | null; fitnessExpiry?: string | null; isActive: boolean;
}): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("vehicles").update({
      vehicle_number: input.vehicleNumber.trim().toUpperCase(),
      vehicle_type: input.vehicleType,
      capacity: input.capacity,
      driver_name: input.driverName.trim(),
      driver_phone: input.driverPhone.trim(),
      driver_license: input.driverLicense?.trim() || null,
      insurance_expiry: input.insuranceExpiry || null,
      fitness_expiry: input.fitnessExpiry || null,
      is_active: input.isActive,
    }).eq("id", input.id);
    if (error) {
      if (error.code === "23505") return { success: false, error: "A vehicle with this number already exists." };
      return { success: false, error: error.message };
    }
    revalidatePath(`/institutions/${input.institutionId}/transport/vehicles`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteVehicle(input: { institutionId: string; id: string }): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("vehicles").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/transport/vehicles`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function getRoutes(institutionId: string): Promise<Result<RouteRow[]>> {
  try {
    const supabase = await db();
    const { data, error } = await supabase
      .from("bus_routes")
      .select("id, route_name, morning_start, evening_start, stops, vehicles(id, vehicle_number, capacity), transport_allocations(count)")
      .eq("institution_id", institutionId)
      .order("route_name");
    if (error) return { success: false, error: error.message };
    const rows: RouteRow[] = (data ?? []).map((r) => {
      const v = r.vehicles as unknown as { id: string; vehicle_number: string; capacity: number } | null;
      const countRel = r.transport_allocations as unknown as { count: number }[] | null;
      const stops = parseStops(r.stops);
      return {
        id: r.id as string,
        route_name: r.route_name as string,
        morning_start: (r.morning_start as string | null) ?? null,
        evening_start: (r.evening_start as string | null) ?? null,
        stops,
        stopCount: stops.length,
        studentCount: countRel?.[0]?.count ?? 0,
        vehicle: v ? { id: v.id, vehicle_number: v.vehicle_number, capacity: v.capacity } : null,
      };
    });
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getRouteDetail(institutionId: string, routeId: string): Promise<Result<RouteDetail>> {
  try {
    const supabase = await db();
    const { data, error } = await supabase
      .from("bus_routes")
      .select("id, route_name, morning_start, evening_start, stops, vehicles(id, vehicle_number, vehicle_type, capacity, driver_name, driver_phone, driver_license, insurance_expiry, fitness_expiry, is_active), transport_allocations(id, boarding_stop, students(id, full_name, roll_no))")
      .eq("institution_id", institutionId)
      .eq("id", routeId)
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Route not found." };
    const v = data.vehicles as unknown as VehicleRow | null;
    const allocs = (Array.isArray(data.transport_allocations) ? data.transport_allocations : []).map((a) => {
      const s = a.students as unknown as { id: string; full_name: string; roll_no: string | null } | null;
      return {
        id: a.id as string,
        studentId: s?.id ?? "",
        studentName: s?.full_name ?? "—",
        rollNo: s?.roll_no ?? null,
        boardingStop: (a.boarding_stop as string) ?? "",
      };
    }).sort((a, b) => a.studentName.localeCompare(b.studentName));
    return {
      success: true,
      data: {
        id: data.id as string,
        route_name: data.route_name as string,
        morning_start: (data.morning_start as string | null) ?? null,
        evening_start: (data.evening_start as string | null) ?? null,
        stops: parseStops(data.stops),
        vehicle: v ?? null,
        allocations: allocs,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function createRoute(input: {
  institutionId: string; routeName: string; vehicleId?: string | null;
  stops: RouteStop[]; morningStart?: string | null; eveningStart?: string | null;
}): Promise<Result<{ id: string }>> {
  try {
    if (!input.routeName.trim()) return { success: false, error: "Route name is required." };
    const supabase = await db();
    const { data, error } = await supabase.from("bus_routes").insert({
      institution_id: input.institutionId,
      route_name: input.routeName.trim(),
      vehicle_id: input.vehicleId || null,
      stops: input.stops,
      morning_start: input.morningStart || null,
      evening_start: input.eveningStart || null,
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/transport`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateRoute(input: {
  institutionId: string; id: string; routeName: string; vehicleId?: string | null;
  stops: RouteStop[]; morningStart?: string | null; eveningStart?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("bus_routes").update({
      route_name: input.routeName.trim(),
      vehicle_id: input.vehicleId || null,
      stops: input.stops,
      morning_start: input.morningStart || null,
      evening_start: input.eveningStart || null,
    }).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/transport`);
    revalidatePath(`/institutions/${input.institutionId}/transport/${input.id}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteRoute(input: { institutionId: string; id: string }): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("bus_routes").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/transport`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Allocations ───────────────────────────────────────────────────────────────

export async function assignStudent(input: {
  institutionId: string; routeId: string; studentId: string; boardingStop: string; academicYearId?: string | null;
}): Promise<Result<null>> {
  try {
    if (!input.studentId) return { success: false, error: "Select a student." };
    if (!input.boardingStop.trim()) return { success: false, error: "Boarding stop is required." };
    const supabase = await db();
    const { error } = await supabase.from("transport_allocations").insert({
      institution_id: input.institutionId,
      bus_route_id: input.routeId,
      student_id: input.studentId,
      boarding_stop: input.boardingStop.trim(),
      academic_year_id: input.academicYearId || null,
    });
    if (error) {
      if (error.code === "23505") return { success: false, error: "This student is already allocated for this academic year." };
      return { success: false, error: error.message };
    }
    revalidatePath(`/institutions/${input.institutionId}/transport/${input.routeId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function unassignStudent(input: { institutionId: string; routeId: string; allocationId: string }): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("transport_allocations").delete().eq("id", input.allocationId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/transport/${input.routeId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Student portal: my bus route ──────────────────────────────────────────────

export async function getStudentRoute(): Promise<Result<StudentRouteView | null>> {
  try {
    const supabase = await db();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { success: false, error: "Unauthorized." };

    const { data: student } = await supabase.from("students").select("id").eq("email", user.email).maybeSingle();
    if (!student) return { success: true, data: null };

    // RLS "talloc: student reads own" + the route/vehicle read policies make this safe.
    const { data, error } = await supabase
      .from("transport_allocations")
      .select("boarding_stop, bus_routes(route_name, morning_start, evening_start, stops, vehicles(vehicle_number, vehicle_type, driver_name, driver_phone))")
      .eq("student_id", student.id as string)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: true, data: null };

    const route = data.bus_routes as unknown as {
      route_name: string; morning_start: string | null; evening_start: string | null; stops: unknown;
      vehicles: { vehicle_number: string; vehicle_type: VehicleType; driver_name: string; driver_phone: string } | null;
    } | null;
    if (!route) return { success: true, data: null };

    const stops = parseStops(route.stops);
    const boardingStop = (data.boarding_stop as string) ?? "";
    return {
      success: true,
      data: {
        routeName: route.route_name,
        boardingStop,
        pickupTime: pickupTimeFor(stops, boardingStop),
        morningStart: route.morning_start,
        eveningStart: route.evening_start,
        stops,
        vehicleNumber: route.vehicles?.vehicle_number ?? null,
        vehicleType: route.vehicles?.vehicle_type ?? null,
        driverName: route.vehicles?.driver_name ?? null,
        driverPhone: route.vehicles?.driver_phone ?? null,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
