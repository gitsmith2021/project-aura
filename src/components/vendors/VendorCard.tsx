"use client";

import { Building2, Phone, Mail, FileText, Pencil } from "lucide-react";
import { VENDOR_CATEGORY_LABELS, type Vendor } from "@/lib/purchaseOrders";

export function VendorCard({ vendor, onEdit }: { vendor: Vendor; onEdit: (v: Vendor) => void }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center shrink-0">
            <Building2 size={17} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{vendor.name}</h3>
            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {VENDOR_CATEGORY_LABELS[vendor.category]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!vendor.is_active && <span className="text-[10px] font-semibold text-slate-400">Inactive</span>}
          <button type="button" onClick={() => onEdit(vendor)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil size={13} /></button>
        </div>
      </div>

      <div className="mt-3 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
        {vendor.gst_number && <p className="flex items-center gap-1.5"><FileText size={11} /> GST {vendor.gst_number}</p>}
        {vendor.contact_person && <p className="truncate">{vendor.contact_person}</p>}
        {vendor.phone && <p className="flex items-center gap-1.5"><Phone size={11} /> {vendor.phone}</p>}
        {vendor.email && <p className="flex items-center gap-1.5 truncate"><Mail size={11} /> {vendor.email}</p>}
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
        <span className="text-slate-400">{vendor.po_count ?? 0} purchase order{(vendor.po_count ?? 0) === 1 ? "" : "s"}</span>
      </div>
    </div>
  );
}
