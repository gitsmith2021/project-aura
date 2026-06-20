"use client";

import React, { useState, useMemo } from "react";
import { AcademicEvent, EventType } from "@/actions/academicCalendar";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Edit2,
  Trash2,
  Lock,
  Globe,
  Plus,
  Calendar as CalendarIcon,
} from "lucide-react";

interface AcademicCalendarProps {
  events: AcademicEvent[];
  isAdmin: boolean;
  onEditEvent?: (event: AcademicEvent) => void;
  onDeleteEvent?: (id: string) => void;
  onAddEvent?: () => void;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AcademicCalendar({
  events,
  isAdmin,
  onEditEvent,
  onDeleteEvent,
  onAddEvent,
}: AcademicCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<"grid" | "list">("grid");
  const [filterType, setFilterType] = useState<string>("all");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Helper to determine event style
  const getEventStyles = (type: EventType) => {
    switch (type) {
      case "semester_start":
      case "semester_end":
        return {
          bg: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
          hex: "#8B5CF6",
        };
      case "exam_window":
        return {
          bg: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
          hex: "#F43F5E",
        };
      case "holiday":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
          hex: "#10B981",
        };
      case "annual_day":
      case "sports_day":
      case "cultural":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
          hex: "#D97706",
        };
      case "expo":
        return {
          bg: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
          hex: "#0891B2",
        };
      default:
        return {
          bg: "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-700",
          hex: "#64748B",
        };
    }
  };

  // Calculate calendar days
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells = [];

    // Pre-padding (previous month's ending days)
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i),
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      cells.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      });
    }

    // Post-padding (next month's beginning days)
    const remainingCells = 42 - cells.length; // standard 6 rows
    for (let i = 1; i <= remainingCells; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }

    return cells;
  }, [year, month]);

  // Format date to ISO string for comparison (YYYY-MM-DD)
  const toISODateString = (d: Date) => {
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60 * 1000);
    return local.toISOString().split("T")[0];
  };

  // Map events to date keys
  const eventsByDate = useMemo(() => {
    const mapping: Record<string, AcademicEvent[]> = {};

    events.forEach((event) => {
      // Create date range array
      const start = new Date(event.start_date);
      const end = new Date(event.end_date);

      const curr = new Date(start);
      while (curr <= end) {
        const dateKey = toISODateString(curr);
        if (!mapping[dateKey]) {
          mapping[dateKey] = [];
        }
        mapping[dateKey].push(event);
        curr.setDate(curr.getDate() + 1);
      }
    });

    return mapping;
  }, [events]);

  // Filtered events for list view
  const filteredEvents = useMemo(() => {
    let list = events;

    // Filter by selected month/year in calendar list view
    if (viewType === "list") {
      list = events.filter((e) => {
        const start = new Date(e.start_date);
        const end = new Date(e.end_date);
        return (
          (start.getFullYear() === year && start.getMonth() === month) ||
          (end.getFullYear() === year && end.getMonth() === month)
        );
      });
    }

    if (filterType !== "all") {
      list = list.filter((e) => e.event_type === filterType);
    }

    return list;
  }, [events, year, month, viewType, filterType]);

  const eventTypes: { value: string; label: string }[] = [
    { value: "all", label: "All Events" },
    { value: "semester_start", label: "Semester Start" },
    { value: "semester_end", label: "Semester End" },
    { value: "exam_window", label: "Exams" },
    { value: "holiday", label: "Holidays" },
    { value: "annual_day", label: "Annual Day" },
    { value: "sports_day", label: "Sports Day" },
    { value: "cultural", label: "Cultural" },
    { value: "expo", label: "Expo" },
    { value: "other", label: "Other" },
  ];

  const formatEventLabel = (type: EventType) => {
    return type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const getPublicBadge = (isPublic: boolean) => {
    return isPublic ? (
      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded">
        <Globe size={10} /> Public
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200/50 dark:border-amber-900/30">
        <Lock size={10} /> Internal
      </span>
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Calendar Toolbar */}
      <div className="bg-white/70 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-100 dark:border-slate-700 p-4 rounded-xl mb-4 shadow-[0_1px_6px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shrink-0">
        
        {/* Left Side: Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>
          
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 min-w-[120px] text-center">
            {MONTHS[month]} {year}
          </h2>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 transition-colors"
            title="Next Month"
          >
            <ChevronRight size={16} />
          </button>

          <button
            onClick={handleToday}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Right Side: Filters, Views, and Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors text-slate-800 dark:text-slate-200"
          >
            {eventTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* View Toggle */}
          <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 flex">
            <button
              onClick={() => setViewType("grid")}
              className={`p-1.5 rounded-md transition-colors ${
                viewType === "grid"
                  ? "bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title="Grid View"
            >
              <CalendarDays size={14} />
            </button>
            <button
              onClick={() => setViewType("list")}
              className={`p-1.5 rounded-md transition-colors ${
                viewType === "list"
                  ? "bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title="List View"
            >
              <List size={14} />
            </button>
          </div>

          {/* Add Event (Admin only) */}
          {isAdmin && onAddEvent && (
            <button
              onClick={onAddEvent}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
            >
              <Plus size={14} strokeWidth={2.5} />
              Add Event
            </button>
          )}
        </div>
      </div>

      {/* Calendar Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 bg-white/40 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-[inset_0_1px_3px_rgba(0,0,0,0.01)]">
        {viewType === "grid" ? (
          <div className="h-full flex flex-col min-h-[500px]">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 border-b border-slate-100 dark:border-slate-800 pb-2 mb-1 shrink-0 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Monthly grid */}
            <div className="grid grid-cols-7 gap-1.5 flex-1 select-none">
              {calendarCells.map((cell, idx) => {
                const dateKey = toISODateString(cell.date);
                const cellEvents = eventsByDate[dateKey] || [];
                const filteredCellEvents =
                  filterType === "all"
                    ? cellEvents
                    : cellEvents.filter((e) => e.event_type === filterType);

                const isToday =
                  toISODateString(new Date()) === dateKey;

                return (
                  <div
                    key={`${cell.day}-${idx}`}
                    className={`min-h-[75px] rounded-lg p-1.5 border flex flex-col justify-between transition-all relative ${
                      cell.isCurrentMonth
                        ? "bg-white/80 dark:bg-slate-800/80 border-slate-100 dark:border-slate-750"
                        : "bg-slate-50/50 dark:bg-slate-900/40 border-transparent text-slate-400"
                    } ${
                      isToday
                        ? "ring-1 ring-purple-500 ring-offset-0 border-purple-200 dark:border-purple-800 shadow-[0_0_8px_rgba(168,85,247,0.15)]"
                        : ""
                    }`}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          isToday
                            ? "bg-purple-600 text-white"
                            : cell.isCurrentMonth
                            ? "text-slate-700 dark:text-slate-200"
                            : "text-slate-400"
                        }`}
                      >
                        {cell.day}
                      </span>
                    </div>

                    {/* Events list in cell */}
                    <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto max-h-[70px] custom-scrollbar">
                      {filteredCellEvents.map((e) => {
                        const styles = getEventStyles(e.event_type);
                        return (
                          <div
                            key={e.id}
                            className={`text-[9px] font-semibold px-1 py-0.5 rounded border truncate cursor-pointer hover:opacity-85 ${styles.bg}`}
                            title={`${e.title} (${formatEventLabel(e.event_type)})`}
                            onClick={() => onEditEvent && onEditEvent(e)}
                          >
                            {e.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="space-y-3 pb-6">
            {filteredEvents.length > 0 ? (
              <div className="divide-y divide-slate-100/80 dark:divide-slate-700">
                {filteredEvents.map((e) => {
                  const styles = getEventStyles(e.event_type);
                  return (
                    <div
                      key={e.id}
                      className="py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 px-3 rounded-lg transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Event type marker */}
                        <div
                          className="w-2.5 h-12 rounded-full shrink-0"
                          style={{ backgroundColor: styles.hex }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                              {e.title}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${styles.bg}`}>
                              {formatEventLabel(e.event_type)}
                            </span>
                            {getPublicBadge(e.is_public)}
                          </div>
                          {e.description && (
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                              {e.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[10px] font-semibold text-slate-400">
                            <CalendarIcon size={11} className="text-slate-350" />
                            <span>
                              {new Date(e.start_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            {e.start_date !== e.end_date && (
                              <>
                                <span>to</span>
                                <span>
                                  {new Date(e.end_date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                              </>
                            )}
                            {e.academic_year?.label && (
                              <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1 rounded">
                                AY: {e.academic_year.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Admin action controls */}
                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity self-end sm:self-auto">
                          {onEditEvent && (
                            <button
                              onClick={() => onEditEvent(e)}
                              className="p-1.5 text-slate-450 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-md transition-colors"
                              title="Edit Event"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {onDeleteEvent && (
                            <button
                              onClick={() => onDeleteEvent(e.id)}
                              className="p-1.5 text-slate-450 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-md transition-colors"
                              title="Delete Event"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center">
                <CalendarIcon size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  No events found.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Try clearing filters or switching the month.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
