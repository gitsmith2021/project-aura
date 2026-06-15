import { BookOpen } from "lucide-react";
import { calculateFine, lendingStatus, FINE_PER_DAY, type LibraryLending } from "@/lib/library";

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const STATUS_CLS: Record<string, string> = {
  issued: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  overdue: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  returned: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  lost: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};

/** Read-only "my borrowed books" list for the staff & student portals. */
export function MyLibraryList({ lendings }: { lendings: LibraryLending[] }) {
  if (lendings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-14 text-slate-400 dark:text-slate-500">
        <BookOpen size={28} className="opacity-30" />
        <p className="text-xs">You have no library books on record.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {lendings.map((l) => {
        const status = lendingStatus(l);
        const fine = l.returned_date ? l.fine_amount : calculateFine(l.due_date, null, FINE_PER_DAY);
        return (
          <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm shadow-sm px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{l.library_books?.title ?? "—"}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {l.library_books?.author ?? ""} · due {fmt(l.due_date)}
                {l.returned_date ? ` · returned ${fmt(l.returned_date)}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {fine > 0 && <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{inr(fine)}</span>}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${STATUS_CLS[status]}`}>{status}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
