"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { venueColorIndex } from "@/lib/venueBookings";
import type { BookingWithBooker } from "@/actions/venueBookings";

// Visible time window + row height (px per hour).
const START_HOUR = 6;
const END_HOUR = 23;
const HOURS = END_HOUR - START_HOUR;
const ROW = 46;
const GRID_H = HOURS * ROW;

const VENUE_COLOR = [
  "bg-violet-500 border-violet-700",
  "bg-emerald-500 border-emerald-700",
  "bg-amber-500 border-amber-700",
  "bg-rose-500 border-rose-700",
  "bg-blue-500 border-blue-700",
  "bg-teal-500 border-teal-700",
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - dow);
  return x;
}
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const fmtHour = (h: number) => {
  const am = h < 12 || h === 24;
  const hr = h % 12 || 12;
  return `${hr} ${am ? "am" : "pm"}`;
};
const fmtTime = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

type Block = { b: BookingWithBooker; top: number; height: number; lane: number; lanes: number; startD: Date; endD: Date };

/** Lay out a day's bookings into the time grid with simple lane-packing for overlaps. */
function layoutDay(dayStart: Date, bookings: BookingWithBooker[]): Block[] {
  const winStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), START_HOUR);
  const winEnd = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), END_HOUR);
  const winStartMs = winStart.getTime();
  const winMins = HOURS * 60;

  const segs = bookings
    .map((b) => {
      const s = new Date(b.start_datetime);
      const e = new Date(b.end_datetime);
      const segS = Math.max(s.getTime(), winStartMs);
      const segE = Math.min(e.getTime(), winEnd.getTime());
      return { b, s, e, segS, segE };
    })
    .filter((x) => x.segE > x.segS)
    .sort((a, b) => a.segS - b.segS);

  // greedy lane assignment
  const laneEnds: number[] = [];
  const withLane = segs.map((x) => {
    let lane = laneEnds.findIndex((end) => end <= x.segS);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(x.segE); }
    else laneEnds[lane] = x.segE;
    return { ...x, lane };
  });
  const lanes = Math.max(1, laneEnds.length);

  return withLane.map((x) => ({
    b: x.b,
    startD: x.s,
    endD: x.e,
    lane: x.lane,
    lanes,
    top: ((x.segS - winStartMs) / 60000 / winMins) * GRID_H,
    height: Math.max(16, ((x.segE - x.segS) / 60000 / winMins) * GRID_H),
  }));
}

export function WeekCalendar({ bookings }: { bookings: BookingWithBooker[] }) {
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const weekStart = useMemo(() => addDays(startOfWeek(now), offset * 7), [offset]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = addDays(weekStart, 7);

  // bookings intersecting the visible week
  const weekBookings = useMemo(
    () => bookings.filter((b) => new Date(b.end_datetime) > weekStart && new Date(b.start_datetime) < weekEnd),
    [bookings, weekStart] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const rangeLabel = `${weekStart.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${addDays(weekStart, 6).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 h-12 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setOffset((o) => o - 1)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft size={16} /></button>
          <button type="button" onClick={() => setOffset(0)} className="px-2.5 py-1 text-xs font-semibold rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Today</button>
          <button type="button" onClick={() => setOffset((o) => o + 1)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight size={16} /></button>
        </div>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{rangeLabel}</span>
      </div>

      {/* Day header row */}
      <div className="grid border-b border-slate-200 dark:border-slate-700" style={{ gridTemplateColumns: `48px repeat(7, 1fr)` }}>
        <div className="border-r border-slate-200 dark:border-slate-700" />
        {days.map((d, i) => {
          const today = sameDay(d, now);
          return (
            <div key={i} className={`text-center py-1.5 border-r border-slate-100 dark:border-slate-800 ${today ? "bg-violet-50 dark:bg-violet-950/20" : ""}`}>
              <div className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">{DAY_LABELS[i]}</div>
              <div className={`text-sm font-bold ${today ? "text-violet-600 dark:text-violet-400" : "text-slate-700 dark:text-slate-200"}`}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: "62vh" }}>
        <div className="grid relative" style={{ gridTemplateColumns: `48px repeat(7, 1fr)`, height: GRID_H }}>
          {/* hour gutter */}
          <div className="relative border-r border-slate-200 dark:border-slate-700">
            {Array.from({ length: HOURS }, (_, h) => (
              <div key={h} className="absolute right-1 -translate-y-1/2 text-[9px] text-slate-400 dark:text-slate-500" style={{ top: h * ROW }}>
                {fmtHour(START_HOUR + h)}
              </div>
            ))}
          </div>

          {/* day columns */}
          {days.map((d, i) => {
            const blocks = layoutDay(d, weekBookings);
            const today = sameDay(d, now);
            return (
              <div key={i} className={`relative border-r border-slate-100 dark:border-slate-800 ${today ? "bg-violet-50/40 dark:bg-violet-950/10" : ""}`}>
                {/* hour lines */}
                {Array.from({ length: HOURS }, (_, h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-slate-100 dark:border-slate-800/70" style={{ top: h * ROW }} />
                ))}
                {/* event blocks */}
                {blocks.map((bl, idx) => {
                  const color = VENUE_COLOR[venueColorIndex(bl.b.venue_id)];
                  const w = 100 / bl.lanes;
                  const pending = bl.b.status === "pending";
                  return (
                    <div
                      key={idx}
                      title={`${bl.b.event_title}\n${bl.b.venues?.name ?? ""}\n${fmtTime(bl.startD)}–${fmtTime(bl.endD)} · ${bl.b.booker_name} · ${bl.b.status}`}
                      className={`absolute rounded-md border-l-2 px-1.5 py-0.5 overflow-hidden text-white shadow-sm ${color} ${pending ? "opacity-70 [background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.18)_4px,rgba(255,255,255,0.18)_8px)]" : ""}`}
                      style={{ top: bl.top + 1, height: bl.height - 2, left: `calc(${bl.lane * w}% + 2px)`, width: `calc(${w}% - 4px)` }}
                    >
                      <div className="text-[10px] font-semibold leading-tight truncate">{bl.b.event_title}</div>
                      <div className="text-[9px] leading-tight truncate opacity-90">{fmtTime(bl.startD)} · {bl.b.venues?.name ?? ""}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-2 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Approved</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 opacity-70 [background-image:repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,255,255,0.4)_3px,rgba(255,255,255,0.4)_6px)]" /> Pending</span>
        <span className="ml-auto">Colour = venue</span>
      </div>
    </div>
  );
}
