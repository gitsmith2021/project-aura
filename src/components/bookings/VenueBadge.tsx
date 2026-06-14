import { venueTypeMeta, BOOKING_STATUS_LABEL, type BookingStatus } from "@/lib/venueBookings";

const TONE: Record<string, string> = {
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const STATUS_TONE: Record<BookingStatus, string> = {
  pending: "amber", approved: "emerald", rejected: "rose", cancelled: "slate",
};

export function VenueBadge({ type }: { type: string }) {
  const meta = venueTypeMeta(type);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${TONE[meta.tone] ?? TONE.slate}`}>
      {meta.label}
    </span>
  );
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${TONE[STATUS_TONE[status]]}`}>
      {BOOKING_STATUS_LABEL[status]}
    </span>
  );
}
