"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Wrench, Plus, X } from "lucide-react";
import { recordMaintenance } from "@/actions/assets";
import { totalMaintenanceCost, inr, type Asset, type AssetMaintenanceLog } from "@/lib/assets";

const inputCls =
  "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";

export function MaintenanceBoard({
  institutionId, assets, initialLogs,
}: {
  institutionId: string;
  assets: Asset[];
  initialLogs: AssetMaintenanceLog[];
}) {
  const [logs, setLogs] = useState<AssetMaintenanceLog[]>(initialLogs);
  const [open, setOpen] = useState(false);

  const total = useMemo(() => totalMaintenanceCost(logs), [logs]);
  const assetName = (id: string) => assets.find((a) => a.id === id)?.name ?? "Asset";

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <Link href={`/institutions/${institutionId}/assets`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-purple-600 font-medium mb-4">
        <ArrowLeft size={13} /> Assets
      </Link>

      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Wrench size={18} className="text-amber-500" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Maintenance Logs</h1>
        </div>
        <button type="button" onClick={() => setOpen(true)} disabled={assets.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 border border-purple-700 disabled:opacity-50">
          <Plus size={14} strokeWidth={2.5} /> Record Maintenance
        </button>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
        Servicing &amp; repair history · running cost <span className="font-semibold text-slate-700 dark:text-slate-200">{inr(total)}</span>
      </p>

      {logs.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-16">No maintenance recorded yet.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-3 py-2.5 font-semibold">Asset</th>
                <th className="px-3 py-2.5 font-semibold">Description</th>
                <th className="px-3 py-2.5 font-semibold">Logged by</th>
                <th className="px-3 py-2.5 font-semibold text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{l.log_date}</td>
                  <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200">{l.assets?.name ?? assetName(l.asset_id)}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{l.description}</td>
                  <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{l.staff?.full_name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-200">{l.cost != null ? inr(l.cost) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <RecordDrawer
          institutionId={institutionId}
          assets={assets}
          onClose={() => setOpen(false)}
          onAdded={(log) => setLogs((prev) => [log, ...prev])}
        />
      )}
    </div>
  );
}

function RecordDrawer({ institutionId, assets, onClose, onAdded }: {
  institutionId: string; assets: Asset[]; onClose: () => void; onAdded: (l: AssetMaintenanceLog) => void;
}) {
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [setUnderMaintenance, setSetUnderMaintenance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setError(null);
    const c = cost ? parseFloat(cost) : 0;
    const res = await recordMaintenance({ institutionId, assetId, description, cost: c, logDate, setUnderMaintenance });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    // Optimistic row (logged_by name unknown client-side → shown as —)
    onAdded({
      id: crypto.randomUUID(), asset_id: assetId, log_date: logDate, description: description.trim(),
      cost: c, logged_by: null, assets: { name: assets.find((a) => a.id === assetId)?.name ?? "Asset" }, staff: null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <aside className="relative h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Record Maintenance</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Asset</label>
            <select value={assetId} onChange={(e) => setAssetId(e.target.value)} className={inputCls}>
              {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputCls} h-auto py-2`} placeholder="e.g. Replaced objective lens, serviced focus knob" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Cost (₹)</label>
              <input type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Date</label>
              <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={setUnderMaintenance} onChange={(e) => setSetUnderMaintenance(e.target.checked)} className="rounded border-slate-300" />
            Mark this asset as &ldquo;Under Maintenance&rdquo;
          </label>
          {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
          <button type="button" onClick={submit} disabled={saving || !assetId || !description.trim()} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Saving…" : "Record"}</button>
        </div>
      </aside>
    </div>
  );
}
