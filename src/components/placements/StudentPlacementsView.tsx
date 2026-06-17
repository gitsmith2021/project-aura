"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, IndianRupee, CheckCircle2, Lock, Loader2, Building2 } from "lucide-react";
import {
  DRIVE_STATUS_LABELS, DRIVE_STATUS_COLORS, STAGE_LABELS, STAGE_COLORS, formatLPA,
} from "@/lib/placements";
import type { StudentDriveView } from "@/actions/placements";
import { registerForDrive } from "@/actions/placements";

function DriveCard({ drive }: { drive: StudentDriveView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closed = drive.status === "completed" || drive.status === "cancelled";
  const canRegister = !drive.myStage && drive.eligible && !closed;

  async function register() {
    setBusy(true); setError(null);
    const res = await registerForDrive({ driveId: drive.id });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Building2 size={14} className="text-slate-400" /> {drive.companies?.name ?? "Company"}
          </p>
          <p className="text-[12px] text-slate-500">{drive.job_role}</p>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[12px] text-slate-500">
            <span className="inline-flex items-center gap-1"><Calendar size={12} className="text-slate-400" />{new Date(drive.drive_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            <span className="inline-flex items-center gap-1"><IndianRupee size={12} className="text-slate-400" />{formatLPA(drive.ctc_offered)}</span>
          </div>
        </div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${DRIVE_STATUS_COLORS[drive.status]}`}>{DRIVE_STATUS_LABELS[drive.status]}</span>
      </div>

      {drive.process_stages && drive.process_stages.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {drive.process_stages.map((s, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{s}</span>)}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        {drive.myStage ? (
          <span className="inline-flex items-center gap-1.5 text-[12px]">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="text-slate-500">Your status:</span>
            <span className={`font-medium px-2 py-0.5 rounded-full ${STAGE_COLORS[drive.myStage]}`}>{STAGE_LABELS[drive.myStage]}</span>
          </span>
        ) : !drive.eligible ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-amber-600 dark:text-amber-400">
            <Lock size={13} /> {drive.reasons[0] ?? "Not eligible"}
          </span>
        ) : closed ? (
          <span className="text-[12px] text-slate-400">Registration closed</span>
        ) : (
          <span className="text-[12px] text-slate-400">You&apos;re eligible</span>
        )}

        {canRegister && (
          <button onClick={register} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            {busy && <Loader2 size={13} className="animate-spin" />} Register
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-rose-600 mt-2">{error}</p>}
    </div>
  );
}

export function StudentPlacementsView({ drives }: { drives: StudentDriveView[] }) {
  if (drives.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">
        No placement drives are open right now. Check back soon.
      </div>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {drives.map((d) => <DriveCard key={d.id} drive={d} />)}
    </div>
  );
}
