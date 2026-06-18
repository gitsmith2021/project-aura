"use client";

import { Calendar, Briefcase } from "lucide-react";
import { formatServiceYears, serviceYears, type StaffCareerEvent } from "@/lib/staffCareer";
import { CareerTimeline } from "./CareerTimeline";

export function MyCareerView({
  joiningDate, designation, departmentName, events,
}: {
  joiningDate: string | null;
  designation: string | null;
  departmentName: string | null;
  events: StaffCareerEvent[];
}) {
  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Briefcase size={22} className="text-purple-600" /> My Career
        </h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
          Your joining, confirmation, promotion and increment history.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 px-3 py-2 text-[12px] rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
          <Calendar size={14} /> {formatServiceYears(serviceYears(joiningDate))} of service
        </div>
        {designation && (
          <div className="px-3 py-2 text-[12px] rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
            {designation}{departmentName ? ` · ${departmentName}` : ""}
          </div>
        )}
      </div>

      <CareerTimeline events={events} />
    </div>
  );
}
