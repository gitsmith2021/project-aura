"use client";

import { FileText, ArrowRight } from "lucide-react";
import { CAREER_EVENT_LABELS, CAREER_EVENT_COLORS, type StaffCareerEvent } from "@/lib/staffCareer";

export function CareerTimeline({ events }: { events: StaffCareerEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-12 text-center text-slate-400 text-[13px]">
        No career events recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-5">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-800" />
      {events.map((e) => (
        <div key={e.id} className="relative">
          <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border-2 border-purple-500" />
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CAREER_EVENT_COLORS[e.event_type]}`}>
                  {CAREER_EVENT_LABELS[e.event_type]}
                </span>
                <span className="text-[12px] text-slate-500 dark:text-slate-400">
                  {new Date(e.effective_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              {e.order_number && <span className="text-[11px] text-slate-400">Ref: {e.order_number}</span>}
            </div>

            {(e.previous_value || e.new_value) && (
              <div className="mt-2 flex items-center gap-2 text-[13px]">
                <span className="text-slate-500 dark:text-slate-400">{e.previous_value ?? "—"}</span>
                <ArrowRight size={13} className="text-slate-400" />
                <span className="font-medium text-slate-900 dark:text-white">{e.new_value ?? "—"}</span>
              </div>
            )}

            {e.remarks && <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">{e.remarks}</p>}

            {e.document_url && (
              <a href={e.document_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-purple-600 hover:text-purple-700">
                <FileText size={13} /> View document
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
