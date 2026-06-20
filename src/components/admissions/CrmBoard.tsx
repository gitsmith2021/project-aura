"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, ListOrdered, AlertTriangle } from "lucide-react";
import { updateEnquiryStatus, convertEnquiryToApplication } from "@/actions/admissionsCRM";
import { ENQUIRY_PIPELINE, ENQUIRY_STATUS_LABELS, ENQUIRY_STATUS_COLORS, ENQUIRY_TERMINAL, enquiryStats, sourceBreakdown, nextEnquiryStatus, isFollowUpOverdue, type Enquiry, type EnquiryStatus } from "@/lib/admissionsCRM";
import { EnquiryCard } from "./EnquiryCard";
import { EnquiryDrawer } from "./EnquiryDrawer";

type DeptOption = { id: string; name: string };

export function CrmBoard({
  institutionId, departments, initial, today,
}: {
  institutionId: string;
  instSlug: string;
  departments: DeptOption[];
  initial: Enquiry[];
  today: string;
}) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>(initial);
  const [drawerFor, setDrawerFor] = useState<Enquiry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => enquiryStats(enquiries), [enquiries]);
  const sources = useMemo(() => sourceBreakdown(enquiries), [enquiries]);
  const overdueCount = useMemo(() => enquiries.filter((e) => isFollowUpOverdue(e, today)).length, [enquiries, today]);
  const maxSource = sources[0]?.count ?? 1;

  const columns = useMemo(() => {
    const map: Record<string, Enquiry[]> = {};
    for (const s of ENQUIRY_PIPELINE) map[s] = [];
    for (const e of enquiries) if (!ENQUIRY_TERMINAL.includes(e.status)) (map[e.status] ??= []).push(e);
    return map;
  }, [enquiries]);
  const closed = enquiries.filter((e) => ENQUIRY_TERMINAL.includes(e.status));

  const advance = async (e: Enquiry) => {
    const nxt = nextEnquiryStatus(e.status);
    if (!nxt) return;
    setBusy(e.id); setError(null);
    const res = await updateEnquiryStatus({ institutionId, enquiryId: e.id, status: nxt });
    setBusy(null);
    if (!res.success) { setError(res.error); return; }
    setEnquiries((prev) => prev.map((x) => (x.id === e.id ? { ...x, status: nxt } : x)));
  };

  const close = async (e: Enquiry, status: EnquiryStatus) => {
    setBusy(e.id); setError(null);
    const res = await updateEnquiryStatus({ institutionId, enquiryId: e.id, status });
    setBusy(null);
    if (!res.success) { setError(res.error); return; }
    setEnquiries((prev) => prev.map((x) => (x.id === e.id ? { ...x, status } : x)));
  };

  const convert = async (e: Enquiry) => {
    setBusy(e.id); setError(null);
    const res = await convertEnquiryToApplication({ institutionId, enquiryId: e.id });
    setBusy(null);
    if (!res.success) { setError(res.error); return; }
    setEnquiries((prev) => prev.map((x) => (x.id === e.id ? { ...x, status: "applied", converted_admission_id: res.data.applicationId } : x)));
  };

  const openCreate = () => { setDrawerFor(null); setDrawerOpen(true); };
  const openEdit = (e: Enquiry) => { setDrawerFor(e); setDrawerOpen(true); };

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Admissions CRM</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Capture and nurture enquiries from first contact to application.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/institutions/${institutionId}/admissions/crm/merit-list`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            <ListOrdered size={14} /> Merit list
          </Link>
          <button type="button" onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
            <Plus size={14} /> New enquiry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <Stat label="Total" value={stats.total} />
        <Stat label="Active" value={stats.active} />
        <Stat label="Interested" value={stats.interested} tone="amber" />
        <Stat label="Applied" value={stats.applied} tone="emerald" />
        <Stat label="Lost" value={stats.lost} tone="rose" />
      </div>

      {overdueCount > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-lg px-3 py-2 mb-3">
          <AlertTriangle size={14} /> {overdueCount} enquir{overdueCount === 1 ? "y has" : "ies have"} an overdue follow-up.
        </p>
      )}
      {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2 mb-3">{error}</p>}

      {/* Source breakdown */}
      {sources.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 mb-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Enquiries by source</p>
          <div className="space-y-1.5">
            {sources.map((s) => (
              <div key={s.source} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-[11px] text-slate-500 dark:text-slate-400 truncate">{s.label}</span>
                <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-500/70" style={{ width: `${(s.count / maxSource) * 100}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-[11px] font-semibold text-slate-600 dark:text-slate-300">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Funnel */}
      <div className="grid gap-3 lg:grid-cols-4 sm:grid-cols-2">
        {ENQUIRY_PIPELINE.map((col) => (
          <div key={col} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-2">
            <div className="flex items-center justify-between px-1.5 py-1 mb-1.5">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${ENQUIRY_STATUS_COLORS[col]}`}>{ENQUIRY_STATUS_LABELS[col]}</span>
              <span className="text-[11px] text-slate-400">{columns[col].length}</span>
            </div>
            <div className="space-y-2 min-h-[40px]">
              {columns[col].map((e) => (
                <EnquiryCard
                  key={e.id} enquiry={e} today={today} busy={busy === e.id}
                  onAdvance={advance} onConvert={convert} onEdit={openEdit}
                />
              ))}
              {columns[col].length === 0 && <p className="text-center text-[10px] text-slate-300 dark:text-slate-600 py-3">—</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Closed enquiries */}
      {closed.length > 0 && (
        <details className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <summary className="px-4 py-2.5 text-xs font-semibold text-slate-500 cursor-pointer">Closed ({closed.length})</summary>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {closed.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{e.name}</p>
                  <p className="text-[10px] text-slate-400">{e.program_interest}{e.departments?.name ? ` · ${e.departments.name}` : ""}</p>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${ENQUIRY_STATUS_COLORS[e.status]}`}>{ENQUIRY_STATUS_LABELS[e.status]}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Close action footer hint */}
      <p className="mt-3 text-[10px] text-slate-400">
        Tip: use the funnel buttons to advance an enquiry, <span className="font-semibold">Convert</span> to create a formal application, or edit a card to mark it Not Interested / Lost.
      </p>

      {drawerOpen && (
        <EnquiryDrawer
          institutionId={institutionId}
          departments={departments}
          enquiry={drawerFor}
          onClose={() => setDrawerOpen(false)}
          onSaved={() => setDrawerOpen(false)}
        />
      )}
      {/* close-status controls live on cards via edit; expose quick close in drawer notes */}
      <CloseControls enquiries={enquiries} busy={busy} onClose={close} />
    </div>
  );
}

/** Inline quick-close strip for active enquiries that need to be marked lost/not-interested. */
function CloseControls({
  enquiries, busy, onClose,
}: {
  enquiries: Enquiry[]; busy: string | null; onClose: (e: Enquiry, s: EnquiryStatus) => void;
}) {
  const active = enquiries.filter((e) => !ENQUIRY_TERMINAL.includes(e.status) && e.status !== "applied");
  if (active.length === 0) return null;
  return (
    <details className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <summary className="px-4 py-2.5 text-xs font-semibold text-slate-500 cursor-pointer">Close an enquiry ({active.length} active)</summary>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {active.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-2">
            <p className="text-xs text-slate-700 dark:text-slate-300 truncate">{e.name}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <button type="button" disabled={busy === e.id} onClick={() => onClose(e, "not_interested")} className="px-2 py-1 text-[10px] font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">Not interested</button>
              <button type="button" disabled={busy === e.id} onClick={() => onClose(e, "lost")} className="px-2 py-1 text-[10px] font-semibold rounded-md border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50">Lost</button>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "amber" | "emerald" | "rose" }) {
  const color = tone === "amber" ? "text-amber-600 dark:text-amber-400" : tone === "emerald" ? "text-emerald-600 dark:text-emerald-400" : tone === "rose" ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100";
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}
