"use client";

import { Building2, Handshake, Landmark, HeartHandshake, FlaskConical, FileText, Users, Activity, Pencil, Trash2, Power, AlertTriangle, ExternalLink } from "lucide-react";
import { PARTNER_TYPE_LABELS, expiryUrgency, type PartnerType, type ExpiryUrgency } from "@/lib/industryConnect";
import type { MouRow } from "@/actions/industryConnect";

const TYPE_ICON: Record<PartnerType, typeof Building2> = {
  industry: Building2,
  university: Landmark,
  government: Landmark,
  ngo: HeartHandshake,
  research_institute: FlaskConical,
};

const URGENCY_BADGE: Record<ExpiryUrgency, string> = {
  expired: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  critical: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

function fmtDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function MOUCard({ mou, onEdit, onToggle, onDelete }: {
  mou: MouRow; onEdit: () => void; onToggle: () => void; onDelete: () => void;
}) {
  const Icon = TYPE_ICON[mou.partnerType] ?? Handshake;
  const urgency = mou.isActive ? expiryUrgency(mou.expiryDate) : "ok";
  const urgencyText = urgency === "expired" ? "Expired" : urgency === "critical" ? "Expiring ≤30d" : urgency === "warning" ? "Expiring ≤60d" : `Valid to ${fmtDate(mou.expiryDate)}`;

  return (
    <div className={`rounded-xl border bg-white dark:bg-slate-900 p-4 flex flex-col ${mou.isActive ? "border-slate-200 dark:border-slate-800" : "border-slate-200 dark:border-slate-800 opacity-70"}`}>
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center shrink-0"><Icon size={17} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">{mou.partnerName}</p>
          <p className="text-[11px] text-slate-400">{PARTNER_TYPE_LABELS[mou.partnerType]} · signed {fmtDate(mou.mouDate)}</p>
        </div>
        {!mou.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 shrink-0">Inactive</span>}
      </div>

      <p className="mt-3 text-[12px] text-slate-600 dark:text-slate-300 line-clamp-2">{mou.purpose}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${URGENCY_BADGE[urgency]}`}>{(urgency === "expired" || urgency === "critical" || urgency === "warning") && <AlertTriangle size={10} />}{urgencyText}</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><Activity size={11} /> {mou.activityCount} activities</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><Users size={11} /> {mou.studentsBenefited} students</span>
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
        {mou.mouDocumentUrl && <a href={mou.mouDocumentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-medium text-teal-600 hover:text-teal-700"><FileText size={13} /> Document <ExternalLink size={11} /></a>}
        <button onClick={onEdit} className="p-1.5 rounded-md text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 ml-auto"><Pencil size={14} /></button>
        <button onClick={onToggle} title={mou.isActive ? "Deactivate" : "Reactivate"} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><Power size={14} /></button>
        <button onClick={onDelete} className="p-1.5 rounded-md text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}
