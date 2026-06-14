"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { MaintenanceCategory, MaintenancePriority, MaintenanceStatus, MaintenanceRequest } from "@/lib/messMaintenance";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const COLS = "id, hostel_id, room_id, raised_by, category, description, photo_url, priority, status, assigned_to, resolution_notes, resolved_at, created_at";

export async function raiseMaintenanceRequest(input: {
  hostelId: string; roomId?: string | null; category: MaintenanceCategory; description: string; priority: MaintenancePriority;
}): Promise<Result<MaintenanceRequest>> {
  try {
    if (!input.description.trim()) return { success: false, error: "Please describe the issue." };
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const { data, error } = await supabase
      .from("hostel_maintenance_requests")
      .insert({
        hostel_id: input.hostelId, room_id: input.roomId ?? null, raised_by: user.id,
        category: input.category, description: input.description.trim(), priority: input.priority, status: "open",
      })
      .select(COLS)
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath("/student-portal/hostel");
    return { success: true, data: data as unknown as MaintenanceRequest };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export type MaintenanceWithMeta = MaintenanceRequest & { room_number: string | null; raiser_name: string };

export async function getMaintenanceRequests(hostelId: string): Promise<Result<MaintenanceWithMeta[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("hostel_maintenance_requests")
      .select(`${COLS}, hostel_rooms(room_number)`)
      .eq("hostel_id", hostelId)
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    const rows = (data ?? []) as unknown as (MaintenanceRequest & { hostel_rooms: { room_number: string } | null })[];

    const ids = Array.from(new Set(rows.map((r) => r.raised_by)));
    const nameById = new Map<string, string>();
    if (ids.length > 0) {
      const [staff, students] = await Promise.all([
        supabase.from("staff").select("profile_id, full_name").in("profile_id", ids),
        supabase.from("students").select("profile_id, full_name").in("profile_id", ids),
      ]);
      for (const s of staff.data ?? []) nameById.set(s.profile_id as string, s.full_name as string);
      for (const s of students.data ?? []) nameById.set(s.profile_id as string, s.full_name as string);
    }
    return {
      success: true,
      data: rows.map((r) => ({ ...r, room_number: r.hostel_rooms?.room_number ?? null, raiser_name: nameById.get(r.raised_by) ?? "Unknown" })),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateMaintenanceRequest(input: {
  id: string; hostelId: string; institutionId: string;
  status?: MaintenanceStatus; priority?: MaintenancePriority; assigned_to?: string | null; resolution_notes?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const patch: Record<string, unknown> = {};
    if (input.status !== undefined) {
      patch.status = input.status;
      patch.resolved_at = (input.status === "resolved" || input.status === "closed") ? new Date().toISOString() : null;
    }
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.assigned_to !== undefined) patch.assigned_to = input.assigned_to?.trim() || null;
    if (input.resolution_notes !== undefined) patch.resolution_notes = input.resolution_notes?.trim() || null;

    const { error } = await supabase.from("hostel_maintenance_requests").update(patch).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/hostels/${input.hostelId}/maintenance`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getMyMaintenanceRequests(): Promise<Result<MaintenanceRequest[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };
    const { data, error } = await supabase
      .from("hostel_maintenance_requests").select(COLS).eq("raised_by", user.id).order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as MaintenanceRequest[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
