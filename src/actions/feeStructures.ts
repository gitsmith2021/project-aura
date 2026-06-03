"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { FeeStructure, FeeStructurePayload } from "@/types/finance";

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

// ── Actions ──────────────────────────────────────────────────────────────────

export async function getFeeStructures(
  institutionId: string
): Promise<{ success: true; data: FeeStructure[] } | { success: false; error: string }> {
  if (!institutionId) return { success: false, error: "Institution ID required." };

  try {
    const supabase = await getSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized." };

    const { data, error } = await supabase
      .from("fee_structures")
      .select("*, departments(name)")
      .eq("institution_id", institutionId)
      .order("academic_year", { ascending: false })
      .order("name", { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as FeeStructure[] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function createFeeStructure(
  payload: FeeStructurePayload
): Promise<{ success: true; data: FeeStructure } | { success: false; error: string }> {
  if (!payload.name?.trim()) return { success: false, error: "Fee name is required." };
  if (!payload.amount || payload.amount <= 0) return { success: false, error: "Amount must be greater than 0." };
  if (!payload.academic_year?.trim()) return { success: false, error: "Academic year is required." };
  if (!payload.institution_id) return { success: false, error: "Institution ID is required." };

  try {
    const supabase = await getSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized." };

    const { data, error } = await supabase
      .from("fee_structures")
      .insert({
        name: payload.name.trim(),
        fee_type: payload.fee_type,
        amount: payload.amount,
        academic_year: payload.academic_year,
        institution_id: payload.institution_id,
        department_id: payload.department_id ?? null,
      })
      .select("*, departments(name)")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath(`/institutions/${payload.institution_id}/finance/fees`);
    revalidatePath("/finance");

    return { success: true, data: data as FeeStructure };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateFeeStructure(
  id: string,
  institutionId: string,
  payload: Partial<Omit<FeeStructurePayload, "institution_id"> & { is_active: boolean }>
): Promise<{ success: true; data: FeeStructure } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Fee structure ID is required." };

  try {
    const supabase = await getSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized." };

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.name !== undefined)          updateData.name           = payload.name.trim();
    if (payload.fee_type !== undefined)      updateData.fee_type       = payload.fee_type;
    if (payload.amount !== undefined)        updateData.amount         = payload.amount;
    if (payload.academic_year !== undefined) updateData.academic_year  = payload.academic_year;
    if ("department_id" in payload)          updateData.department_id  = payload.department_id ?? null;
    if (payload.is_active !== undefined)     updateData.is_active      = payload.is_active;

    const { data, error } = await supabase
      .from("fee_structures")
      .update(updateData)
      .eq("id", id)
      .select("*, departments(name)")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath(`/institutions/${institutionId}/finance/fees`);
    revalidatePath("/finance");

    return { success: true, data: data as FeeStructure };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteFeeStructure(
  id: string,
  institutionId: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Fee structure ID is required." };

  try {
    const supabase = await getSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized." };

    const { error } = await supabase
      .from("fee_structures")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/institutions/${institutionId}/finance/fees`);
    revalidatePath("/finance");

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
