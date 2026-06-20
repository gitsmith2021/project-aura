"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { AcademicEvent, EventType } from "@/actions/academicCalendar";

interface EventDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    event_type: EventType;
    start_date: string;
    end_date: string;
    academic_year_id: string | null;
    description: string;
    is_public: boolean;
  }) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
  event: AcademicEvent | null;
  academicYears: { id: string; label: string }[];
}

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "semester_start", label: "Semester Start" },
  { value: "semester_end", label: "Semester End" },
  { value: "exam_window", label: "Exam Window" },
  { value: "holiday", label: "Holiday" },
  { value: "annual_day", label: "Annual Day" },
  { value: "sports_day", label: "Sports Day" },
  { value: "expo", label: "Expo" },
  { value: "cultural", label: "Cultural" },
  { value: "other", label: "Other" },
];

export function EventDrawer({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  event,
  academicYears,
}: EventDrawerProps) {
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<EventType>("other");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (event) {
        setTitle(event.title);
        setEventType(event.event_type);
        setStartDate(event.start_date);
        setEndDate(event.end_date);
        setAcademicYearId(event.academic_year_id || "");
        setDescription(event.description || "");
        setIsPublic(event.is_public);
      } else {
        setTitle("");
        setEventType("other");
        setStartDate("");
        setEndDate("");
        setAcademicYearId(academicYears.find((ay) => ay.id === academicYearId)?.id || (academicYears[0]?.id ?? ""));
        setDescription("");
        setIsPublic(true);
      }
      setErrorMsg("");
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- (re)initialise the form only when the drawer opens or its event changes
  }, [isOpen, event, academicYears]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Please enter a title.");
      return;
    }
    if (!startDate) {
      setErrorMsg("Please enter a start date.");
      return;
    }
    if (!endDate) {
      setErrorMsg("Please enter an end date.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setErrorMsg("End date cannot be before start date.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const success = await onSubmit({
      title,
      event_type: eventType,
      start_date: startDate,
      end_date: endDate,
      academic_year_id: academicYearId || null,
      description,
      is_public: isPublic,
    });

    setLoading(false);

    if (success) {
      onClose();
    } else {
      setErrorMsg("Failed to save event. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;

    setDeleteLoading(true);
    const success = await onDelete(event.id);
    setDeleteLoading(false);

    if (success) {
      onClose();
    } else {
      setErrorMsg("Failed to delete event. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-sm h-full bg-white dark:bg-slate-800 flex flex-col border-l border-slate-200 dark:border-slate-700 shadow-2xl z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
              <CalendarIcon size={18} className="text-purple-600" />
              {event ? "Edit Event" : "Create Event"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {event ? "Modify existing academic calendar entry." : "Add a new calendar entry."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/40">
          {errorMsg && (
            <div className="mb-4 p-2.5 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-lg">
              {errorMsg}
            </div>
          )}

          <form id="event-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Title */}
            <div className="space-y-1">
              <label htmlFor="event_title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Event Title *
              </label>
              <input
                type="text"
                id="event_title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Midterm Exams, Sports Day"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Event Type */}
            <div className="space-y-1">
              <label htmlFor="event_type" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Event Type *
              </label>
              <select
                id="event_type"
                value={eventType}
                onChange={(e) => setEventType(e.target.value as EventType)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year */}
            <div className="space-y-1">
              <label htmlFor="event_academic_year" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Academic Year
              </label>
              <select
                id="event_academic_year"
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="">None / General</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="event_start_date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="event_start_date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="event_end_date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  End Date *
                </label>
                <input
                  type="date"
                  id="event_end_date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label htmlFor="event_description" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Description
              </label>
              <textarea
                id="event_description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of the event"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-sm text-slate-900 dark:text-slate-100 resize-none"
              />
            </div>

            {/* Public Access Toggle */}
            <div className="pt-2 flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Public Event
                </label>
                <p className="text-[10px] text-slate-400">
                  Visible to students and staff portals.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center gap-2">
          {event && onDelete ? (
            <button
              type="button"
              disabled={deleteLoading || loading}
              onClick={handleDelete}
              className="p-2 text-rose-600 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-950/20 rounded-lg border border-transparent transition-colors flex items-center gap-1.5 text-xs font-bold"
            >
              {deleteLoading ? (
                <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></span>
              ) : (
                <Trash2 size={14} />
              )}
              Delete
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading || deleteLoading}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="event-form"
              disabled={loading || deleteLoading}
              className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 border border-purple-700 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
