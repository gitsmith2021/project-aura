"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, X, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { addBook, type BookInput } from "@/actions/library";
import { isAvailable, type LibraryBook } from "@/lib/library";
import { BookCard } from "./BookCard";
import { LendingDrawer } from "./LendingDrawer";

type Dept = { id: string; name: string };

const inputCls =
  "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";

export function LibraryManager({
  institutionId, initial, departments,
}: {
  institutionId: string;
  initial: LibraryBook[];
  departments: Dept[];
}) {
  const [books, setBooks] = useState<LibraryBook[]>(initial);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [issueFor, setIssueFor] = useState<LibraryBook | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // add-book form
  const [f, setF] = useState({ title: "", author: "", category: "", isbn: "", department_id: "", total_copies: "1", publisher: "", published_year: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(books.map((b) => b.category).filter(Boolean))).sort(),
    [books]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return books.filter((b) => {
      if (category && b.category !== category) return false;
      if (availableOnly && !isAvailable(b)) return false;
      if (!q) return true;
      return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || (b.isbn ?? "").toLowerCase().includes(q);
    });
  }, [books, search, category, availableOnly]);

  const submitAdd = async () => {
    setSaving(true);
    setError(null);
    const payload: BookInput = {
      institution_id: institutionId,
      title: f.title, author: f.author, category: f.category,
      isbn: f.isbn || null, department_id: f.department_id || null,
      total_copies: parseInt(f.total_copies, 10) || 1,
      publisher: f.publisher || null,
      published_year: f.published_year ? parseInt(f.published_year, 10) : null,
    };
    const res = await addBook(payload);
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    setBooks((prev) => [res.data, ...prev]);
    setF({ title: "", author: "", category: "", isbn: "", department_id: "", total_copies: "1", publisher: "", published_year: "" });
    setAddOpen(false);
  };

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Library</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Catalog, issue &amp; return books, and track overdue fines.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/institutions/${institutionId}/library/lend`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            <ArrowRightLeft size={14} /> Issued / Return
          </Link>
          <Link href={`/institutions/${institutionId}/library/overdue`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30">
            <AlertTriangle size={14} /> Overdue
          </Link>
          <button type="button" onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 border border-purple-700">
            <Plus size={14} strokeWidth={2.5} /> Add Book
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, author or ISBN…" className="h-8 w-full pl-8 pr-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 dark:text-slate-100" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} className="rounded border-slate-300" />
          Available only
        </label>
        <span className="text-[11px] text-slate-400 ml-auto">{filtered.length} of {books.length}</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-16">No books found. Add the first one.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((b) => <BookCard key={b.id} book={b} onIssue={setIssueFor} />)}
        </div>
      )}

      {issueFor && (
        <LendingDrawer
          institutionId={institutionId}
          book={issueFor}
          onClose={() => setIssueFor(null)}
          onIssued={() => setBooks((prev) => prev.map((b) => (b.id === issueFor.id ? { ...b, available_copies: b.available_copies - 1 } : b)))}
        />
      )}

      {addOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setAddOpen(false)} />
          <aside className="relative h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Add Book</h2>
              <button type="button" onClick={() => setAddOpen(false)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              <Field label="Title"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputCls} /></Field>
              <Field label="Author"><input value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} className={inputCls} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category"><input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={inputCls} placeholder="e.g. Physics" /></Field>
                <Field label="ISBN (optional)"><input value={f.isbn} onChange={(e) => setF({ ...f, isbn: e.target.value })} className={inputCls} /></Field>
              </div>
              <Field label="Department (optional)">
                <select value={f.department_id} onChange={(e) => setF({ ...f, department_id: e.target.value })} className={inputCls}>
                  <option value="">None</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Total copies"><input type="number" min={1} value={f.total_copies} onChange={(e) => setF({ ...f, total_copies: e.target.value })} className={inputCls} /></Field>
                <Field label="Published year (optional)"><input type="number" value={f.published_year} onChange={(e) => setF({ ...f, published_year: e.target.value })} className={inputCls} /></Field>
              </div>
              <Field label="Publisher (optional)"><input value={f.publisher} onChange={(e) => setF({ ...f, publisher: e.target.value })} className={inputCls} /></Field>
              {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setAddOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
              <button type="button" onClick={submitAdd} disabled={saving || !f.title.trim() || !f.author.trim() || !f.category.trim()} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Adding…" : "Add book"}</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
