"use client";

import { Calendar, MapPin, Users } from "lucide-react";
import {
  EVENT_TYPE_LABEL,
  eventTypeBadgeClass,
  budgetStatus,
  budgetBarWidth,
  budgetStatusClass,
  formatBudget,
  isToday,
  type CampusEventType,
} from "@/lib/campusEvents";

type Props = {
  id: string;
  title: string;
  eventType: CampusEventType;
  eventDate: string;
  venue: string | null;
  participantCount: number;
  budgetAllocated: number | null;
  actualSpend: number;
  onClick?: () => void;
};

const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

export function EventCard({
  title, eventType, eventDate, venue,
  participantCount, budgetAllocated, actualSpend, onClick,
}: Props) {
  const status = budgetStatus(budgetAllocated, actualSpend);
  const barWidth = budgetBarWidth(budgetAllocated, actualSpend);
  const today = isToday(eventDate);
  const upcoming = eventDate >= new Date().toISOString().slice(0, 10);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow space-y-3 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {today && (
            <span className="inline-block mb-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse">
              TODAY
            </span>
          )}
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
            {title}
          </p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${eventTypeBadgeClass(eventType)}`}>
          {EVENT_TYPE_LABEL[eventType]}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
        <span className={`flex items-center gap-1 font-medium ${upcoming ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}>
          <Calendar size={11} /> {fmtDate(eventDate)}
        </span>
        {venue && (
          <span className="flex items-center gap-1 truncate max-w-[140px]">
            <MapPin size={11} /> {venue}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users size={11} /> {participantCount} registered
        </span>
      </div>

      {/* Budget bar */}
      {budgetAllocated && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Budget</span>
            <span className={`font-semibold px-1.5 rounded ${budgetStatusClass(status)}`}>
              {formatBudget(actualSpend)} / {formatBudget(budgetAllocated)}
            </span>
          </div>
          <div className="w-full h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                status === "over" ? "bg-red-500" :
                status === "on_track" ? "bg-amber-400" :
                "bg-emerald-500"
              }`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
}
