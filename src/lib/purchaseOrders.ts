// Phase 4E-sub — Vendor & Purchase Order domain model + pure helpers (unit-testable).

export type VendorCategory =
  | "lab_equipment" | "stationery" | "furniture"
  | "it_hardware" | "software" | "maintenance" | "other";

export const VENDOR_CATEGORY_LABELS: Record<VendorCategory, string> = {
  lab_equipment: "Lab Equipment",
  stationery: "Stationery",
  furniture: "Furniture",
  it_hardware: "IT Hardware",
  software: "Software",
  maintenance: "Maintenance",
  other: "Other",
};

export const VENDOR_CATEGORIES: VendorCategory[] = [
  "lab_equipment", "stationery", "furniture", "it_hardware", "software", "maintenance", "other",
];

export type POStatus = "draft" | "submitted" | "approved" | "received" | "paid" | "cancelled";

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  received: "Received",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const PO_STATUS_COLORS: Record<POStatus, string> = {
  draft: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  approved: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  received: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

/** The happy-path lifecycle order (excludes the terminal `cancelled`). */
export const PO_FLOW: POStatus[] = ["draft", "submitted", "approved", "received", "paid"];

export type POLineItem = {
  name: string;
  qty: number;
  unit: string;
  unit_price: number;
  total: number;
};

export type Vendor = {
  id: string;
  institution_id: string;
  name: string;
  gst_number: string | null;
  category: VendorCategory;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  po_count?: number;
};

export type PurchaseOrder = {
  id: string;
  institution_id: string;
  department_id: string | null;
  vendor_id: string;
  po_number: string;
  items: POLineItem[];
  total_amount: number;
  status: POStatus;
  raised_by: string | null;
  approved_by: string | null;
  invoice_url: string | null;
  received_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  vendors?: { name: string; category: VendorCategory } | null;
  departments?: { name: string } | null;
  staff?: { full_name: string } | null;
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

/** Line total = qty × unit price, rounded to 2dp. */
export function lineItemTotal(item: { qty: number; unit_price: number }): number {
  return Math.round(item.qty * item.unit_price * 100) / 100;
}

/** Sum of all line totals (recomputed, not trusting stored `total`). */
export function poTotal(items: { qty: number; unit_price: number }[]): number {
  return Math.round(items.reduce((sum, i) => sum + i.qty * i.unit_price, 0) * 100) / 100;
}

/** Normalise a raw line into a complete POLineItem with computed total. */
export function normaliseLineItem(raw: { name: string; qty: number; unit?: string; unit_price: number }): POLineItem {
  return {
    name: raw.name.trim(),
    qty: raw.qty,
    unit: (raw.unit ?? "pcs").trim() || "pcs",
    unit_price: raw.unit_price,
    total: lineItemTotal(raw),
  };
}

/** Format a PO number as PO-YYYY-NNNN (4-digit zero-padded sequence). */
export function formatPoNumber(year: number, seq: number): string {
  return `PO-${year}-${String(seq).padStart(4, "0")}`;
}

/** The next status in the lifecycle, or null if terminal / cancelled. */
export function nextStatus(status: POStatus): POStatus | null {
  if (status === "cancelled" || status === "paid") return null;
  const i = PO_FLOW.indexOf(status);
  return i >= 0 && i < PO_FLOW.length - 1 ? PO_FLOW[i + 1] : null;
}

/** A PO can be cancelled until it has been received. */
export function canCancel(status: POStatus): boolean {
  return status === "draft" || status === "submitted" || status === "approved";
}

/** Has the lifecycle reached at least `target`? (cancelled never has.) */
export function hasReached(status: POStatus, target: POStatus): boolean {
  if (status === "cancelled") return false;
  return PO_FLOW.indexOf(status) >= PO_FLOW.indexOf(target);
}

export type POStats = { total: number; open: number; pendingApproval: number; awaitingPayment: number; totalValue: number };

/** Roll up a list of POs into dashboard counters. */
export function poStats(orders: { status: POStatus; total_amount: number }[]): POStats {
  let open = 0, pendingApproval = 0, awaitingPayment = 0, totalValue = 0;
  for (const o of orders) {
    if (o.status !== "cancelled") totalValue += o.total_amount;
    if (o.status === "submitted") pendingApproval++;
    if (o.status === "approved" || o.status === "received") awaitingPayment++;
    if (o.status !== "paid" && o.status !== "cancelled") open++;
  }
  return { total: orders.length, open, pendingApproval, awaitingPayment, totalValue };
}

/** Indian rupee formatting, no paise. */
export function inr(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
