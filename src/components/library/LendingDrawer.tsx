"use client";

import { useState } from "react";
import { X, Search, User } from "lucide-react";
import { searchBorrowers, issueBook, type Borrower } from "@/actions/library";
import { addDays, DEFAULT_LOAN_DAYS, type LibraryBook } from "@/lib/library";

export function LendingDrawer({
  institutionId, book, onClose, onIssued,
}: {
  institutionId: string;
  book: LibraryBook;
  onClose: () => void;
  onIssued: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Borrower[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Borrower | null>(null);
  const [dueDate, setDueDate] = useState(addDays(DEFAULT_LOAN_DAYS));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    const res = await searchBorrowers(institutionId, query);
    setSearching(false);
    if (res.success) setResults(res.data);
  };

  const submit = async () => {
    if (!picked) return;
    setSaving(true);
    setError(null);
    const res = await issueBook({
      institutionId, bookId: book.id, borrowerId: picked.id,
      borrowerType: picked.type, dueDate,
    });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    onIssued();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <aside className="relative h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Issue Book</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{book.title}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{book.author} · {book.available_copies} available</p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Borrower (staff or student with a login)</label>
            {picked ? (
              <div className="flex items-center justify-between rounded-md border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-3 py-2">
                <span className="text-xs text-slate-800 dark:text-slate-200">
                  <User size={12} className="inline mr-1" />{picked.name}
                  <span className="text-slate-400"> · {picked.type}{picked.sub ? ` · ${picked.sub}` : ""}</span>
                </span>
                <button type="button" onClick={() => setPicked(null)} className="text-[11px] text-violet-600 dark:text-violet-400 font-semibold">Change</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && runSearch()}
                      placeholder="Search by name…"
                      className="w-full h-9 pl-8 pr-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <button type="button" onClick={runSearch} className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">Search</button>
                </div>
                {searching && <p className="text-[11px] text-slate-400 mt-2">Searching…</p>}
                {results.length > 0 && (
                  <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-md divide-y divide-slate-100 dark:divide-slate-800 max-h-52 overflow-y-auto">
                    {results.map((b) => (
                      <button key={`${b.type}-${b.id}`} type="button" onClick={() => setPicked(b)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{b.name}</span>
                        <span className="text-slate-400"> · {b.type}{b.sub ? ` · ${b.sub}` : ""}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500" />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
          <button type="button" onClick={submit} disabled={!picked || saving} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">
            {saving ? "Issuing…" : "Issue book"}
          </button>
        </div>
      </aside>
    </div>
  );
}
