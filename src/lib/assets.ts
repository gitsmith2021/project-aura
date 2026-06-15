// Phase 4E — Asset & Inventory Management domain model + pure helpers (unit-testable).

export type AssetStatus = "active" | "maintenance" | "disposed" | "low_stock";
export type AllocationTargetType = "department" | "laboratory" | "staff";
export type AllocationStatus = "allocated" | "returned" | "consumed";

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  active: "Active",
  maintenance: "Under Maintenance",
  disposed: "Disposed",
  low_stock: "Low Stock",
};

export const ASSET_STATUS_COLORS: Record<AssetStatus, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  maintenance: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  disposed: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  low_stock: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

export const ALLOCATION_TARGET_LABELS: Record<AllocationTargetType, string> = {
  department: "Department",
  laboratory: "Laboratory",
  staff: "Staff",
};

export const ALLOCATION_STATUS_LABELS: Record<AllocationStatus, string> = {
  allocated: "Allocated",
  returned: "Returned",
  consumed: "Consumed",
};

export type AssetCategory = {
  id: string;
  institution_id: string;
  name: string;
  is_consumable: boolean;
  created_at: string;
};

export type Asset = {
  id: string;
  institution_id: string;
  category_id: string;
  name: string;
  brand_model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  status: AssetStatus;
  location_details: string | null;
  current_stock: number;
  unit: string;
  reorder_level: number | null;
  created_at: string;
  asset_categories?: { name: string; is_consumable: boolean } | null;
};

export type AssetAllocation = {
  id: string;
  asset_id: string;
  allocated_to_type: AllocationTargetType;
  department_id: string | null;
  laboratory_id: string | null;
  staff_id: string | null;
  allocated_qty: number;
  allocated_date: string;
  returned_qty: number | null;
  returned_date: string | null;
  status: AllocationStatus;
  assets?: { name: string; unit: string } | null;
  departments?: { name: string } | null;
  laboratories?: { name: string } | null;
  staff?: { full_name: string } | null;
};

export type AssetMaintenanceLog = {
  id: string;
  asset_id: string;
  log_date: string;
  description: string;
  cost: number | null;
  logged_by: string | null;
  assets?: { name: string } | null;
  staff?: { full_name: string } | null;
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

/** True when a reorder level is set and stock has fallen to or below it. */
export function isLowStock(asset: { current_stock: number; reorder_level: number | null }): boolean {
  return asset.reorder_level != null && asset.current_stock <= asset.reorder_level;
}

/** The effective status to display: a low-stock asset shows "low_stock" even if
 *  its stored status is still "active". Disposed/maintenance are respected as-is. */
export function effectiveStatus(asset: {
  status: AssetStatus; current_stock: number; reorder_level: number | null;
}): AssetStatus {
  if (asset.status === "disposed" || asset.status === "maintenance") return asset.status;
  return isLowStock(asset) ? "low_stock" : "active";
}

/** Total of all maintenance costs for an asset (nulls treated as 0). */
export function totalMaintenanceCost(logs: { cost: number | null }[]): number {
  return logs.reduce((sum, l) => sum + (l.cost ?? 0), 0);
}

/** Stock available to allocate right now (never negative). */
export function availableStock(asset: { current_stock: number }): number {
  return Math.max(0, asset.current_stock);
}

/** Validate an allocation quantity against available stock. */
export function canAllocate(asset: { current_stock: number }, qty: number): boolean {
  return qty > 0 && qty <= availableStock(asset);
}

/** Resolve the human-readable target of an allocation row. */
export function allocationTargetName(a: {
  allocated_to_type: AllocationTargetType;
  departments?: { name: string } | null;
  laboratories?: { name: string } | null;
  staff?: { full_name: string } | null;
}): string {
  switch (a.allocated_to_type) {
    case "department": return a.departments?.name ?? "Department";
    case "laboratory": return a.laboratories?.name ?? "Laboratory";
    case "staff": return a.staff?.full_name ?? "Staff";
  }
}

/** Indian rupee formatting, no paise. */
export function inr(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
