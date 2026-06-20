"use client";

import { useState } from "react";
import { CalendarDays, Plus, Download, RefreshCw } from "lucide-react";
import { getCampusEvents, type CampusEvent, type StaffOption } from "@/actions/campusEvents";
import { computeEventStats, computeNaacEventsReport, sortEvents, formatBudget } from "@/lib/campusEvents";
import { EventCard } from "./EventCard";
import { EventDrawer } from "./EventDrawer";

type Props = {
  institutionId: string;
  initialEvents: CampusEvent[];
  staff: StaffOption[];
  academicYears: Array<{ id: string; label: string }>;
  onSelectEvent: (event: CampusEvent) => void;
};

export function EventsManager({ institutionId, initialEvents, staff, academicYears, onSelectEvent }: Props) {
  const [events, setEvents] = useState(initialEvents);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [showDrawer, setShowDrawer] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const sorted = sortEvents(events);
  const upcoming = sorted.filter((e) => e.event_date >= today);
  const past = sorted.filter((e) => e.event_date < today);
  const visible = tab === "upcoming" ? upcoming : past;

  const stats = computeEventStats(events);

  const refresh = async () => {
    const res = await getCampusEvents(institutionId);
    if (res.success) setEvents(res.data);
  };

  const handleNaacExport = () => {
    const report = computeNaacEventsReport(
      events.map((e) => ({ event_type: e.event_type, participantCount: e.participant_count ?? 0 }))
    );
    const csv = [
      "Event Type,Count,Total Participants",
      ...report.map((r) => `${r.label},${r.count},${r.totalParticipants}`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NAAC_Events_${new Date().getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    { label: "Total Events", value: stats.total },
    { label: "Upcoming", value: stats.upcoming },
    { label: "Total Budget", value: formatBudget(stats.totalBudgetAllocated) },
    { label: "Over Budget", value: stats.overBudgetCount, alert: stats.overBudgetCount > 0 },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Campus Events</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{stats.upcoming} upcoming · {stats.past} past</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            <Plus size={13} /> Create Event
          </button>
          <button
            onClick={handleNaacExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Download size={13} /> NAAC Export
          </button>
          <button onClick={refresh} className="p-1.5 text-slate-400 hover:text-slate-600 border border-slate-200 dark:border-slate-700 rounded-lg">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(({ label, value, alert }) => (
          <div
            key={label}
            className={`rounded-xl border p-4 ${
              alert
                ? "border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300"
                : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">{label}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-0">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors capitalize ${
              tab === t
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <CalendarDays size={13} /> {t} ({t === "upcoming" ? upcoming.length : past.length})
          </button>
        ))}
      </div>

      {/* Event grid */}
      {visible.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-xs">
          {tab === "upcoming"
            ? 'No upcoming events. Click "Create Event" to schedule one.'
            : "No past events recorded."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((e) => (
            <EventCard
              key={e.id}
              id={e.id}
              title={e.title}
              eventType={e.event_type}
              eventDate={e.event_date}
              venue={e.venue}
              participantCount={e.participant_count ?? 0}
              budgetAllocated={e.budget_allocated}
              actualSpend={e.actual_spend}
              onClick={() => onSelectEvent(e)}
            />
          ))}
        </div>
      )}

      {showDrawer && (
        <EventDrawer
          institutionId={institutionId}
          staff={staff}
          academicYears={academicYears}
          onClose={() => setShowDrawer(false)}
          onSaved={async () => {
            setShowDrawer(false);
            await refresh();
          }}
        />
      )}
    </div>
  );
}
