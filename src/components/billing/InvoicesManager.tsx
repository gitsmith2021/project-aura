"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, ArrowLeft, Plus, X, Check, Ban } from "lucide-react";
import { generateInvoice, markInvoice, type InvoiceRow } from "@/actions/subscriptions";
import { formatINR } from "@/lib/subscriptions";

const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

type InstOpt = { id: string; name: string };
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  refunded: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

function fmt(d: string) { return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }

export function InvoicesManager({ initial, institutions }: { initial: InvoiceRow[]; institutions: InstOpt[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [institutionId, setInstitutionId] = useState("");
  const [amount, setAmount] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!institutionId) { setError("Select an institution."); return; }
    const amt = Number(amount);
    if (Number.isNaN(amt) || amt < 0) { setError("Enter a valid amount."); return; }
    if (!periodStart || !periodEnd) { setError("Set the period."); return; }
    setBusy(true); setError(null);
    const res = await generateInvoice({ institutionId, amount: amt, periodStart, periodEnd });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOpen(false); setInstitutionId(""); setAmount(""); router.refresh();
  }
  async function setStatus(v: InvoiceRow, status: "paid" | "failed" | "pending" | "refunded") {
    const res = await markInvoice({ id: v.id, status });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/billing" className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-violet-600 mb-2"><ArrowLeft size={13} /> Billing</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><FileText size={22} className="text-violet-600" /> Invoices</h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Subscription invoices across all institutions — mark paid/failed manually.</p>
          </div>
          <button onClick={() => { setOpen(true); setError(null); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"><Plus size={15} /> New Invoice</button>
        </div>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No invoices yet.</div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-2.5 font-medium">Invoice</th><th className="px-4 py-2.5 font-medium">Institution</th><th className="px-4 py-2.5 font-medium">Period</th><th className="px-4 py-2.5 font-medium">Amount</th><th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr></thead>
            <tbody>
              {initial.map((v) => (
                <tr key={v.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-[12px] text-slate-700 dark:text-slate-300">{v.invoiceNumber}</td>
                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{v.institutionName}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-[12px]">{fmt(v.periodStart)} – {fmt(v.periodEnd)}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">{formatINR(v.amount)}</td>
                  <td className="px-4 py-2.5"><span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_STYLE[v.status]}`}>{v.status}</span></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {v.status !== "paid" && <button onClick={() => setStatus(v, "paid")} title="Mark paid" className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"><Check size={14} /></button>}
                      {v.status !== "failed" && <button onClick={() => setStatus(v, "failed")} title="Mark failed" className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"><Ban size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><FileText size={18} className="text-violet-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">New Invoice</h2></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <div><label className={labelCls}>Institution</label>
                <select className={inputCls} value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
                  <option value="">Select institution</option>
                  {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Amount (₹)</label><input type="number" min={0} className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Period start</label><input type="date" className={inputCls} value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} /></div>
                <div><label className={labelCls}>Period end</label><input type="date" className={inputCls} value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={create} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">{busy ? "Creating…" : "Generate"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
