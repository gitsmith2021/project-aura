import Link from "next/link";
import { CalendarDays, ChevronRight, ListChecks, User } from "lucide-react";
import { MEETING_STATUS_LABELS, MEETING_STATUS_STYLES } from "@/lib/iqac";
import type { MeetingRow } from "@/actions/iqacMeetings";

function fmt(d: string) { return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }

export function MeetingCard({ institutionId, meeting }: { institutionId: string; meeting: MeetingRow }) {
  return (
    <Link href={`/institutions/${institutionId}/iqac/meetings/${meeting.id}`}
      className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-violet-300 dark:hover:border-violet-700 transition-colors flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-slate-900 dark:text-white group-hover:text-violet-600 flex items-center gap-1">Meeting #{meeting.meetingNumber} <ChevronRight size={14} className="text-slate-300 group-hover:text-violet-500" /></p>
          <p className="text-[11px] text-slate-400 flex items-center gap-1"><CalendarDays size={11} /> {fmt(meeting.meetingDate)}{meeting.academicYear ? ` · ${meeting.academicYear}` : ""}</p>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${MEETING_STATUS_STYLES[meeting.status]}`}>{MEETING_STATUS_LABELS[meeting.status]}</span>
      </div>
      <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-300 line-clamp-2">{meeting.agenda}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        {meeting.chairedByName && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><User size={11} /> {meeting.chairedByName}</span>}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><ListChecks size={11} /> {meeting.actionTotal} actions{meeting.actionOpen > 0 ? ` · ${meeting.actionOpen} open` : ""}</span>
      </div>
    </Link>
  );
}
