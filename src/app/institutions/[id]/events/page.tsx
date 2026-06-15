"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EventsManager } from "@/components/events/EventsManager";
import { EventDetail } from "@/components/events/EventDetail";
import {
  getCampusEvents,
  getEventParticipants,
  getStaffOptions,
  getAcademicYearOptions,
  type CampusEvent,
  type EventParticipant,
  type StaffOption,
} from "@/actions/campusEvents";
import { use } from "react";

type Props = { params: Promise<{ id: string }> };

export default function EventsPage({ params }: Props) {
  const { id } = use(params);

  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [academicYears, setAcademicYears] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedEvent, setSelectedEvent] = useState<CampusEvent | null>(null);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getCampusEvents(id),
      getStaffOptions(id),
      getAcademicYearOptions(id),
    ]).then(([er, sr, yr]) => {
      if (er.success) setEvents(er.data);
      if (sr.success) setStaff(sr.data);
      if (yr.success) setAcademicYears(yr.data);
      setLoading(false);
    });
  }, [id]);

  const handleSelectEvent = async (event: CampusEvent) => {
    setSelectedEvent(event);
    const pr = await getEventParticipants(event.id);
    setParticipants(pr.success ? pr.data : []);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="w-full px-6 py-6 flex items-center justify-center min-h-[200px]">
          <p className="text-xs text-slate-400 animate-pulse">Loading events…</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full px-6 py-6">
        {selectedEvent ? (
          <EventDetail
            event={selectedEvent}
            initialParticipants={participants}
            institutionId={id}
            staff={staff}
            academicYears={academicYears}
            onBack={() => setSelectedEvent(null)}
          />
        ) : (
          <EventsManager
            institutionId={id}
            initialEvents={events}
            staff={staff}
            academicYears={academicYears}
            onSelectEvent={handleSelectEvent}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
