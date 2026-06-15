"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { Vendor, VendorCategory } from "@/lib/purchaseOrders";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const VENDOR_COLS = "id, institution_id, name, gst_number, category, contact_person, phone, email, address, is_active, created_at";

export async function getVendors(
  institutionId: string,
  filters?: { category?: string; activeOnly?: boolean }
): Promise<Result<Vendor[]>> {
  try {
    const supabase = createClient(await cookies());
    let q = supabase.from("vendors").select(VENDOR_COLS).eq("institution_id", institutionId);
    if (filters?.category) q = q.eq("category", filters.category);
    if (filters?.activeOnly) q = q.eq("is_active", true);
    const { data, error } = await q.order("name");
    if (error) return { success: false, error: error.message };

    const vendors = (data ?? []) as unknown as Vendor[];
    // Attach active PO counts per vendor (single grouped query).
    const ids = vendors.map((v) => v.id);
    if (ids.length > 0) {
      const { data: pos } = await supabase.from("purchase_orders").select("vendor_id").in("vendor_id", ids);
      const counts = new Map<string, number>();
      for (const p of pos ?? []) counts.set(p.vendor_id as string, (counts.get(p.vendor_id as string) ?? 0) + 1);
      for (const v of vendors) v.po_count = counts.get(v.id) ?? 0;
    }
    return { success: true, data: vendors };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export type VendorInput = {
  institution_id: string;
  name: string;
  category: VendorCategory;
  gst_number?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

export async function addVendor(input: VendorInput): Promise<Result<Vendor>> {
  try {
    if (!input.name.trim()) return { success: false, error: "Vendor name is required." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("vendors")
      .insert({
        institution_id: input.institution_id,
        name: input.name.trim(),
        category: input.category,
        gst_number: input.gst_number?.trim() || null,
        contact_person: input.contact_person?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
      })
      .select(VENDOR_COLS)
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institution_id}/vendors`);
    return { success: true, data: { ...(data as unknown as Vendor), po_count: 0 } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateVendor(input: {
  id: string; institutionId: string;
  patch: Partial<Pick<Vendor, "name" | "category" | "gst_number" | "contact_person" | "phone" | "email" | "address" | "is_active">>;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("vendors").update(input.patch).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/vendors`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
