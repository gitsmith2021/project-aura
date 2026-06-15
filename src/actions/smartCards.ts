"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { normaliseUid, isValidUid, type SmartCard, type HolderType, type CardStats } from "@/lib/smartCards";
import { cardStats } from "@/lib/smartCards";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const CARD_COLS = "id, institution_id, card_uid, holder_type, student_id, staff_id, issued_date, status, replaced_by, notes, created_at";

/** Attach holder name + sub (roll/designation) to a set of cards. */
async function withHolders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cards: SmartCard[]
): Promise<SmartCard[]> {
  const studentIds = cards.filter((c) => c.student_id).map((c) => c.student_id as string);
  const staffIds = cards.filter((c) => c.staff_id).map((c) => c.staff_id as string);
  const sMap = new Map<string, { name: string; sub: string | null }>();
  const tMap = new Map<string, { name: string; sub: string | null }>();
  await Promise.all([
    studentIds.length
      ? supabase.from("students").select("id, full_name, roll_no").in("id", studentIds).then(({ data }) => {
          for (const s of data ?? []) sMap.set(s.id as string, { name: s.full_name as string, sub: (s.roll_no as string) ?? null });
        })
      : Promise.resolve(),
    staffIds.length
      ? supabase.from("staff").select("id, full_name, designation").in("id", staffIds).then(({ data }) => {
          for (const s of data ?? []) tMap.set(s.id as string, { name: s.full_name as string, sub: (s.designation as string) ?? null });
        })
      : Promise.resolve(),
  ]);
  return cards.map((c) => {
    const h = c.holder_type === "student" ? sMap.get(c.student_id ?? "") : tMap.get(c.staff_id ?? "");
    return { ...c, holder_name: h?.name ?? "Unknown", holder_sub: h?.sub ?? null };
  });
}

export async function getCards(
  institutionId: string,
  filters?: { status?: string; holderType?: string; search?: string }
): Promise<Result<SmartCard[]>> {
  try {
    const supabase = createClient(await cookies());
    let q = supabase.from("smart_cards").select(CARD_COLS).eq("institution_id", institutionId);
    if (filters?.status) q = q.eq("status", filters.status);
    if (filters?.holderType) q = q.eq("holder_type", filters.holderType);
    if (filters?.search) q = q.ilike("card_uid", `%${normaliseUid(filters.search)}%`);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    const cards = await withHolders(supabase, (data ?? []) as unknown as SmartCard[]);
    return { success: true, data: cards };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getCardStats(institutionId: string): Promise<Result<CardStats>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("smart_cards").select("status").eq("institution_id", institutionId);
    if (error) return { success: false, error: error.message };
    return { success: true, data: cardStats((data ?? []) as { status: SmartCard["status"] }[]) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export type CardHolder = { id: string; name: string; type: HolderType; sub: string | null };

/** Search students + staff who do NOT already hold an active card. */
export async function searchCardHolders(institutionId: string, query: string, holderType: HolderType): Promise<Result<CardHolder[]>> {
  try {
    const supabase = createClient(await cookies());
    const q = query.trim();

    // ids that already have an active card (to exclude)
    const { data: active } = await supabase
      .from("smart_cards").select("student_id, staff_id").eq("institution_id", institutionId).eq("status", "active");
    const activeStudents = new Set((active ?? []).map((a) => a.student_id as string).filter(Boolean));
    const activeStaff = new Set((active ?? []).map((a) => a.staff_id as string).filter(Boolean));

    if (holderType === "student") {
      const { data, error } = await supabase
        .from("students").select("id, full_name, roll_no").eq("institution_id", institutionId).ilike("full_name", `%${q}%`).order("full_name").limit(15);
      if (error) return { success: false, error: error.message };
      return {
        success: true,
        data: (data ?? []).filter((s) => !activeStudents.has(s.id as string)).map((s) => ({ id: s.id as string, name: s.full_name as string, type: "student", sub: (s.roll_no as string) ?? null })),
      };
    } else {
      const { data, error } = await supabase
        .from("staff").select("id, full_name, designation").eq("institution_id", institutionId).eq("is_active", true).ilike("full_name", `%${q}%`).order("full_name").limit(15);
      if (error) return { success: false, error: error.message };
      return {
        success: true,
        data: (data ?? []).filter((s) => !activeStaff.has(s.id as string)).map((s) => ({ id: s.id as string, name: s.full_name as string, type: "staff", sub: (s.designation as string) ?? null })),
      };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function issueCard(input: {
  institutionId: string; cardUid: string; holderType: HolderType; holderId: string; notes?: string | null;
}): Promise<Result<SmartCard>> {
  try {
    if (!isValidUid(input.cardUid)) return { success: false, error: "Enter a valid NFC UID (hex, 4+ chars)." };
    if (!input.holderId) return { success: false, error: "Select a card holder." };
    const uid = normaliseUid(input.cardUid);
    const supabase = createClient(await cookies());

    const { data, error } = await supabase
      .from("smart_cards")
      .insert({
        institution_id: input.institutionId,
        card_uid: uid,
        holder_type: input.holderType,
        student_id: input.holderType === "student" ? input.holderId : null,
        staff_id: input.holderType === "staff" ? input.holderId : null,
        notes: input.notes?.trim() || null,
        status: "active",
      })
      .select(CARD_COLS)
      .single();
    if (error) {
      if (error.code === "23505") {
        return { success: false, error: error.message.includes("card_uid") ? "That card UID is already registered." : "This holder already has an active card." };
      }
      return { success: false, error: error.message };
    }
    revalidatePath(`/institutions/${input.institutionId}/id-cards`);
    const [withName] = await withHolders(supabase, [data as unknown as SmartCard]);
    return { success: true, data: withName };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

async function setStatus(institutionId: string, cardId: string, status: SmartCard["status"]): Promise<Result<null>> {
  const supabase = createClient(await cookies());
  const { error } = await supabase.from("smart_cards").update({ status }).eq("id", cardId);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/institutions/${institutionId}/id-cards`);
  return { success: true, data: null };
}

export async function deactivateCard(institutionId: string, cardId: string): Promise<Result<null>> {
  try {
    return await setStatus(institutionId, cardId, "deactivated");
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function reportLost(institutionId: string, cardId: string): Promise<Result<null>> {
  try {
    return await setStatus(institutionId, cardId, "lost");
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/**
 * Replace a card: the old card → `replaced`, a new active card is issued to the
 * same holder, and the old card's `replaced_by` points to the new one.
 */
export async function replaceCard(input: {
  institutionId: string; oldCardId: string; newCardUid: string; notes?: string | null;
}): Promise<Result<SmartCard>> {
  try {
    if (!isValidUid(input.newCardUid)) return { success: false, error: "Enter a valid new NFC UID (hex, 4+ chars)." };
    const uid = normaliseUid(input.newCardUid);
    const supabase = createClient(await cookies());

    const { data: old, error: oldErr } = await supabase
      .from("smart_cards").select("holder_type, student_id, staff_id, status").eq("id", input.oldCardId).maybeSingle();
    if (oldErr) return { success: false, error: oldErr.message };
    if (!old) return { success: false, error: "Card not found." };

    // Mark old replaced first so the partial unique (active per holder) index won't clash.
    const { error: updErr } = await supabase.from("smart_cards").update({ status: "replaced" }).eq("id", input.oldCardId);
    if (updErr) return { success: false, error: updErr.message };

    const { data: created, error: insErr } = await supabase
      .from("smart_cards")
      .insert({
        institution_id: input.institutionId,
        card_uid: uid,
        holder_type: old.holder_type,
        student_id: old.student_id,
        staff_id: old.staff_id,
        notes: input.notes?.trim() || null,
        status: "active",
      })
      .select(CARD_COLS)
      .single();
    if (insErr) {
      // roll back the old card's status if the new insert failed
      await supabase.from("smart_cards").update({ status: "active" }).eq("id", input.oldCardId);
      if (insErr.code === "23505") return { success: false, error: "That card UID is already registered." };
      return { success: false, error: insErr.message };
    }

    await supabase.from("smart_cards").update({ replaced_by: created.id }).eq("id", input.oldCardId);

    revalidatePath(`/institutions/${input.institutionId}/id-cards`);
    const [withName] = await withHolders(supabase, [created as unknown as SmartCard]);
    return { success: true, data: withName };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
