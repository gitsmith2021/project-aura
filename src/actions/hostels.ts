"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { Hostel, HostelRoom, HostelType, RoomType } from "@/lib/hostels";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const HOSTEL_COLS = "id, institution_id, name, hostel_type, warden_id, total_rooms, address, is_active, created_at, hostel_rooms(capacity, occupied)";
const ROOM_COLS = "id, hostel_id, room_number, floor, room_type, capacity, occupied, amenities";

// ── Hostels ─────────────────────────────────────────────────────────────────
export async function getHostels(institutionId: string): Promise<Result<Hostel[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("hostels").select(HOSTEL_COLS).eq("institution_id", institutionId).order("name");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as Hostel[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getHostel(hostelId: string): Promise<Result<Hostel>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("hostels").select(HOSTEL_COLS).eq("id", hostelId).maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Hostel not found." };
    return { success: true, data: data as unknown as Hostel };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function addHostel(input: {
  institution_id: string; name: string; hostel_type: HostelType; address?: string | null;
}): Promise<Result<Hostel>> {
  try {
    if (!input.name.trim()) return { success: false, error: "Hostel name is required." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("hostels")
      .insert({ institution_id: input.institution_id, name: input.name.trim(), hostel_type: input.hostel_type, address: input.address?.trim() || null })
      .select(HOSTEL_COLS)
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institution_id}/hostels`);
    return { success: true, data: data as unknown as Hostel };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Rooms ───────────────────────────────────────────────────────────────────
export async function getRooms(hostelId: string): Promise<Result<HostelRoom[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("hostel_rooms").select(ROOM_COLS).eq("hostel_id", hostelId).order("floor").order("room_number");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as HostelRoom[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function addRoom(input: {
  hostelId: string; institutionId: string; room_number: string; floor: number; room_type: RoomType; capacity: number;
}): Promise<Result<HostelRoom>> {
  try {
    if (!input.room_number.trim()) return { success: false, error: "Room number is required." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("hostel_rooms")
      .insert({
        hostel_id: input.hostelId, room_number: input.room_number.trim(), floor: input.floor,
        room_type: input.room_type, capacity: Math.max(1, input.capacity), occupied: 0,
      })
      .select(ROOM_COLS)
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/hostels/${input.hostelId}`);
    return { success: true, data: data as unknown as HostelRoom };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Allocations ─────────────────────────────────────────────────────────────
export type RoomAllocationView = { allocation_id: string; student_id: string; student_name: string; roll_no: string | null };

/** Active allocations for a hostel's rooms → roster by room_id. */
export async function getRoomRosters(hostelId: string): Promise<Result<Record<string, RoomAllocationView[]>>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("hostel_allocations")
      .select("id, room_id, student_id, students(full_name, roll_no)")
      .eq("hostel_id", hostelId)
      .eq("status", "active");
    if (error) return { success: false, error: error.message };
    const byRoom: Record<string, RoomAllocationView[]> = {};
    for (const a of (data ?? []) as unknown as { id: string; room_id: string; student_id: string; students: { full_name: string; roll_no: string | null } | null }[]) {
      (byRoom[a.room_id] ??= []).push({
        allocation_id: a.id, student_id: a.student_id,
        student_name: a.students?.full_name ?? "Unknown", roll_no: a.students?.roll_no ?? null,
      });
    }
    return { success: true, data: byRoom };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Students of the institution without an active hostel allocation. */
export async function searchAllocatableStudents(institutionId: string, query: string): Promise<Result<{ id: string; name: string; roll_no: string | null }[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data: students, error } = await supabase
      .from("students").select("id, full_name, roll_no")
      .eq("institution_id", institutionId).ilike("full_name", `%${query.trim()}%`).order("full_name").limit(15);
    if (error) return { success: false, error: error.message };
    const ids = (students ?? []).map((s) => s.id as string);
    const allocated = new Set<string>();
    if (ids.length > 0) {
      const { data: active } = await supabase.from("hostel_allocations").select("student_id").in("student_id", ids).eq("status", "active");
      for (const a of active ?? []) allocated.add(a.student_id as string);
    }
    return {
      success: true,
      data: (students ?? []).filter((s) => !allocated.has(s.id as string)).map((s) => ({ id: s.id as string, name: s.full_name as string, roll_no: (s.roll_no as string) ?? null })),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function allocateStudent(input: {
  institutionId: string; hostelId: string; roomId: string; studentId: string;
}): Promise<Result<{ allocationId: string }>> {
  try {
    const supabase = createClient(await cookies());
    const { data: room, error: roomErr } = await supabase.from("hostel_rooms").select("capacity, occupied").eq("id", input.roomId).maybeSingle();
    if (roomErr) return { success: false, error: roomErr.message };
    if (!room) return { success: false, error: "Room not found." };
    if ((room.occupied as number) >= (room.capacity as number)) return { success: false, error: "Room is full." };

    const { data: inserted, error: insErr } = await supabase.from("hostel_allocations").insert({
      hostel_id: input.hostelId, room_id: input.roomId, student_id: input.studentId, status: "active",
    }).select("id").single();
    if (insErr) {
      if (insErr.code === "23505") return { success: false, error: "That student already has an active hostel room." };
      return { success: false, error: insErr.message };
    }
    await supabase.from("hostel_rooms").update({ occupied: (room.occupied as number) + 1 }).eq("id", input.roomId);

    revalidatePath(`/institutions/${input.institutionId}/hostels/${input.hostelId}`);
    return { success: true, data: { allocationId: inserted.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function vacateAllocation(input: {
  institutionId: string; hostelId: string; allocationId: string; roomId: string;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase
      .from("hostel_allocations")
      .update({ status: "vacated", allocated_to: new Date().toISOString().slice(0, 10) })
      .eq("id", input.allocationId).eq("status", "active");
    if (error) return { success: false, error: error.message };

    const { data: room } = await supabase.from("hostel_rooms").select("occupied").eq("id", input.roomId).maybeSingle();
    if (room) await supabase.from("hostel_rooms").update({ occupied: Math.max(0, (room.occupied as number) - 1) }).eq("id", input.roomId);

    revalidatePath(`/institutions/${input.institutionId}/hostels/${input.hostelId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Student "my hostel" ───────────────────────────────────────────────────────
export type MyHostel = {
  hostelId: string;
  roomId: string;
  hostel: { name: string; hostel_type: string; address: string | null };
  room: { room_number: string; floor: number; room_type: string };
  roommates: { name: string; roll_no: string | null }[];
} | null;

export async function getMyHostel(): Promise<Result<MyHostel>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const { data: student } = await supabase.from("students").select("id").eq("profile_id", user.id).maybeSingle();
    if (!student) return { success: true, data: null };

    const { data: alloc } = await supabase
      .from("hostel_allocations")
      .select("hostel_id, room_id, hostels(name, hostel_type, address), hostel_rooms(room_number, floor, room_type)")
      .eq("student_id", student.id as string).eq("status", "active").maybeSingle();
    if (!alloc) return { success: true, data: null };

    const { data: mates } = await supabase
      .from("hostel_allocations")
      .select("students(full_name, roll_no)")
      .eq("room_id", alloc.room_id as string).eq("status", "active").neq("student_id", student.id as string);

    const hostel = alloc.hostels as unknown as { name: string; hostel_type: string; address: string | null };
    const room = alloc.hostel_rooms as unknown as { room_number: string; floor: number; room_type: string };
    return {
      success: true,
      data: {
        hostelId: alloc.hostel_id as string,
        roomId: alloc.room_id as string,
        hostel, room,
        roommates: (mates ?? []).map((m) => {
          const s = m.students as unknown as { full_name: string; roll_no: string | null } | null;
          return { name: s?.full_name ?? "Unknown", roll_no: s?.roll_no ?? null };
        }),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
