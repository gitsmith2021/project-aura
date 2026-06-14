// Phase 4A — Library domain model + pure helpers (unit-testable).

/** Default overdue fine, ₹ per day. Institution-configurable later. */
export const FINE_PER_DAY = 2;

/** Default loan period in days when issuing a book. */
export const DEFAULT_LOAN_DAYS = 14;

export type LibraryBook = {
  id: string;
  institution_id: string;
  department_id: string | null;
  title: string;
  author: string;
  isbn: string | null;
  category: string;
  total_copies: number;
  available_copies: number;
  published_year: number | null;
  publisher: string | null;
  created_at: string;
  departments?: { name: string } | null;
};

export type LendingStatus = "issued" | "returned" | "overdue" | "lost";

export type LibraryLending = {
  id: string;
  institution_id: string;
  book_id: string;
  borrower_id: string;
  borrower_type: "student" | "staff";
  issued_date: string;
  due_date: string;
  returned_date: string | null;
  fine_amount: number;
  status: LendingStatus;
  library_books?: { title: string; author: string } | null;
};

const MS_PER_DAY = 86_400_000;
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Whole days a loan is past its due date (0 if not overdue). `asOf` defaults to now. */
export function daysOverdue(dueDate: string, asOf: Date = new Date()): number {
  const due = dayStart(new Date(`${dueDate}T00:00:00`));
  const ref = dayStart(asOf);
  if (ref <= due) return 0;
  return Math.round((ref - due) / MS_PER_DAY);
}

/** Fine for a loan. If returned, measured to the return date; else to `asOf`. */
export function calculateFine(
  dueDate: string,
  returnedDate: string | null,
  ratePerDay: number = FINE_PER_DAY,
  asOf: Date = new Date()
): number {
  const endRef = returnedDate ? new Date(`${returnedDate}T00:00:00`) : asOf;
  return daysOverdue(dueDate, endRef) * ratePerDay;
}

/** Live status of a lending row (a stored "issued" row is "overdue" once past due). */
export function lendingStatus(
  l: { returned_date: string | null; status: LendingStatus; due_date: string },
  asOf: Date = new Date()
): LendingStatus {
  if (l.returned_date || l.status === "returned") return "returned";
  if (l.status === "lost") return "lost";
  return daysOverdue(l.due_date, asOf) > 0 ? "overdue" : "issued";
}

export function isAvailable(book: { available_copies: number }): boolean {
  return book.available_copies > 0;
}

export function availabilityLabel(available: number, total: number): string {
  return `${Math.max(0, available)} / ${total} available`;
}

/** Local YYYY-MM-DD `n` days from `from` (default today), for a due date.
 *  Uses local date parts (not toISOString) so the date doesn't shift by timezone. */
export function addDays(days: number, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
