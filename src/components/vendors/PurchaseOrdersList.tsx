"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, FileText, ChevronRight } from "lucide-react";
import type { POFormData } from "@/actions/purchaseOrders";
import { PO_STATUS_COLORS, PO_STATUS_LABELS, poStats, inr, type PurchaseOrder, type POStatus } from "@/lib/purchaseOrders";
import { PurchaseOrderForm } from "./PurchaseOrderForm";

const STATUS_FILTERS: (POStatus | "")[] = ["", "draft", "submitted", "approved", "received", "paid", "cancelled"];

export function PurchaseOrdersList({ institutionId, initial, form }: {
  institutionId: string;
  initial: PurchaseOrder[];
  form: POFormData;
}) {
  const [orders, setOrders] = useState<PurchaseOrder[]>(initial);
  const [statusFilter, setStatusFilter] = useState<POStatus | "">("");
  const [newOpen, setNewOpen] = useState(false);

  const stats = useMemo(() => poStats(orders), [orders]);
  const filtered = useMemo(() => (statusFilter ? orders.filter((o) => o.status === statusFilter) : orders), [orders, statusFilter]);

  const noVendors = form.vendors.length === 0;

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <Link href={`/institutions/${institutionId}/vendors`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-purple-600 font-medium mb-4">
        <ArrowLeft size={13} /> Vendors
      </Link>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-purple-500" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Purchase Orders</h1>
        </div>
        <button type="button" onClick={() => setNewOpen(true)} disabled={noVendors} title={noVendors ? "Add a vendor first" : ""} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 border border-purple-700 disabled:opacity-50">
          <Plus size={14} strokeWidth={2.5} /> New PO
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Stat label="Total value" value={inr(stats.totalValue)} />
        <Stat label="Open" value={String(stats.open)} />
        <Stat label="Pending approval" value={String(stats.pendingApproval)} />
        <Stat label="Awaiting payment" value={String(stats.awaitingPayment)} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
              statusFilter === s
                ? "bg-purple-600 text-white border-purple-700"
                : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            {s ? PO_STATUS_LABELS[s] : "All"}
          </button>
        ))}
        <span className="text-[11px] text-slate-400 ml-auto">{filtered.length} of {orders.length}</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-16">No purchase orders{statusFilter ? ` with status "${PO_STATUS_LABELS[statusFilter]}"` : ""}.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((o) => (
            <Link
              key={o.id}
              href={`/institutions/${institutionId}/vendors/purchase-orders/${o.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50/40 dark:hover:bg-purple-950/10 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{o.po_number}</p>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${PO_STATUS_COLORS[o.status]}`}>{PO_STATUS_LABELS[o.status]}</span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {o.vendors?.name ?? "Vendor"}
                  {o.departments?.name ? ` · ${o.departments.name}` : ""}
                  {` · ${o.items.length} item${o.items.length === 1 ? "" : "s"}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{inr(o.total_amount)}</p>
                <p className="text-[10px] text-slate-400">{o.created_at.slice(0, 10)}</p>
              </div>
              <ChevronRight size={15} className="text-slate-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {newOpen && (
        <PurchaseOrderForm
          institutionId={institutionId}
          form={form}
          onClose={() => setNewOpen(false)}
          onCreated={(po) => setOrders((prev) => [po, ...prev])}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
      <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{value}</p>
    </div>
  );
}
