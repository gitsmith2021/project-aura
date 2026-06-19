"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet, X, Layers, FileText, TrendingUp } from "lucide-react";
import {
  assignPlan, renewSubscription, cancelSubscription, generateInvoice,
  type SubscriptionRow, type BillingSummary, type PlanRow,
} from "@/actions/subscriptions";
import { formatINR, type BillingCycle, type SubStatus } from "@/lib/subscriptions";
import { SubscriptionCard } from "./SubscriptionCard";

const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

type Filter = "all" | "active" | "trial" | "expired" | "none";

export function BillingDashboard({ rows, summary, plans }: { rows: SubscriptionRow[]; summary: BillingSummary; plans: PlanRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");

  // assign drawer
  const [assignFor, setAssignFor] = useState<SubscriptionRow | null>(null);
  const [planId, setPlanId] = useState("");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [status, setStatus] = useState<SubStatus>("trial");
  const [expiresAt, setExpiresAt] = useState("");

  // invoice drawer
  const [invoiceFor, setInvoiceFor] = useState<SubscriptionRow | null>(null);
  const [amount, setAmount] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = rows.filter((r) => (filter === "all" ? true : r.status === filter));

  function openAssign(r: SubscriptionRow) {
    setAssignFor(r); setPlanId(r.planId ?? plans[0]?.id ?? ""); setCycle(r.billingCycle ?? "monthly");
    setStatus(r.status === "none" ? "trial" : (r.status as SubStatus)); setExpiresAt(r.expiresAt ? r.expiresAt.slice(0, 10) : "");
    setError(null);
  }
  async function doAssign() {
    if (!assignFor || !planId) { setError("Pick a plan."); return; }
    setBusy(true); setError(null);
    const res = await assignPlan({ institutionId: assignFor.institutionId, planId, billingCycle: cycle, status, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setAssignFor(null); router.refresh();
  }
  async function doRenew(r: SubscriptionRow) {
    const months = r.billingCycle === "annual" ? 12 : 1;
    if (!confirm(`Renew ${r.institutionName} by ${months} month${months > 1 ? "s" : ""}?`)) return;
    const res = await renewSubscription({ institutionId: r.institutionId, months });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }
  async function doCancel(r: SubscriptionRow) {
    if (!confirm(`Cancel ${r.institutionName}'s subscription?`)) return;
    const res = await cancelSubscription({ institutionId: r.institutionId });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }
  function openInvoice(r: SubscriptionRow) {
    setInvoiceFor(r); setAmount(r.monthlyValue ? String(r.monthlyValue) : "");
    const now = new Date(); const end = new Date(now); end.setMonth(end.getMonth() + 1);
    setPeriodStart(now.toISOString().slice(0, 10)); setPeriodEnd(end.toISOString().slice(0, 10)); setError(null);
  }
  async function doInvoice() {
    if (!invoiceFor) return;
    const amt = Number(amount);
    if (Number.isNaN(amt) || amt < 0) { setError("Enter a valid amount."); return; }
    if (!periodStart || !periodEnd) { setError("Set the billing period."); return; }
    setBusy(true); setError(null);
    const res = await generateInvoice({ institutionId: invoiceFor.institutionId, amount: amt, periodStart, periodEnd });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setInvoiceFor(null); router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Wallet size={22} className="text-violet-600" /> Billing &amp; Subscriptions</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Assign plans, renew, and bill institutions. Razorpay recurring auto-charge is deferred — invoices are managed manually.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/billing/plans" className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><Layers size={15} /> Plans</Link>
          <Link href="/admin/billing/invoices" className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><FileText size={15} /> Invoices</Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide flex items-center gap-1"><TrendingUp size={12} /> MRR</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatINR(summary.mrr)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">ARR</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatINR(summary.arr)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Active / Trial</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{summary.active} <span className="text-slate-400 text-base">/ {summary.trial}</span></p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Expired / None</p>
          <p className={`text-2xl font-bold mt-1 ${summary.expired ? "text-rose-600" : "text-slate-900 dark:text-white"}`}>{summary.expired} <span className="text-slate-400 text-base">/ {summary.unsubscribed}</span></p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["all", "active", "trial", "expired", "none"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-[12px] font-medium rounded-full border ${filter === f ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{f === "none" ? "Unsubscribed" : f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No institutions in this view.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((r) => (
            <SubscriptionCard key={r.institutionId} row={r}
              onAssign={() => openAssign(r)} onRenew={() => doRenew(r)} onCancel={() => doCancel(r)} onInvoice={() => openInvoice(r)} />
          ))}
        </div>
      )}

      {/* Assign drawer */}
      {assignFor && (
        <Drawer title={`${assignFor.planId ? "Change" : "Assign"} plan — ${assignFor.institutionName}`} onClose={() => setAssignFor(null)}
          footer={<><CancelBtn onClick={() => setAssignFor(null)} /><PrimaryBtn busy={busy} onClick={doAssign} label="Save" /></>}>
          {error && <ErrBox msg={error} />}
          <div><label className={labelCls}>Plan</label>
            <select className={inputCls} value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatINR(p.priceMonthly)}/mo</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Billing cycle</label>
              <select className={inputCls} value={cycle} onChange={(e) => setCycle(e.target.value as BillingCycle)}>
                <option value="monthly">Monthly</option><option value="annual">Annual</option>
              </select>
            </div>
            <div><label className={labelCls}>Status</label>
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as SubStatus)}>
                <option value="trial">Trial</option><option value="active">Active</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div><label className={labelCls}>Expires / renews on</label><input type="date" className={inputCls} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></div>
        </Drawer>
      )}

      {/* Invoice drawer */}
      {invoiceFor && (
        <Drawer title={`Invoice — ${invoiceFor.institutionName}`} onClose={() => setInvoiceFor(null)}
          footer={<><CancelBtn onClick={() => setInvoiceFor(null)} /><PrimaryBtn busy={busy} onClick={doInvoice} label="Generate" /></>}>
          {error && <ErrBox msg={error} />}
          <div><label className={labelCls}>Amount (₹)</label><input type="number" min={0} className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Period start</label><input type="date" className={inputCls} value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} /></div>
            <div><label className={labelCls}>Period end</label><input type="date" className={inputCls} value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></div>
          </div>
          <p className="text-[11px] text-slate-400">Creates a pending invoice. Mark it paid from the Invoices page once payment is confirmed.</p>
        </Drawer>
      )}
    </div>
  );
}

// ── Small shared drawer bits ──────────────────────────────────────────────────
function Drawer({ title, onClose, footer, children }: { title: string; onClose: () => void; footer: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">{footer}</div>
      </div>
    </div>
  );
}
function CancelBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>;
}
function PrimaryBtn({ busy, onClick, label }: { busy: boolean; onClick: () => void; label: string }) {
  return <button onClick={onClick} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">{busy ? "Saving…" : label}</button>;
}
function ErrBox({ msg }: { msg: string }) {
  return <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{msg}</p>;
}
