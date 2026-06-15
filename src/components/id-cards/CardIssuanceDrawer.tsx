"use client";

import { useEffect, useState } from "react";
import { X, Search, Nfc, Check, Loader2 } from "lucide-react";
import { searchCardHolders, issueCard, type CardHolder } from "@/actions/smartCards";
import { isValidUid, HOLDER_TYPE_LABELS, type SmartCard, type HolderType } from "@/lib/smartCards";

const inputCls =
  "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";

export function CardIssuanceDrawer({ institutionId, onClose, onIssued }: {
  institutionId: string;
  onClose: () => void;
  onIssued: (card: SmartCard) => void;
}) {
  const [holderType, setHolderType] = useState<HolderType>("student");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardHolder[]>([]);
  const [searching, setSearching] = useState(false);
  const [holder, setHolder] = useState<CardHolder | null>(null);
  const [cardUid, setCardUid] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // debounced holder search
  useEffect(() => {
    if (holder) return;
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    let active = true;
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await searchCardHolders(institutionId, q, holderType);
      if (!active) return;
      setResults(res.success ? res.data : []);
      setSearching(false);
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [query, holderType, holder, institutionId]);

  const submit = async () => {
    if (!holder) return;
    setSaving(true); setError(null);
    const res = await issueCard({ institutionId, cardUid, holderType, holderId: holder.id, notes: notes || null });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    onIssued(res.data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <aside className="relative h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Issue Smart Card</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {/* Holder type toggle */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Holder type</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["student", "staff"] as HolderType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setHolderType(t); setHolder(null); setQuery(""); setResults([]); }}
                  className={`px-2 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${
                    holderType === t ? "bg-purple-600 text-white border-purple-700" : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {HOLDER_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Holder search / selection */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Holder</label>
            {holder ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{holder.name}</p>
                  {holder.sub && <p className="text-[10px] text-slate-400">{holder.sub}</p>}
                </div>
                <button type="button" onClick={() => setHolder(null)} className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline shrink-0">Change</button>
              </div>
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 text-slate-400 w-3.5 h-3.5" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${holderType} by name…`} className={`${inputCls} pl-8`} />
                {searching && <Loader2 size={13} className="absolute right-2.5 top-2.5 animate-spin text-slate-400" />}
                {results.length > 0 && (
                  <div className="mt-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 max-h-48 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800">
                    {results.map((r) => (
                      <button key={r.id} type="button" onClick={() => { setHolder(r); setResults([]); setQuery(""); }} className="w-full text-left px-3 py-2 hover:bg-purple-50/50 dark:hover:bg-purple-950/20">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{r.name}</p>
                        {r.sub && <p className="text-[10px] text-slate-400">{r.sub}</p>}
                      </button>
                    ))}
                  </div>
                )}
                {query.trim().length >= 2 && !searching && results.length === 0 && (
                  <p className="mt-1 text-[11px] text-slate-400">No {holderType}s without an active card match that.</p>
                )}
              </div>
            )}
          </div>

          {/* Card UID */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">NFC card UID</label>
            <div className="relative">
              <Nfc className="pointer-events-none absolute left-2.5 top-2.5 text-slate-400 w-3.5 h-3.5" />
              <input value={cardUid} onChange={(e) => setCardUid(e.target.value)} placeholder="Scan or type UID (hex)" className={`${inputCls} pl-8 font-mono`} />
            </div>
            {cardUid && !isValidUid(cardUid) && <p className="mt-1 text-[11px] text-amber-600">UID should be hex, at least 4 characters.</p>}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
          <button type="button" onClick={submit} disabled={saving || !holder || !isValidUid(cardUid)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Issue card
          </button>
        </div>
      </aside>
    </div>
  );
}
