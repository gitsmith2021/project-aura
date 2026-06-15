"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Nfc, GraduationCap, Users, AlertTriangle, Ban, RefreshCw, X } from "lucide-react";
import { reportLost, deactivateCard, replaceCard } from "@/actions/smartCards";
import {
  CARD_STATUS_COLORS, CARD_STATUS_LABELS, HOLDER_TYPE_LABELS, cardStats, isValidUid, normaliseUid,
  type SmartCard, type CardStatus,
} from "@/lib/smartCards";
import { CardIssuanceDrawer } from "./CardIssuanceDrawer";

const STATUS_FILTERS: (CardStatus | "")[] = ["", "active", "lost", "deactivated", "replaced"];

export function SmartCardsManager({ institutionId, initial }: { institutionId: string; initial: SmartCard[] }) {
  const [cards, setCards] = useState<SmartCard[]>(initial);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CardStatus | "">("");
  const [holderFilter, setHolderFilter] = useState("");
  const [issueOpen, setIssueOpen] = useState(false);
  const [replaceFor, setReplaceFor] = useState<SmartCard | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => cardStats(cards), [cards]);

  const filtered = useMemo(() => {
    const q = normaliseUid(search);
    return cards.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (holderFilter && c.holder_type !== holderFilter) return false;
      if (!q) return true;
      return c.card_uid.includes(q) || (c.holder_name ?? "").toUpperCase().includes(search.trim().toUpperCase());
    });
  }, [cards, search, statusFilter, holderFilter]);

  const patchCard = (id: string, patch: Partial<SmartCard>) =>
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const doLost = async (c: SmartCard) => {
    setBusy(c.id); setError(null);
    const res = await reportLost(institutionId, c.id);
    setBusy(null);
    if (!res.success) { setError(res.error); return; }
    patchCard(c.id, { status: "lost" });
  };
  const doDeactivate = async (c: SmartCard) => {
    setBusy(c.id); setError(null);
    const res = await deactivateCard(institutionId, c.id);
    setBusy(null);
    if (!res.success) { setError(res.error); return; }
    patchCard(c.id, { status: "deactivated" });
  };

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Smart ID Cards</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">NFC card registry — issue, replace, and deactivate cards. Lost/deactivated cards are rejected at the attendance reader.</p>
        </div>
        <button type="button" onClick={() => setIssueOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 border border-purple-700">
          <Plus size={14} strokeWidth={2.5} /> Issue Card
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Stat label="Total issued" value={stats.total} tone="slate" />
        <Stat label="Active" value={stats.active} tone="emerald" />
        <Stat label="Lost" value={stats.lost} tone="rose" />
        <Stat label="Deactivated" value={stats.deactivated} tone="slate" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search UID or holder…" className="h-8 w-full pl-8 pr-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 dark:text-slate-100" />
        </div>
        <select value={holderFilter} onChange={(e) => setHolderFilter(e.target.value)} className="h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200">
          <option value="">All holders</option>
          <option value="student">Students</option>
          <option value="staff">Staff</option>
        </select>
        {STATUS_FILTERS.map((s) => (
          <button key={s || "all"} type="button" onClick={() => setStatusFilter(s)} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
            statusFilter === s ? "bg-purple-600 text-white border-purple-700" : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}>{s ? CARD_STATUS_LABELS[s] : "All"}</button>
        ))}
        <span className="text-[11px] text-slate-400 ml-auto">{filtered.length} of {cards.length}</span>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2 mb-3">{error}</p>}

      {filtered.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-16">No cards found.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-2.5 font-semibold">Holder</th>
                <th className="px-3 py-2.5 font-semibold">Card UID</th>
                <th className="px-3 py-2.5 font-semibold">Issued</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        {c.holder_type === "student" ? <GraduationCap size={14} className="text-slate-500" /> : <Users size={14} className="text-slate-500" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{c.holder_name}</p>
                        <p className="text-[10px] text-slate-400">{HOLDER_TYPE_LABELS[c.holder_type]}{c.holder_sub ? ` · ${c.holder_sub}` : ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-600 dark:text-slate-300">{c.card_uid}</td>
                  <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{c.issued_date}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${CARD_STATUS_COLORS[c.status]}`}>{CARD_STATUS_LABELS[c.status]}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {c.status === "active" ? (
                      <div className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => doLost(c)} disabled={busy === c.id} title="Report lost" className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-40"><AlertTriangle size={14} /></button>
                        <button type="button" onClick={() => doDeactivate(c)} disabled={busy === c.id} title="Deactivate" className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"><Ban size={14} /></button>
                        <button type="button" onClick={() => setReplaceFor(c)} title="Replace" className="p-1.5 rounded-md text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"><RefreshCw size={14} /></button>
                      </div>
                    ) : c.status === "lost" || c.status === "deactivated" ? (
                      <button type="button" onClick={() => setReplaceFor(c)} className="px-2 py-1 text-[11px] font-semibold rounded-md border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30">Replace</button>
                    ) : (
                      <span className="text-[11px] text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {issueOpen && (
        <CardIssuanceDrawer
          institutionId={institutionId}
          onClose={() => setIssueOpen(false)}
          onIssued={(card) => setCards((prev) => [card, ...prev])}
        />
      )}

      {replaceFor && (
        <ReplaceModal
          institutionId={institutionId}
          card={replaceFor}
          onClose={() => setReplaceFor(null)}
          onReplaced={(newCard, oldId) => {
            setCards((prev) => [newCard, ...prev.map((c) => (c.id === oldId ? { ...c, status: "replaced" as const, replaced_by: newCard.id } : c))]);
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "slate" | "emerald" | "rose" }) {
  const color = tone === "emerald" ? "text-emerald-600 dark:text-emerald-400" : tone === "rose" ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100";
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
      <p className={`text-base font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function ReplaceModal({ institutionId, card, onClose, onReplaced }: {
  institutionId: string; card: SmartCard; onClose: () => void; onReplaced: (newCard: SmartCard, oldId: string) => void;
}) {
  const [uid, setUid] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setError(null);
    const res = await replaceCard({ institutionId, oldCardId: card.id, newCardUid: uid, notes: notes || null });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    onReplaced(res.data, card.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">Replace card — {card.holder_name}</h2>
            <p className="text-[11px] text-slate-400 font-mono">old: {card.card_uid}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">New card UID</label>
            <div className="relative">
              <Nfc className="pointer-events-none absolute left-2.5 top-2.5 text-slate-400 w-3.5 h-3.5" />
              <input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="Scan or type UID" className="w-full h-9 pl-8 pr-2.5 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500" />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
          <button type="button" onClick={submit} disabled={saving || !isValidUid(uid)} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Replacing…" : "Replace"}</button>
        </div>
      </div>
    </div>
  );
}
