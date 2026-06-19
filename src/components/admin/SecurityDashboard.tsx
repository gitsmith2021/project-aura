import { ShieldCheck, CheckCircle2, Clock, AlertTriangle, Lock } from "lucide-react";
import type { SecurityPosture } from "@/actions/platformHealth";

const STATUS_META: Record<string, { cls: string; icon: typeof CheckCircle2; label: string }> = {
  pass: { cls: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2, label: "Pass" },
  deferred: { cls: "text-amber-600 dark:text-amber-400", icon: Clock, label: "Deferred" },
  review: { cls: "text-sky-600 dark:text-sky-400", icon: AlertTriangle, label: "Review" },
};

export function SecurityDashboard({ data }: { data: SecurityPosture }) {
  const { rls } = data;
  const ring = `conic-gradient(rgb(16 185 129) ${rls.pct}%, rgb(226 232 240) ${rls.pct}%)`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><ShieldCheck size={22} className="text-violet-600" /> Security</h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">RLS coverage, ISO-27001 checklist and intentional deny-all tables.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {/* RLS coverage ring */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-center gap-4">
          <div className="w-20 h-20 rounded-full grid place-items-center shrink-0" style={{ background: ring }}>
            <div className="rounded-full bg-white dark:bg-slate-900 grid place-items-center" style={{ width: 60, height: 60 }}>
              <span className="text-[15px] font-bold text-slate-900 dark:text-white">{rls.pct}%</span>
            </div>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-slate-900 dark:text-white">RLS coverage</p>
            <p className="text-[12px] text-slate-500 mt-0.5">{rls.covered} of {rls.total} public tables protected</p>
          </div>
        </div>

        {/* Unprotected tables */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:col-span-2">
          <p className="text-[12px] font-semibold text-slate-900 dark:text-white mb-2">Tables without RLS</p>
          {rls.unprotected.length === 0 ? (
            <p className="text-[13px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={15} /> Every public table has row-level security enabled.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {rls.unprotected.map((t) => <span key={t} className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">{t}</span>)}
            </div>
          )}
        </div>
      </div>

      {/* Findings */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800"><p className="text-[13px] font-semibold text-slate-900 dark:text-white">ISO 27001 / DPDP checklist</p></div>
        <ul className="divide-y divide-slate-50 dark:divide-slate-800/50">
          {data.findings.map((f, i) => {
            const m = STATUS_META[f.status];
            const Icon = m.icon;
            return (
              <li key={i} className="px-4 py-3 flex items-start gap-3">
                <Icon size={16} className={`${m.cls} shrink-0 mt-0.5`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200">{f.item}</p>
                  <p className="text-[12px] text-slate-500">{f.detail}</p>
                </div>
                <span className={`text-[11px] font-semibold ${m.cls} shrink-0`}>{m.label}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Intentional deny-all */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
        <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1"><Lock size={14} /> Intentional deny-all tables</p>
        <p className="text-[12px] text-slate-500">
          {data.intentionalDenyAll.map((t) => <span key={t} className="font-mono">{t} </span>)}
          — RLS enabled with no policies <em>by design</em>. Written only via the service role; no client role may read them. The advisor&apos;s &quot;RLS Enabled No Policy&quot; notice on these is expected.
        </p>
      </div>
    </div>
  );
}
