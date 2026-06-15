"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { allocateAsset, getAllocationTargets, type AllocationTargets } from "@/actions/assets";
import { ALLOCATION_TARGET_LABELS, availableStock, type Asset, type AllocationTargetType } from "@/lib/assets";

const inputCls =
  "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";

const TARGET_TYPES: AllocationTargetType[] = ["department", "laboratory", "staff"];

export function AllocationModal({
  institutionId, asset, onClose, onAllocated,
}: {
  institutionId: string;
  asset: Asset;
  onClose: () => void;
  onAllocated: (qty: number) => void;
}) {
  const [targets, setTargets] = useState<AllocationTargets | null>(null);
  const [targetType, setTargetType] = useState<AllocationTargetType>("laboratory");
  const [targetId, setTargetId] = useState("");
  const [qty, setQty] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avail = availableStock(asset);

  useEffect(() => {
    getAllocationTargets(institutionId).then((res) => { if (res.success) setTargets(res.data); });
  }, [institutionId]);

  const options =
    targetType === "department" ? targets?.departments ?? [] :
    targetType === "laboratory" ? targets?.laboratories ?? [] :
    targets?.staff ?? [];

  const submit = async () => {
    setSaving(true); setError(null);
    const q = parseInt(qty, 10) || 0;
    const res = await allocateAsset({ institutionId, assetId: asset.id, targetType, targetId, qty: q });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    onAllocated(q);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">Allocate — {asset.name}</h2>
            <p className="text-[11px] text-slate-400">{avail} {asset.unit} available</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Allocate to</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TARGET_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTargetType(t); setTargetId(""); }}
                  className={`px-2 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${
                    targetType === t
                      ? "bg-purple-600 text-white border-purple-700"
                      : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {ALLOCATION_TARGET_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{ALLOCATION_TARGET_LABELS[targetType]}</label>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Quantity ({asset.unit})</label>
            <input type="number" min={1} max={avail} value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !targetId || avail === 0 || (parseInt(qty, 10) || 0) <= 0}
            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? "Allocating…" : "Allocate"}
          </button>
        </div>
      </div>
    </div>
  );
}
