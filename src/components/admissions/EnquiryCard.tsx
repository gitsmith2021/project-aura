"use client";

import { Phone, Mail, ArrowRight, UserPlus, Pencil, Clock } from "lucide-react";
import {
  ENQUIRY_SOURCE_LABELS, ENQUIRY_STATUS_LABELS, nextEnquiryStatus, canConvertEnquiry,
  followUpLabel, followUpDaysLeft, type Enquiry,
} from "@/lib/admissionsCRM";

export function EnquiryCard({
  enquiry, today, busy, onAdvance, onConvert, onEdit,
}: {
  enquiry: Enquiry;
  today: string;
  busy: boolean;
  onAdvance: (e: Enquiry) => void;
  onConvert: (e: Enquiry) => void;
  onEdit: (e: Enquiry) => void;
}) {
  const nxt = nextEnquiryStatus(enquiry.status);
  const fLabel = followUpLabel(enquiry.follow_up_date, today);
  const overdue = (followUpDaysLeft(enquiry.follow_up_date, today) ?? 1) < 0
    && enquiry.status !== "applied";

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{enquiry.name}</p>
          <p className="text-[10px] text-slate-400 truncate">
            {enquiry.program_interest}{enquiry.departments?.name ? ` · ${enquiry.departments.name}` : ""}
          </p>
        </div>
        <button type="button" onClick={() => onEdit(enquiry)} title="Edit enquiry" className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0">
          <Pencil size={12} />
        </button>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1"><Phone size={10} /> {enquiry.phone}</span>
        {enquiry.email && <span className="inline-flex items-center gap-1 truncate"><Mail size={10} /> {enquiry.email}</span>}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {ENQUIRY_SOURCE_LABELS[enquiry.source]}
        </span>
        {fLabel && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${
            overdue ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          }`}>
            <Clock size={9} /> {fLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 mt-2">
        {canConvertEnquiry(enquiry.status) ? (
          <button type="button" onClick={() => onConvert(enquiry)} disabled={busy} className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-emerald-600 text-white text-[10px] font-semibold rounded-md hover:bg-emerald-700 disabled:opacity-50">
            <UserPlus size={11} /> Convert
          </button>
        ) : (
          <span className="flex-1 text-center text-[10px] text-slate-400 py-1">{ENQUIRY_STATUS_LABELS[enquiry.status]}</span>
        )}
        {nxt && (
          <button type="button" onClick={() => onAdvance(enquiry)} disabled={busy} title={`Move to ${ENQUIRY_STATUS_LABELS[nxt]}`} className="flex items-center justify-center gap-1 px-2 py-1 bg-indigo-600 text-white text-[10px] font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {ENQUIRY_STATUS_LABELS[nxt]} <ArrowRight size={11} />
          </button>
        )}
      </div>
    </div>
  );
}
