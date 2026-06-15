"use client";

import { useEffect, useState } from "react";
import { getMessBills, generateMessBills, markMessPaid, postMessBillToLedger, type MessBillWithStudent } from "@/actions/mess";
import { MESS_PLANS, MESS_PLAN_LABEL, messPlanDefaultAmount, currentMonth, monthLabel, type MessPlan } from "@/lib/messMaintenance";

type HostelOpt = { id: string; name: string };
const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export function MessBilling({ institutionId, hostels }: { institutionId: string; hostels: HostelOpt[] }) {
  const [hostelId, setHostelId] = useState(hostels[0]?.id ?? "");
  const [month, setMonth] = useState(currentMonth());
  const [bills, setBills] = useState<MessBillWithStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<MessPlan>("full");
  const [amount, setAmount] = useState(String(messPlanDefaultAmount("full")));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [posted, setPosted] = useState<Set<string>>(new Set());

  const load = () => {
    if (!hostelId) return;
    setLoading(true);
    getMessBills(hostelId, month).then((res) => { setBills(res.success ? res.data : []); setLoading(false); });
  };
  useEffect(load, [hostelId, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async () => {
    setBusy(true); setError(null); setMsg(null);
    const res = await generateMessBills({ institutionId, hostelId, month, planType: plan, amount: parseInt(amount, 10) || 0 });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setMsg(`Generated ${res.data.generated} new bill(s).`);
    load();
  };

  const pay = async (id: string) => {
    setBusy(true); setError(null);
    const res = await markMessPaid(id, institutionId);
    setBusy(false);
    if (res.success) setBills((prev) => prev.map((b) => (b.id === id ? { ...b, is_paid: true, paid_at: new Date().toISOString() } : b)));
    else setError(res.error);
  };

  const postLedger = async (id: string) => {
    setBusy(true); setError(null); setMsg(null);
    const res = await postMessBillToLedger(id, institutionId);
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setPosted((prev) => new Set(prev).add(id));
    setMsg(res.data.created ? "Posted to the student's fee ledger." : "Already in the fee ledger.");
  };

  const collected = bills.filter((b) => b.is_paid).reduce((s, b) => s + Number(b.amount), 0);
  const pending = bills.filter((b) => !b.is_paid).reduce((s, b) => s + Number(b.amount), 0);

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-1">Mess Billing</h1>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">Generate monthly mess bills for allocated students and record payments.</p>

      <div className="flex flex-wrap items-end gap-3 mb-4 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
        <div><label className="block text-[10px] font-semibold text-slate-500 mb-1">Hostel</label>
          <select value={hostelId} onChange={(e) => setHostelId(e.target.value)} className="h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200">
            {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div><label className="block text-[10px] font-semibold text-slate-500 mb-1">Month</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200" />
        </div>
        <div><label className="block text-[10px] font-semibold text-slate-500 mb-1">Plan</label>
          <select value={plan} onChange={(e) => { const p = e.target.value as MessPlan; setPlan(p); setAmount(String(messPlanDefaultAmount(p))); }} className="h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200">
            {MESS_PLANS.map((p) => <option key={p} value={p}>{MESS_PLAN_LABEL[p]}</option>)}
          </select>
        </div>
        <div><label className="block text-[10px] font-semibold text-slate-500 mb-1">Amount (₹)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-8 w-24 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200" />
        </div>
        <button type="button" onClick={generate} disabled={busy || !hostelId} className="h-8 px-3 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">Generate bills</button>
      </div>

      {error && <p className="mb-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
      {msg && <p className="mb-3 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-lg px-3 py-2">{msg}</p>}

      <div className="flex items-center gap-4 mb-3 text-[11px]">
        <span className="text-slate-500 dark:text-slate-400">{monthLabel(month)}</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Collected {inr(collected)}</span>
        <span className="text-amber-600 dark:text-amber-400 font-semibold">Pending {inr(pending)}</span>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400 py-10 text-center">Loading…</p>
      ) : bills.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-12">No bills for this month yet — generate them above.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Student</th>
                <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Plan</th>
                <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Amount</th>
                <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Status</th>
                <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {bills.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">{b.student_name}{b.roll_no ? <span className="text-slate-400"> · {b.roll_no}</span> : null}</td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{MESS_PLAN_LABEL[b.plan_type]}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200">{inr(Number(b.amount))}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${b.is_paid ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}>{b.is_paid ? "Paid" : "Unpaid"}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      {posted.has(b.id) ? (
                        <span className="text-[10px] text-slate-400">In ledger</span>
                      ) : (
                        <button type="button" disabled={busy} onClick={() => postLedger(b.id)} title="Post this bill to the student's central fee ledger" className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40">Post to ledger</button>
                      )}
                      {!b.is_paid && <button type="button" disabled={busy} onClick={() => pay(b.id)} className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-40">Mark paid</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
