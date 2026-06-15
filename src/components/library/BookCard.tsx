import { BookOpen, ArrowRightLeft } from "lucide-react";
import { availabilityLabel, isAvailable, type LibraryBook } from "@/lib/library";

export function BookCard({ book, onIssue }: { book: LibraryBook; onIssue?: (book: LibraryBook) => void }) {
  const available = isAvailable(book);
  return (
    <article className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/50 flex items-center justify-center">
          <BookOpen size={18} className="text-violet-600 dark:text-violet-400" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">{book.title}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{book.author}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{book.category}</span>
            {book.departments?.name && (
              <span className="text-[9px] text-slate-400 dark:text-slate-500">{book.departments.name}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <span className={`text-[11px] font-semibold ${available ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
          {availabilityLabel(book.available_copies, book.total_copies)}
        </span>
        {onIssue && (
          <button
            type="button"
            disabled={!available}
            onClick={() => onIssue(book)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowRightLeft size={12} /> Issue
          </button>
        )}
      </div>
    </article>
  );
}
