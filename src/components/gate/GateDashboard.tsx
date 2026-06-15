"use client";

import Link from "next/link";
import { UserCheck, DoorOpen, Car, Phone, LogOut, ClipboardList } from "lucide-react";
import { useState } from "react";
import { checkOutVisitor } from "@/actions/gateManagement";
import { visitorTally, outpassTally, type VisitorLog, type StudentOutpass } from "@/lib/gate";
import { OutpassList } from "./OutpassList";

const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function GateDashboard({
  institutionId, activeVisitors, outpasses,
}: {
  institutionId: string;
  activeVisitors: VisitorLog[];
  outpasses: StudentOutpass[];
}) {
  const [visitors, setVisitors] = useState<VisitorLog[]>(activeVisitors);
  const vt = visitorTally(visitors);
  const ot = outpassTally(outpasses);
  const pending = outpasses.filter((o) => o.status === "pending");
  const [busy, setBusy] = useState<string | null>(null);

  const checkout = async (id: string) => {
    setBusy(id);
    const res = await checkOutVisitor(institutionId, id);
    setBusy(null);
    if (res.success) setVisitors((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Gate &amp; Security</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Live visitor log and student outpass control.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/institutions/${institutionId}/gate/visitors`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><UserCheck size={14} /> Visitors</Link>
          <Link href={`/institutions/${institutionId}/gate/outpasses`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><ClipboardList size={14} /> Outpasses</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat label="Visitors on campus" value={vt.onCampus} tone="slate" />
        <Stat label="Pending outpasses" value={ot.pending} tone="amber" />
        <Stat label="Students out" value={ot.out} tone="slate" />
        <Stat label="Overdue" value={ot.overdue} tone="rose" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Active visitors */}
        <section>
          <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5"><DoorOpen size={13} /> On Campus Now</h2>
          {visitors.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center rounded-xl border border-slate-200 dark:border-slate-800">No visitors currently on campus.</p>
          ) : (
            <div className="space-y-2">
              {visitors.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{v.visitor_name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{v.purpose} · in {fmt(v.check_in_time)}</p>
                    <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400">
                      {v.visitor_phone && <span className="flex items-center gap-0.5"><Phone size={9} /> {v.visitor_phone}</span>}
                      {v.vehicle_number && <span className="flex items-center gap-0.5"><Car size={9} /> {v.vehicle_number}</span>}
                    </div>
                  </div>
                  <button type="button" onClick={() => checkout(v.id)} disabled={busy === v.id} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 disabled:opacity-50 shrink-0"><LogOut size={11} /> Out</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pending outpasses */}
        <section>
          <h2 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5"><ClipboardList size={13} /> Pending Outpass Approvals</h2>
          <OutpassList initial={pending} emptyLabel="No pending outpass requests." />
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "rose" }) {
  const color = tone === "amber" ? "text-amber-600 dark:text-amber-400" : tone === "rose" ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100";
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}
