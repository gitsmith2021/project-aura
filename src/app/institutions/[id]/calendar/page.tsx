"use client";

import React, { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Settings } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AcademicCalendar } from "@/components/calendar/AcademicCalendar";
import { EventDrawer } from "@/components/calendar/EventDrawer";
import { createClient } from "@/utils/supabase/client";
import {
  AcademicEvent,
  AcademicYear,
  getAcademicYears,
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  EventType,
} from "@/actions/academicCalendar";

export default function AdminCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const collegeId = resolvedParams.id;

  const [collegeName, setCollegeName] = useState("College Dashboard");
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("all");

  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AcademicEvent | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Fetch college name
    const { data: college } = await supabase
      .from("institutions")
      .select("name")
      .eq("id", collegeId)
      .single();
    if (college) {
      setCollegeName(college.name);
    }

    // Fetch Academic Years
    const yearsRes = await getAcademicYears(collegeId);
    if (yearsRes.success && yearsRes.data) {
      setAcademicYears(yearsRes.data);
      const currentYear = yearsRes.data.find((y) => y.is_current);
      if (currentYear) {
        setSelectedYearId(currentYear.id);
      }
    }

    // Fetch Calendar Events
    const eventsRes = await getCalendarEvents(collegeId);
    if (eventsRes.success && eventsRes.data) {
      setEvents(eventsRes.data);
    }

    setLoading(false);
  }, [collegeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle create/update event submission
  const handleEventSubmit = async (payload: {
    title: string;
    event_type: EventType;
    start_date: string;
    end_date: string;
    academic_year_id: string | null;
    description: string;
    is_public: boolean;
  }) => {
    let res;
    if (selectedEvent) {
      res = await updateCalendarEvent(selectedEvent.id, collegeId, payload);
    } else {
      res = await createCalendarEvent({
        ...payload,
        institution_id: collegeId,
      });
    }

    if (res.success) {
      await fetchData();
      return true;
    }
    return false;
  };

  // Handle delete event
  const handleEventDelete = async (id: string) => {
    const res = await deleteCalendarEvent(id, collegeId);
    if (res.success) {
      await fetchData();
      return true;
    }
    return false;
  };

  const filteredEvents = events.filter((e) => {
    if (selectedYearId === "all") return true;
    return e.academic_year_id === selectedYearId;
  });

  const breadcrumb = (
    <>
      <Link href="/" className="hover:text-slate-900 transition-colors">Command Center</Link>
      <span className="mx-2 text-slate-300">/</span>
      <Link href={`/institutions/${collegeId}`} className="hover:text-slate-900 transition-colors">
        {collegeName}
      </Link>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-900 font-semibold">Academic Calendar</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="px-6 pt-6 pb-6 w-full h-[calc(100vh-56px)] min-h-0 flex flex-col overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 shrink-0">
            <div>
              <Link
                href={`/institutions/${collegeId}`}
                className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-purple-600 mb-1 transition-colors uppercase tracking-wider font-semibold"
              >
                <ArrowLeft size={12} /> Back to College Dashboard
              </Link>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <CalendarDays size={22} className="text-purple-600" />
                Academic Calendar Manager
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/institutions/${collegeId}/calendar/years`}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
              >
                <Settings size={14} />
                Manage Academic Years
              </Link>
            </div>
          </div>

          {/* Filters Toolbar */}
          <div className="bg-white/70 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-100 dark:border-slate-700 p-3 rounded-xl mb-4 shadow-[0_1px_6px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <label htmlFor="year-filter" className="text-xs font-semibold text-slate-500">
                Academic Year Scope:
              </label>
              <select
                id="year-filter"
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors text-slate-800 dark:text-slate-200"
              >
                <option value="all">All / General Events</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.label} {ay.is_current ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              Showing {filteredEvents.length} calendar events
            </div>
          </div>

          {/* Main Grid View */}
          <div className="flex-1 min-h-0 flex flex-col">
            {loading ? (
              <div className="flex justify-center py-20 flex-1 items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <AcademicCalendar
                events={filteredEvents}
                isAdmin={true}
                onEditEvent={(event) => {
                  setSelectedEvent(event);
                  setDrawerOpen(true);
                }}
                onDeleteEvent={async (id) => {
                  await handleEventDelete(id);
                }}
                onAddEvent={() => {
                  setSelectedEvent(null);
                  setDrawerOpen(true);
                }}
              />
            )}
          </div>
        </div>
      </div>

      <EventDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedEvent(null);
        }}
        onSubmit={handleEventSubmit}
        onDelete={handleEventDelete}
        event={selectedEvent}
        academicYears={academicYears}
      />
    </DashboardLayout>
  );
}
