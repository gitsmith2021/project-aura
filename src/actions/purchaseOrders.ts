"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  formatPoNumber, normaliseLineItem, poTotal, poStats,
  type PurchaseOrder, type POLineItem, type POStats,
} from "@/lib/purchaseOrders";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const PO_COLS =
  "id, institution_id, department_id, vendor_id, po_number, items, total_amount, status, raised_by, approved_by, invoice_url, received_at, paid_at, notes, created_at, vendors(name, category), departments!department_id(name), staff!raised_by(full_name)";

export async function getPurchaseOrders(
  institutionId: string,
  filters?: { status?: string; vendorId?: string; departmentId?: string }
): Promise<Result<PurchaseOrder[]>> {
  try {
    const supabase = createClient(await cookies());
    let q = supabase.from("purchase_orders").select(PO_COLS).eq("institution_id", institutionId);
    if (filters?.status) q = q.eq("status", filters.status);
    if (filters?.vendorId) q = q.eq("vendor_id", filters.vendorId);
    if (filters?.departmentId) q = q.eq("department_id", filters.departmentId);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as PurchaseOrder[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getPurchaseOrder(poId: string): Promise<Result<PurchaseOrder>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("purchase_orders").select(PO_COLS).eq("id", poId).maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Purchase order not found." };
    return { success: true, data: data as unknown as PurchaseOrder };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getPOStats(institutionId: string): Promise<Result<POStats>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("purchase_orders").select("status, total_amount").eq("institution_id", institutionId);
    if (error) return { success: false, error: error.message };
    return { success: true, data: poStats((data ?? []) as { status: PurchaseOrder["status"]; total_amount: number }[]) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Next PO-YYYY-NNNN for this institution in the current calendar year. */
async function nextPoNumber(supabase: Awaited<ReturnType<typeof createClient>>, institutionId: string): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("purchase_orders")
    .select("id", { count: "exact", head: true })
    .eq("institution_id", institutionId)
    .gte("created_at", `${year}-01-01`);
  return formatPoNumber(year, (count ?? 0) + 1);
}

export type CreatePOInput = {
  institutionId: string;
  vendorId: string;
  departmentId?: string | null;
  raisedBy?: string | null;
  items: { name: string; qty: number; unit?: string; unit_price: number }[];
  notes?: string | null;
};

export async function createPO(input: CreatePOInput): Promise<Result<PurchaseOrder>> {
  try {
    if (!input.vendorId) return { success: false, error: "Select a vendor." };
    const clean = input.items
      .filter((i) => i.name.trim() && i.qty > 0)
      .map((i) => normaliseLineItem(i));
    if (clean.length === 0) return { success: false, error: "Add at least one line item." };

    const supabase = createClient(await cookies());
    const poNumber = await nextPoNumber(supabase, input.institutionId);

    const { data, error } = await supabase
      .from("purchase_orders")
      .insert({
        institution_id: input.institutionId,
        vendor_id: input.vendorId,
        department_id: input.departmentId || null,
        raised_by: input.raisedBy || null,
        po_number: poNumber,
        items: clean,
        total_amount: poTotal(clean),
        status: "draft",
        notes: input.notes?.trim() || null,
      })
      .select(PO_COLS)
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/vendors/purchase-orders`);
    return { success: true, data: data as unknown as PurchaseOrder };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

async function transition(
  institutionId: string, poId: string, from: string[], patch: Record<string, unknown>
): Promise<Result<null>> {
  const supabase = createClient(await cookies());
  const { data: po, error } = await supabase.from("purchase_orders").select("status").eq("id", poId).maybeSingle();
  if (error) return { success: false, error: error.message };
  if (!po) return { success: false, error: "Purchase order not found." };
  if (!from.includes(po.status as string)) return { success: false, error: `Cannot do that from "${po.status}".` };

  const { error: updErr } = await supabase.from("purchase_orders").update(patch).eq("id", poId);
  if (updErr) return { success: false, error: updErr.message };
  revalidatePath(`/institutions/${institutionId}/vendors/purchase-orders`);
  revalidatePath(`/institutions/${institutionId}/vendors/purchase-orders/${poId}`);
  return { success: true, data: null };
}

export async function submitPO(institutionId: string, poId: string): Promise<Result<null>> {
  try {
    return await transition(institutionId, poId, ["draft"], { status: "submitted" });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function approvePO(institutionId: string, poId: string): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    return await transition(institutionId, poId, ["submitted"], { status: "approved", approved_by: user?.id ?? null });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function cancelPO(institutionId: string, poId: string): Promise<Result<null>> {
  try {
    return await transition(institutionId, poId, ["draft", "submitted", "approved"], { status: "cancelled" });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function markPaid(institutionId: string, poId: string): Promise<Result<null>> {
  try {
    return await transition(institutionId, poId, ["received"], { status: "paid", paid_at: new Date().toISOString() });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateInvoiceUrl(institutionId: string, poId: string, url: string | null): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("purchase_orders").update({ invoice_url: url }).eq("id", poId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/vendors/purchase-orders/${poId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/**
 * Mark an approved PO as received. Optionally auto-populate the Phase 4E asset
 * registry with the received line items (under an auto-ensured "Procurement (PO)"
 * category). Clears deferred-register item 4E-2.
 */
export async function markReceived(input: {
  institutionId: string; poId: string; addToInventory: boolean;
}): Promise<Result<{ assetsCreated: number }>> {
  try {
    const supabase = createClient(await cookies());
    const { data: po, error } = await supabase
      .from("purchase_orders").select("status, items, notes").eq("id", input.poId).maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!po) return { success: false, error: "Purchase order not found." };
    if (po.status !== "approved") return { success: false, error: `Cannot receive from "${po.status}".` };

    const { error: updErr } = await supabase
      .from("purchase_orders")
      .update({ status: "received", received_at: new Date().toISOString() })
      .eq("id", input.poId);
    if (updErr) return { success: false, error: updErr.message };

    let assetsCreated = 0;
    if (input.addToInventory) {
      const items = (po.items ?? []) as POLineItem[];
      if (items.length > 0) {
        // Ensure a "Procurement (PO)" category for this institution.
        const catName = "Procurement (PO)";
        const { data: existingCat } = await supabase
          .from("asset_categories").select("id").eq("institution_id", input.institutionId).eq("name", catName).maybeSingle();
        let categoryId = existingCat?.id as string | undefined;
        if (!categoryId) {
          const { data: newCat, error: catErr } = await supabase
            .from("asset_categories").insert({ institution_id: input.institutionId, name: catName, is_consumable: false }).select("id").single();
          if (catErr) return { success: false, error: `Received, but inventory category failed: ${catErr.message}` };
          categoryId = newCat.id as string;
        }

        const rows = items.map((it) => ({
          institution_id: input.institutionId,
          category_id: categoryId,
          name: it.name,
          purchase_cost: it.unit_price,
          current_stock: Math.max(0, Math.floor(it.qty)),
          unit: it.unit || "pcs",
          status: "active",
          location_details: (po.notes as string) ?? null,
        }));
        const { error: insErr, count } = await supabase.from("assets").insert(rows, { count: "exact" });
        if (insErr) return { success: false, error: `Received, but asset population failed: ${insErr.message}` };
        assetsCreated = count ?? rows.length;
        revalidatePath(`/institutions/${input.institutionId}/assets`);
      }
    }

    revalidatePath(`/institutions/${input.institutionId}/vendors/purchase-orders`);
    revalidatePath(`/institutions/${input.institutionId}/vendors/purchase-orders/${input.poId}`);
    return { success: true, data: { assetsCreated } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Dropdown data for the new-PO form: active vendors, departments, staff. */
export type POFormData = {
  vendors: { id: string; name: string; category: string }[];
  departments: { id: string; name: string }[];
  staff: { id: string; name: string }[];
};

export async function getPOFormData(institutionId: string): Promise<Result<POFormData>> {
  try {
    const supabase = createClient(await cookies());
    const [venRes, deptRes, staffRes] = await Promise.all([
      supabase.from("vendors").select("id, name, category").eq("institution_id", institutionId).eq("is_active", true).order("name"),
      supabase.from("departments").select("id, name").eq("institution_id", institutionId).order("name"),
      supabase.from("staff").select("id, full_name").eq("institution_id", institutionId).eq("is_active", true).order("full_name"),
    ]);
    return {
      success: true,
      data: {
        vendors: (venRes.data ?? []).map((v) => ({ id: v.id as string, name: v.name as string, category: v.category as string })),
        departments: (deptRes.data ?? []).map((d) => ({ id: d.id as string, name: d.name as string })),
        staff: (staffRes.data ?? []).map((s) => ({ id: s.id as string, name: s.full_name as string })),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
