"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";
import { normaliseUid, isValidUid } from "@/lib/smartCards";
import type { Classroom, NfcTag, CardReader, RoomType, ReaderVendor } from "@/lib/classrooms";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const CLASSROOM_COLS = "id, institution_id, department_id, building, floor, room_number, room_type, capacity, created_at";

async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function withAssignments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  institutionId: string,
  rooms: Classroom[]
): Promise<Classroom[]> {
  if (rooms.length === 0) return rooms;
  const roomIds = rooms.map((r) => r.id);
  const deptIds = rooms.filter((r) => r.department_id).map((r) => r.department_id as string);

  const [{ data: depts }, { data: tags }, { data: readers }] = await Promise.all([
    deptIds.length
      ? supabase.from("departments").select("id, name").in("id", deptIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    supabase
      .from("nfc_tags")
      .select("id, institution_id, tag_uid, classroom_id, status, replaced_by, last_seen_at, created_at")
      .eq("institution_id", institutionId)
      .eq("status", "active")
      .in("classroom_id", roomIds),
    supabase
      .from("card_readers")
      .select("id, institution_id, reader_uid, vendor, classroom_id, status, last_seen_at, created_at")
      .eq("institution_id", institutionId)
      .eq("status", "active")
      .in("classroom_id", roomIds),
  ]);

  const deptMap = new Map((depts ?? []).map((d) => [d.id as string, d.name as string]));
  const tagMap = new Map(((tags ?? []) as NfcTag[]).map((t) => [t.classroom_id as string, t]));
  const readerMap = new Map(((readers ?? []) as CardReader[]).map((r) => [r.classroom_id as string, r]));

  return rooms.map((r) => ({
    ...r,
    department_name: r.department_id ? deptMap.get(r.department_id) ?? null : null,
    nfc_tag: tagMap.get(r.id) ?? null,
    card_reader: readerMap.get(r.id) ?? null,
  }));
}

export async function getClassrooms(institutionId: string): Promise<Result<Classroom[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("classrooms")
      .select(CLASSROOM_COLS)
      .eq("institution_id", institutionId)
      .order("building")
      .order("room_number");
    if (error) return { success: false, error: error.message };
    const rooms = await withAssignments(supabase, institutionId, (data ?? []) as unknown as Classroom[]);
    return { success: true, data: rooms };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function createClassroom(input: {
  institutionId: string;
  departmentId?: string | null;
  building: string;
  floor?: string | null;
  roomNumber: string;
  roomType: RoomType;
  capacity?: number | null;
}): Promise<Result<Classroom>> {
  try {
    if (!input.building.trim() || !input.roomNumber.trim()) {
      return { success: false, error: "Building and room number are required." };
    }
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("classrooms")
      .insert({
        institution_id: input.institutionId,
        department_id: input.departmentId || null,
        building: input.building.trim(),
        floor: input.floor?.trim() || null,
        room_number: input.roomNumber.trim(),
        room_type: input.roomType,
        capacity: input.capacity ?? null,
      })
      .select(CLASSROOM_COLS)
      .single();
    if (error) {
      if (error.code === "23505") return { success: false, error: "A room with this building/floor/room number already exists." };
      return { success: false, error: error.message };
    }
    await logAudit({
      institutionId: input.institutionId,
      performedBy: await currentUserId(supabase),
      tableName: "classrooms",
      recordId: data.id,
      action: "INSERT",
      afterData: data,
      notes: `Classroom registered: ${input.building} ${input.roomNumber}`,
    });
    revalidatePath(`/institutions/${input.institutionId}/classrooms`);
    return { success: true, data: { ...(data as unknown as Classroom), department_name: null, nfc_tag: null, card_reader: null } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateClassroom(input: {
  institutionId: string;
  classroomId: string;
  departmentId?: string | null;
  building: string;
  floor?: string | null;
  roomNumber: string;
  roomType: RoomType;
  capacity?: number | null;
}): Promise<Result<null>> {
  try {
    if (!input.building.trim() || !input.roomNumber.trim()) {
      return { success: false, error: "Building and room number are required." };
    }
    const supabase = createClient(await cookies());
    const { error } = await supabase
      .from("classrooms")
      .update({
        department_id: input.departmentId || null,
        building: input.building.trim(),
        floor: input.floor?.trim() || null,
        room_number: input.roomNumber.trim(),
        room_type: input.roomType,
        capacity: input.capacity ?? null,
      })
      .eq("id", input.classroomId);
    if (error) {
      if (error.code === "23505") return { success: false, error: "A room with this building/floor/room number already exists." };
      return { success: false, error: error.message };
    }
    await logAudit({
      institutionId: input.institutionId,
      performedBy: await currentUserId(supabase),
      tableName: "classrooms",
      recordId: input.classroomId,
      action: "UPDATE",
      notes: `Classroom updated: ${input.building} ${input.roomNumber}`,
    });
    revalidatePath(`/institutions/${input.institutionId}/classrooms`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Assign an NFC tag to a classroom. Upserts by UID — assigning an already-registered
 *  tag to a different room is a *reassignment*, not an error. */
export async function assignNfcTag(input: {
  institutionId: string;
  classroomId: string;
  tagUid: string;
}): Promise<Result<NfcTag>> {
  try {
    if (!isValidUid(input.tagUid)) return { success: false, error: "Enter a valid NFC UID (hex, 4+ chars)." };
    const uid = normaliseUid(input.tagUid);
    const supabase = createClient(await cookies());

    const { data: existing } = await supabase
      .from("nfc_tags")
      .select("id, classroom_id")
      .eq("tag_uid", uid)
      .eq("institution_id", input.institutionId)
      .maybeSingle();

    const action = existing ? "UPDATE" : "INSERT";
    const { data, error } = await supabase
      .from("nfc_tags")
      .upsert(
        {
          ...(existing ? { id: existing.id } : {}),
          institution_id: input.institutionId,
          tag_uid: uid,
          classroom_id: input.classroomId,
          status: "active",
        },
        { onConflict: "tag_uid" }
      )
      .select("id, institution_id, tag_uid, classroom_id, status, replaced_by, last_seen_at, created_at")
      .single();
    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId: input.institutionId,
      performedBy: await currentUserId(supabase),
      tableName: "nfc_tags",
      recordId: data.id,
      action,
      afterData: data,
      notes: existing ? `NFC tag ${uid} reassigned to classroom ${input.classroomId}` : `NFC tag ${uid} registered to classroom ${input.classroomId}`,
    });
    revalidatePath(`/institutions/${input.institutionId}/classrooms`);
    return { success: true, data: data as unknown as NfcTag };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deactivateTag(institutionId: string, tagId: string): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("nfc_tags").update({ status: "inactive" }).eq("id", tagId);
    if (error) return { success: false, error: error.message };
    await logAudit({
      institutionId,
      performedBy: await currentUserId(supabase),
      tableName: "nfc_tags",
      recordId: tagId,
      action: "UPDATE",
      notes: "NFC tag deactivated",
    });
    revalidatePath(`/institutions/${institutionId}/classrooms`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Replace a tag: the old tag → `replaced`, a new active tag is bound to the
 *  same classroom, and the old tag's `replaced_by` points to the new one. */
export async function replaceTag(input: {
  institutionId: string;
  oldTagId: string;
  newTagUid: string;
}): Promise<Result<NfcTag>> {
  try {
    if (!isValidUid(input.newTagUid)) return { success: false, error: "Enter a valid new NFC UID (hex, 4+ chars)." };
    const uid = normaliseUid(input.newTagUid);
    const supabase = createClient(await cookies());

    const { data: old, error: oldErr } = await supabase
      .from("nfc_tags").select("classroom_id").eq("id", input.oldTagId).maybeSingle();
    if (oldErr) return { success: false, error: oldErr.message };
    if (!old) return { success: false, error: "Tag not found." };

    const { error: updErr } = await supabase.from("nfc_tags").update({ status: "replaced" }).eq("id", input.oldTagId);
    if (updErr) return { success: false, error: updErr.message };

    const { data: created, error: insErr } = await supabase
      .from("nfc_tags")
      .insert({
        institution_id: input.institutionId,
        tag_uid: uid,
        classroom_id: old.classroom_id,
        status: "active",
      })
      .select("id, institution_id, tag_uid, classroom_id, status, replaced_by, last_seen_at, created_at")
      .single();
    if (insErr) {
      await supabase.from("nfc_tags").update({ status: "active" }).eq("id", input.oldTagId);
      if (insErr.code === "23505") return { success: false, error: "That tag UID is already registered." };
      return { success: false, error: insErr.message };
    }

    await supabase.from("nfc_tags").update({ replaced_by: created.id }).eq("id", input.oldTagId);

    await logAudit({
      institutionId: input.institutionId,
      performedBy: await currentUserId(supabase),
      tableName: "nfc_tags",
      recordId: created.id,
      action: "INSERT",
      afterData: created,
      notes: `NFC tag replaced (old: ${input.oldTagId})`,
    });
    revalidatePath(`/institutions/${input.institutionId}/classrooms`);
    return { success: true, data: created as unknown as NfcTag };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Assign a card reader to a classroom. Upserts by UID, same reassignment semantics as assignNfcTag. */
export async function assignCardReader(input: {
  institutionId: string;
  classroomId: string;
  readerUid: string;
  vendor: ReaderVendor;
}): Promise<Result<CardReader>> {
  try {
    if (!isValidUid(input.readerUid)) return { success: false, error: "Enter a valid reader UID (hex, 4+ chars)." };
    const uid = normaliseUid(input.readerUid);
    const supabase = createClient(await cookies());

    const { data: existing } = await supabase
      .from("card_readers")
      .select("id")
      .eq("reader_uid", uid)
      .eq("institution_id", input.institutionId)
      .maybeSingle();

    const action = existing ? "UPDATE" : "INSERT";
    const { data, error } = await supabase
      .from("card_readers")
      .upsert(
        {
          ...(existing ? { id: existing.id } : {}),
          institution_id: input.institutionId,
          reader_uid: uid,
          vendor: input.vendor,
          classroom_id: input.classroomId,
          status: "active",
        },
        { onConflict: "reader_uid" }
      )
      .select("id, institution_id, reader_uid, vendor, classroom_id, status, last_seen_at, created_at")
      .single();
    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId: input.institutionId,
      performedBy: await currentUserId(supabase),
      tableName: "card_readers",
      recordId: data.id,
      action,
      afterData: data,
      notes: existing ? `Card reader ${uid} reassigned to classroom ${input.classroomId}` : `Card reader ${uid} (${input.vendor}) registered to classroom ${input.classroomId}`,
    });
    revalidatePath(`/institutions/${input.institutionId}/classrooms`);
    return { success: true, data: data as unknown as CardReader };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
