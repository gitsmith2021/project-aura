import { CalendarDays, Clock, MapPin, User } from "lucide-react";
import { dayKey, venueColorIndex } from "@/lib/venueBookings";
import type { BookingWithBooker } from "@/actions/venueBookings";
import { BookingStatusBadge } from "./VenueBadge";

// Venue dot colours (index from venueColorIndex)
const DOT = ["bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-blue-500", "bg-teal-500"];

const fmtDay = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
const fmtTime = (dt: string) => new Date(dt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

/** Upcoming-bookings agenda, grouped by day and colour-coded per venue. */
export function BookingCalendar({ bookings }: { bookings: BookingWithBooker[] }) {
  // group by local day
  const groups = new Map<string, BookingWithBooker[]>();
  for (const b of bookings) {
    const k = dayKey(b.start_datetime);
    const list = groups.get(k);
    if (list) list.push(b);
    else groups.set(k, [b]);
  }
  const days = Array.from(groups.keys()).sort();

  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-14 text-slate-400 dark:text-slate-500">
        <CalendarDays size={28} className="opacity-30" />
        <p className="text-xs">No upcoming bookings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {days.map((k) => (
        <div key={k}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">{fmtDay(k)}</p>
          <div className="space-y-2">
            {groups.get(k)!.map((b) => (
              <div key={b.id} className="flex items-start gap-3 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm shadow-sm px-4 py-3">
                <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${DOT[venueColorIndex(b.venue_id)]}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{b.event_title}</p>
                    <BookingStatusBadge status={b.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    <span className="inline-flex items-center gap-1"><Clock size={11} /> {fmtTime(b.start_datetime)}–{fmtTime(b.end_datetime)}</span>
                    <span className="inline-flex items-center gap-1"><MapPin size={11} /> {b.venues?.name ?? "—"}</span>
                    <span className="inline-flex items-center gap-1"><User size={11} /> {b.booker_name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
