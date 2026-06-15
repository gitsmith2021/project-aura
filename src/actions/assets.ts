"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { isLowStock, type Asset, type AssetCategory, type AssetAllocation, type AssetMaintenanceLog, type AllocationTargetType } from "@/lib/assets";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const CATEGORY_COLS = "id, institution_id, name, is_consumable, created_at";
const ASSET_COLS =
  "id, institution_id, category_id, name, brand_model, serial_number, purchase_date, purchase_cost, status, location_details, current_stock, unit, reorder_level, created_at, asset_categories(name, is_consumable)";
const ALLOC_COLS =
  "id, asset_id, allocated_to_type, department_id, laboratory_id, staff_id, allocated_qty, allocated_date, returned_qty, returned_date, status, assets(name, unit), departments!department_id(name), laboratories!laboratory_id(name), staff!staff_id(full_name)";
const MAINT_COLS =
  "id, asset_id, log_date, description, cost, logged_by, assets(name), staff!logged_by(full_name)";

// ── Categories ────────────────────────────────────────────────────────────────
export async function getCategories(institutionId: string): Promise<Result<AssetCategory[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("asset_categories").select(CATEGORY_COLS).eq("institution_id", institutionId).order("name");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as AssetCategory[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function addCategory(input: { institution_id: string; name: string; is_consumable: boolean }): Promise<Result<AssetCategory>> {
  try {
    if (!input.name.trim()) return { success: false, error: "Category name is required." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("asset_categories")
      .insert({ institution_id: input.institution_id, name: input.name.trim(), is_consumable: input.is_consumable })
      .select(CATEGORY_COLS)
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institution_id}/assets`);
    return { success: true, data: data as unknown as AssetCategory };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Assets ────────────────────────────────────────────────────────────────────
export async function getAssets(
  institutionId: string,
  filters?: { categoryId?: string; status?: string; search?: string }
): Promise<Result<Asset[]>> {
  try {
    const supabase = createClient(await cookies());
    let q = supabase.from("assets").select(ASSET_COLS).eq("institution_id", institutionId);
    if (filters?.categoryId) q = q.eq("category_id", filters.categoryId);
    if (filters?.status) q = q.eq("status", filters.status);
    if (filters?.search) q = q.or(`name.ilike.%${filters.search}%,brand_model.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`);
    const { data, error } = await q.order("name");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as Asset[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export type AssetInput = {
  institution_id: string;
  category_id: string;
  name: string;
  brand_model?: string | null;
  serial_number?: string | null;
  purchase_date?: string | null;
  purchase_cost?: number | null;
  location_details?: string | null;
  current_stock: number;
  unit: string;
  reorder_level?: number | null;
};

export async function addAsset(input: AssetInput): Promise<Result<Asset>> {
  try {
    if (!input.name.trim()) return { success: false, error: "Asset name is required." };
    if (!input.category_id) return { success: false, error: "Select a category." };
    const stock = Math.max(0, Math.floor(input.current_stock || 0));
    const status = input.reorder_level != null && stock <= input.reorder_level ? "low_stock" : "active";

    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("assets")
      .insert({
        institution_id: input.institution_id,
        category_id: input.category_id,
        name: input.name.trim(),
        brand_model: input.brand_model?.trim() || null,
        serial_number: input.serial_number?.trim() || null,
        purchase_date: input.purchase_date || null,
        purchase_cost: input.purchase_cost ?? null,
        location_details: input.location_details?.trim() || null,
        current_stock: stock,
        unit: input.unit.trim() || "pcs",
        reorder_level: input.reorder_level ?? null,
        status,
      })
      .select(ASSET_COLS)
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institution_id}/assets`);
    return { success: true, data: data as unknown as Asset };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Assets at or below their reorder level (for the stock-alert banner). */
export async function getLowStockItems(institutionId: string): Promise<Result<Asset[]>> {
  try {
    const res = await getAssets(institutionId);
    if (!res.success) return res;
    return { success: true, data: res.data.filter((a) => a.status !== "disposed" && isLowStock(a)) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Allocations ───────────────────────────────────────────────────────────────
export async function getAllocations(institutionId: string): Promise<Result<AssetAllocation[]>> {
  try {
    const supabase = createClient(await cookies());
    // resolve this institution's asset ids, then their allocations
    const { data: assets, error: aErr } = await supabase.from("assets").select("id").eq("institution_id", institutionId);
    if (aErr) return { success: false, error: aErr.message };
    const ids = (assets ?? []).map((a) => a.id as string);
    if (ids.length === 0) return { success: true, data: [] };
    const { data, error } = await supabase
      .from("asset_allocations").select(ALLOC_COLS).in("asset_id", ids).order("allocated_date", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as AssetAllocation[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function allocateAsset(input: {
  institutionId: string;
  assetId: string;
  targetType: AllocationTargetType;
  targetId: string;
  qty: number;
}): Promise<Result<null>> {
  try {
    if (input.qty <= 0) return { success: false, error: "Quantity must be greater than zero." };
    const supabase = createClient(await cookies());

    const { data: asset, error: aErr } = await supabase
      .from("assets").select("current_stock, reorder_level, category_id, asset_categories(is_consumable)").eq("id", input.assetId).maybeSingle();
    if (aErr) return { success: false, error: aErr.message };
    if (!asset) return { success: false, error: "Asset not found." };
    const stock = asset.current_stock as number;
    if (input.qty > stock) return { success: false, error: `Only ${stock} available to allocate.` };

    const isConsumable = (asset.asset_categories as unknown as { is_consumable: boolean } | null)?.is_consumable ?? false;

    const { error: insErr } = await supabase.from("asset_allocations").insert({
      asset_id: input.assetId,
      allocated_to_type: input.targetType,
      department_id: input.targetType === "department" ? input.targetId : null,
      laboratory_id: input.targetType === "laboratory" ? input.targetId : null,
      staff_id: input.targetType === "staff" ? input.targetId : null,
      allocated_qty: input.qty,
      status: isConsumable ? "consumed" : "allocated",
    });
    if (insErr) return { success: false, error: insErr.message };

    const nextStock = stock - input.qty;
    const reorder = asset.reorder_level as number | null;
    const nextStatus = reorder != null && nextStock <= reorder ? "low_stock" : "active";
    const { error: updErr } = await supabase.from("assets").update({ current_stock: nextStock, status: nextStatus }).eq("id", input.assetId);
    if (updErr) return { success: false, error: updErr.message };

    revalidatePath(`/institutions/${input.institutionId}/assets`);
    revalidatePath(`/institutions/${input.institutionId}/assets/allocations`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Return a (non-consumable) allocation — restores stock and closes the row. */
export async function returnAllocation(input: {
  institutionId: string; allocationId: string;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { data: alloc, error } = await supabase
      .from("asset_allocations").select("asset_id, allocated_qty, returned_qty, status").eq("id", input.allocationId).maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!alloc) return { success: false, error: "Allocation not found." };
    if (alloc.status !== "allocated") return { success: false, error: "This allocation is already closed." };

    const qty = alloc.allocated_qty as number;
    const { error: updAllocErr } = await supabase
      .from("asset_allocations")
      .update({ status: "returned", returned_qty: qty, returned_date: new Date().toISOString().slice(0, 10) })
      .eq("id", input.allocationId);
    if (updAllocErr) return { success: false, error: updAllocErr.message };

    const { data: asset } = await supabase.from("assets").select("current_stock, reorder_level, status").eq("id", alloc.asset_id as string).maybeSingle();
    if (asset) {
      const nextStock = (asset.current_stock as number) + qty;
      const reorder = asset.reorder_level as number | null;
      const nextStatus = asset.status === "maintenance" || asset.status === "disposed"
        ? (asset.status as string)
        : reorder != null && nextStock <= reorder ? "low_stock" : "active";
      await supabase.from("assets").update({ current_stock: nextStock, status: nextStatus }).eq("id", alloc.asset_id as string);
    }

    revalidatePath(`/institutions/${input.institutionId}/assets`);
    revalidatePath(`/institutions/${input.institutionId}/assets/allocations`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Maintenance ───────────────────────────────────────────────────────────────
export async function getMaintenanceLogs(institutionId: string): Promise<Result<AssetMaintenanceLog[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data: assets, error: aErr } = await supabase.from("assets").select("id").eq("institution_id", institutionId);
    if (aErr) return { success: false, error: aErr.message };
    const ids = (assets ?? []).map((a) => a.id as string);
    if (ids.length === 0) return { success: true, data: [] };
    const { data, error } = await supabase
      .from("asset_maintenance_logs").select(MAINT_COLS).in("asset_id", ids).order("log_date", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as AssetMaintenanceLog[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function recordMaintenance(input: {
  institutionId: string; assetId: string; description: string; cost: number; logDate: string; setUnderMaintenance: boolean;
}): Promise<Result<null>> {
  try {
    if (!input.description.trim()) return { success: false, error: "Description is required." };
    const supabase = createClient(await cookies());

    // who is logging — resolve the staff row for the current user (nullable)
    const { data: { user } } = await supabase.auth.getUser();
    let loggedBy: string | null = null;
    if (user) {
      const { data: staff } = await supabase.from("staff").select("id").eq("profile_id", user.id).maybeSingle();
      loggedBy = (staff?.id as string) ?? null;
    }

    const { error: insErr } = await supabase.from("asset_maintenance_logs").insert({
      asset_id: input.assetId,
      description: input.description.trim(),
      cost: Number.isFinite(input.cost) ? input.cost : 0,
      log_date: input.logDate,
      logged_by: loggedBy,
    });
    if (insErr) return { success: false, error: insErr.message };

    if (input.setUnderMaintenance) {
      await supabase.from("assets").update({ status: "maintenance" }).eq("id", input.assetId);
    }

    revalidatePath(`/institutions/${input.institutionId}/assets`);
    revalidatePath(`/institutions/${input.institutionId}/assets/maintenance`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Lists used by the allocation modal: departments, laboratories, staff. */
export type AllocationTargets = {
  departments: { id: string; name: string }[];
  laboratories: { id: string; name: string }[];
  staff: { id: string; name: string }[];
};

export async function getAllocationTargets(institutionId: string): Promise<Result<AllocationTargets>> {
  try {
    const supabase = createClient(await cookies());
    const [deptRes, labRes, staffRes] = await Promise.all([
      supabase.from("departments").select("id, name").eq("institution_id", institutionId).order("name"),
      supabase.from("laboratories").select("id, name").eq("institution_id", institutionId).order("name"),
      supabase.from("staff").select("id, full_name").eq("institution_id", institutionId).eq("is_active", true).order("full_name"),
    ]);
    return {
      success: true,
      data: {
        departments: (deptRes.data ?? []).map((d) => ({ id: d.id as string, name: d.name as string })),
        laboratories: (labRes.data ?? []).map((l) => ({ id: l.id as string, name: l.name as string })),
        staff: (staffRes.data ?? []).map((s) => ({ id: s.id as string, name: s.full_name as string })),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
