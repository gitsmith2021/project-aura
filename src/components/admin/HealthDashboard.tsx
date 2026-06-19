import { Activity, Server, CreditCard, AlertTriangle, Database, ShieldCheck, CheckCircle2, XCircle, ScrollText } from "lucide-react";
import type { PlatformHealth } from "@/actions/platformHealth";
import { compactNumber, formatLatency, paymentSeverity } from "@/lib/platformHealth";

const SEV_CLS: Record<string, string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  info: "text-sky-600 dark:text-sky-400",
  warn: "text-amber-600 dark:text-amber-400",
  critical: "text-rose-600 dark:text-rose-400",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}
function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function HealthDashboard({ data }: { data: PlatformHealth }) {
  const sev = paymentSeverity(data.payments.failureRate);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Activity size={22} className="text-violet-600" /> Platform Health</h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Scheduler, payments, audit trail and database — across all institutions.</p>
      </div>

      {/* Top cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide flex items-center gap-1"><Server size={12} /> Scheduler engine</p>
          <div className="mt-1 flex items-center gap-2">
            {data.scheduler.online
              ? <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={18} /> Online</span>
              : <span className="text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5"><XCircle size={18} /> Offline</span>}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{data.scheduler.online ? `${formatLatency(data.scheduler.latencyMs)} latency` : "FastAPI /health unreachable"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide flex items-center gap-1"><CreditCard size={12} /> Payment failure rate</p>
          <p className={`text-2xl font-bold mt-1 ${SEV_CLS[sev]}`}>{data.payments.failureRate}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{data.payments.failed} failed of {data.payments.total} total</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide flex items-center gap-1"><AlertTriangle size={12} /> Failed (7d / 30d)</p>
          <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{data.payments.failedLast7d} <span className="text-slate-400 text-base">/ {data.payments.failedLast30d}</span></p>
          <p className="text-[11px] text-slate-400 mt-0.5">{data.payments.pending} pending now</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide flex items-center gap-1"><Database size={12} /> Database</p>
          <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{compactNumber(data.totalRows)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">est. rows across {data.tableCount} tables</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent failed payments */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800"><p className="text-[13px] font-semibold text-slate-900 dark:text-white flex items-center gap-1.5"><AlertTriangle size={15} className="text-amber-500" /> Recent failed payments (30d)</p></div>
          {data.payments.recentFailures.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-slate-400">No failed payments — clean.</p>
          ) : (
            <table className="w-full text-[13px]">
              <tbody>
                {data.payments.recentFailures.map((f) => (
                  <tr key={f.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{f.institution}</td>
                    <td className="px-4 py-2.5 text-slate-500">{inr(f.amount)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-400 text-[11px]">{fmtTime(f.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top tables */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800"><p className="text-[13px] font-semibold text-slate-900 dark:text-white flex items-center gap-1.5"><Database size={15} className="text-sky-500" /> Largest tables (est. rows)</p></div>
          <table className="w-full text-[13px]">
            <tbody>
              {data.topTables.map((t) => (
                <tr key={t.table} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                  <td className="px-4 py-2 font-mono text-[12px] text-slate-700 dark:text-slate-300">{t.table}</td>
                  <td className="px-4 py-2 text-right text-slate-500">{compactNumber(t.rows)}</td>
                  <td className="px-4 py-2 text-right w-10">{t.rlsEnabled ? <ShieldCheck size={14} className="text-emerald-500 inline" /> : <AlertTriangle size={14} className="text-amber-500 inline" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit log */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800"><p className="text-[13px] font-semibold text-slate-900 dark:text-white flex items-center gap-1.5"><ScrollText size={15} className="text-violet-500" /> Recent audit trail (all institutions)</p></div>
        {data.audit.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-slate-400">No audit entries yet.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-2 font-medium">Institution</th><th className="px-4 py-2 font-medium">Action</th><th className="px-4 py-2 font-medium">Table</th><th className="px-4 py-2 font-medium">Note</th><th className="px-4 py-2 font-medium text-right">When</th>
            </tr></thead>
            <tbody>
              {data.audit.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{a.institution}</td>
                  <td className="px-4 py-2"><span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{a.action}</span></td>
                  <td className="px-4 py-2 font-mono text-[12px] text-slate-500">{a.table}</td>
                  <td className="px-4 py-2 text-slate-500 max-w-[220px] truncate">{a.notes ?? "—"}</td>
                  <td className="px-4 py-2 text-right text-slate-400 text-[11px]">{fmtTime(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
