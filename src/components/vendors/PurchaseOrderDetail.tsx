"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Check, Loader2, Upload, FileText, ExternalLink, Ban, Send, PackageCheck, Wallet,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { submitPO, approvePO, cancelPO, markReceived, markPaid, updateInvoiceUrl } from "@/actions/purchaseOrders";
import {
  PO_FLOW, PO_STATUS_COLORS, PO_STATUS_LABELS, hasReached, inr,
  type PurchaseOrder, type POStatus,
} from "@/lib/purchaseOrders";

const INVOICE_BUCKET = "purchase-invoices";

export function PurchaseOrderDetail({ institutionId, po: initial }: { institutionId: string; po: PurchaseOrder }) {
  const router = useRouter();
  const [po, setPo] = useState<PurchaseOrder>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [addToInventory, setAddToInventory] = useState(true);
  const [uploading, setUploading] = useState(false);

  const refresh = () => router.refresh();

  const run = async (fn: () => Promise<{ success: boolean; error?: string }>, nextStatus?: POStatus, patch?: Partial<PurchaseOrder>) => {
    setBusy(true); setError(null); setInfo(null);
    const res = await fn();
    setBusy(false);
    if (!res.success) { setError(res.error ?? "Something went wrong."); return false; }
    if (nextStatus) setPo((p) => ({ ...p, status: nextStatus, ...patch }));
    refresh();
    return true;
  };

  const onReceive = async () => {
    setBusy(true); setError(null); setInfo(null);
    const res = await markReceived({ institutionId, poId: po.id, addToInventory });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setPo((p) => ({ ...p, status: "received", received_at: new Date().toISOString() }));
    if (res.data.assetsCreated > 0) setInfo(`Received. ${res.data.assetsCreated} item(s) added to asset inventory.`);
    refresh();
  };

  const onUploadInvoice = async (file: File) => {
    setUploading(true); setError(null);
    try {
      const sb = createClient();
      const ext = file.name.split(".").pop();
      const path = `${institutionId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await sb.storage.from(INVOICE_BUCKET).upload(path, file);
      if (upErr) { setError(`Invoice upload failed: ${upErr.message}`); setUploading(false); return; }
      const { data: { publicUrl } } = sb.storage.from(INVOICE_BUCKET).getPublicUrl(path);
      const res = await updateInvoiceUrl(institutionId, po.id, publicUrl);
      if (!res.success) { setError(res.error); setUploading(false); return; }
      setPo((p) => ({ ...p, invoice_url: publicUrl }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    }
    setUploading(false);
  };

  return (
    <div className="px-6 pt-6 pb-6 w-full max-w-3xl">
      <Link href={`/institutions/${institutionId}/vendors/purchase-orders`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-purple-600 font-medium mb-4">
        <ArrowLeft size={13} /> Purchase Orders
      </Link>

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">{po.po_number}</h1>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${PO_STATUS_COLORS[po.status]}`}>{PO_STATUS_LABELS[po.status]}</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {po.vendors?.name ?? "Vendor"}
            {po.departments?.name ? ` · ${po.departments.name}` : ""}
            {po.staff?.full_name ? ` · raised by ${po.staff.full_name}` : ""}
            {` · ${po.created_at.slice(0, 10)}`}
          </p>
        </div>
        <p className="text-lg font-bold text-slate-900 dark:text-slate-100 shrink-0">{inr(po.total_amount)}</p>
      </div>

      {/* Status timeline */}
      {po.status !== "cancelled" ? (
        <div className="flex items-center gap-1 mb-5">
          {PO_FLOW.map((s, i) => {
            const done = hasReached(po.status, s);
            return (
              <div key={s} className="flex items-center gap-1 flex-1 last:flex-none">
                <div className={`flex items-center gap-1.5 ${done ? "text-purple-600 dark:text-purple-400" : "text-slate-400"}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${done ? "bg-purple-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-400"}`}>
                    {done ? <Check size={11} /> : i + 1}
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide hidden sm:inline">{PO_STATUS_LABELS[s]}</span>
                </div>
                {i < PO_FLOW.length - 1 && <div className={`flex-1 h-px ${done ? "bg-purple-300 dark:bg-purple-700" : "bg-slate-200 dark:bg-slate-800"}`} />}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mb-5 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400">This purchase order was cancelled.</div>
      )}

      {/* Line items */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-[10px] uppercase tracking-wider text-slate-400">
              <th className="px-4 py-2.5 font-semibold">Item</th>
              <th className="px-3 py-2.5 font-semibold text-right">Qty</th>
              <th className="px-3 py-2.5 font-semibold text-right">Unit price</th>
              <th className="px-3 py-2.5 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {po.items.map((it, i) => (
              <tr key={i}>
                <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{it.name}</td>
                <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">{it.qty} {it.unit}</td>
                <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">{inr(it.unit_price)}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-200">{inr(it.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 dark:border-slate-700">
              <td colSpan={3} className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-500">Total</td>
              <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-900 dark:text-slate-100">{inr(po.total_amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {po.notes && <p className="text-xs text-slate-600 dark:text-slate-300 mb-4"><span className="font-semibold text-slate-500">Notes:</span> {po.notes}</p>}

      {/* Invoice */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={15} className="text-slate-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">GST Invoice</p>
            {po.invoice_url
              ? <a href={po.invoice_url} target="_blank" rel="noreferrer" className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">View invoice <ExternalLink size={10} /></a>
              : <p className="text-[11px] text-slate-400">No invoice uploaded</p>}
          </div>
        </div>
        <label className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shrink-0">
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {po.invoice_url ? "Replace" : "Upload"}
          <input type="file" accept="image/*,application/pdf" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadInvoice(f); }} />
        </label>
      </div>

      {info && <p className="text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-lg px-3 py-2 mb-3">{info}</p>}
      {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2 mb-3">{error}</p>}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {po.status === "draft" && (
          <button type="button" onClick={() => run(() => submitPO(institutionId, po.id), "submitted")} disabled={busy} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">
            <Send size={13} /> Submit for approval
          </button>
        )}
        {po.status === "submitted" && (
          <button type="button" onClick={() => run(() => approvePO(institutionId, po.id), "approved")} disabled={busy} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-md hover:bg-violet-700 disabled:opacity-50">
            <Check size={13} /> Approve
          </button>
        )}
        {po.status === "approved" && (
          <>
            <button type="button" onClick={onReceive} disabled={busy} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-md hover:bg-amber-700 disabled:opacity-50">
              <PackageCheck size={13} /> Mark received
            </button>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={addToInventory} onChange={(e) => setAddToInventory(e.target.checked)} className="rounded border-slate-300" />
              Add items to asset inventory
            </label>
          </>
        )}
        {po.status === "received" && (
          <button type="button" onClick={() => run(() => markPaid(institutionId, po.id), "paid")} disabled={busy} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700 disabled:opacity-50">
            <Wallet size={13} /> Mark paid
          </button>
        )}
        {(po.status === "draft" || po.status === "submitted" || po.status === "approved") && (
          <button type="button" onClick={() => run(() => cancelPO(institutionId, po.id), "cancelled")} disabled={busy} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50">
            <Ban size={13} /> Cancel PO
          </button>
        )}
        {busy && <Loader2 size={15} className="animate-spin text-slate-400" />}
      </div>
    </div>
  );
}
