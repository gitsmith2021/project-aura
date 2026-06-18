"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus, LogOut, Calendar, UserX } from "lucide-react";
import { formatServiceYears, type StaffCareerEvent } from "@/lib/staffCareer";
import { processResignation, processRetirement } from "@/actions/staffCareer";
import { CareerEventDrawer } from "./CareerEventDrawer";
import { CareerTimeline } from "./CareerTimeline";

type DeptOption = { id: string; name: string };

export function StaffCareerDetail({
  institutionId, instSlug, staffId, staffName, designation, departmentName,
  isActive, serviceYears, departmentOptions, initial,
}: {
  institutionId: string;
  instSlug: string;
  staffId: string;
  staffName: string;
  designation: string | null;
  departmentName: string | null;
  isActive: boolean;
  serviceYears: number | null;
  departmentOptions: DeptOption[];
  initial: StaffCareerEvent[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [offboarding, setOffboarding] = useState<"resignation" | "retirement" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function quickOffboard(kind: "resignation" | "retirement") {
    setBusy(true); setError(null);
    const fn = kind === "resignation" ? processResignation : processRetirement;
    const res = await fn({ institutionId, staffId, effectiveDate: new Date().toISOString().slice(0, 10) });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOffboarding(null);
    router.refresh();
  }

  return (
    <div className="w-full p-6 space-y-6">
      <Link href={`/institutions/${instSlug}/staff/career`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-purple-600">
        <ChevronLeft size={14} /> Career Log
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{staffName}</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            {designation ?? "—"}{departmentName ? ` · ${departmentName}` : ""}
            {!isActive && <span className="ml-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Inactive</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-2 text-[12px] rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
            <Calendar size={14} /> {formatServiceYears(serviceYears)} of service
          </div>
          {isActive && (
            <>
              <button onClick={() => setOffboarding("resignation")} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30">
                <LogOut size={15} /> Resignation
              </button>
              <button onClick={() => setOffboarding("retirement")} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                <UserX size={15} /> Retirement
              </button>
            </>
          )}
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700">
            <Plus size={15} /> Record Event
          </button>
        </div>
      </div>

      {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}

      <CareerTimeline events={initial} />

      {open && (
        <CareerEventDrawer
          institutionId={institutionId}
          staffOptions={[{ id: staffId, full_name: staffName, designation }]}
          departmentOptions={departmentOptions}
          lockedStaffId={staffId}
          onClose={() => setOpen(false)}
        />
      )}

      {offboarding && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOffboarding(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-5 space-y-4">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">
              Confirm {offboarding === "resignation" ? "Resignation" : "Retirement"}
            </h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">
              This deactivates {staffName}&apos;s account effective today and records a {offboarding} event. This cannot be undone from here.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setOffboarding(null)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={() => quickOffboard(offboarding)} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50">
                {busy ? "Processing…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
