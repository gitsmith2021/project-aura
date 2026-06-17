"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Calendar, IndianRupee, Users, Save } from "lucide-react";
import {
  DRIVE_STATUS_LABELS, DRIVE_STATUS_COLORS, STAGE_LABELS, STAGE_COLORS, formatLPA, driveStageCounts,
  type PlacementDrive, type PlacementRegistration, type StageStatus, type DriveStatus,
} from "@/lib/placements";
import { updateStageStatus, updateDriveStatus } from "@/actions/placements";

const STAGES: StageStatus[] = ["registered", "shortlisted", "interviewed", "offered", "rejected", "placed"];
const DRIVE_STATUSES: DriveStatus[] = ["scheduled", "ongoing", "completed", "cancelled"];

function RegistrationRow({ institutionId, driveId, reg, deptNames }: {
  institutionId: string; driveId: string; reg: PlacementRegistration; deptNames: Record<string, string>;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<StageStatus>(reg.stage_status);
  const [ctc, setCtc] = useState(reg.offer_ctc?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const dirty = stage !== reg.stage_status || (ctc || "") !== (reg.offer_ctc?.toString() ?? "");
  const showCtc = stage === "offered" || stage === "placed";

  async function save() {
    setBusy(true);
    await updateStageStatus({ institutionId, driveId, registrationId: reg.id, stageStatus: stage, offerCTC: ctc ? Number(ctc) : null });
    setBusy(false);
    router.refresh();
  }

  const deptName = reg.students?.department_id ? deptNames[reg.students.department_id] : null;
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
      <td className="px-4 py-2.5">
        <div className="font-medium text-slate-900 dark:text-white">{reg.students?.full_name ?? "—"}</div>
        <div className="text-[11px] text-slate-400">{[reg.students?.roll_no, deptName].filter(Boolean).join(" · ")}</div>
      </td>
      <td className="px-4 py-2.5">
        <select value={stage} onChange={(e) => setStage(e.target.value as StageStatus)}
          className="px-2 py-1 text-[12px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500">
          {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
      </td>
      <td className="px-4 py-2.5">
        {showCtc ? (
          <input type="number" step="0.01" value={ctc} onChange={(e) => setCtc(e.target.value)} placeholder="LPA"
            className="w-24 px-2 py-1 text-[12px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
        ) : <span className="text-slate-400 text-[12px]">—</span>}
      </td>
      <td className="px-4 py-2.5 text-right">
        <button onClick={save} disabled={!dirty || busy} className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed">
          <Save size={12} /> {busy ? "…" : "Save"}
        </button>
      </td>
    </tr>
  );
}

export function DriveDetailView({ institutionId, drive, registrations, deptNames }: {
  institutionId: string; drive: PlacementDrive | null; registrations: PlacementRegistration[]; deptNames: Record<string, string>;
}) {
  const router = useRouter();
  if (!drive) return <p className="text-slate-400">Drive not found.</p>;
  const counts = driveStageCounts(registrations);

  async function changeStatus(status: DriveStatus) {
    await updateDriveStatus({ institutionId, driveId: drive!.id, status });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Briefcase size={20} className="text-purple-600" /> {drive.companies?.name ?? "Company"}</h1>
            <p className="text-[13px] text-slate-500">{drive.job_role}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[12px] text-slate-500">
              <span className="inline-flex items-center gap-1"><Calendar size={13} className="text-slate-400" />{new Date(drive.drive_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              <span className="inline-flex items-center gap-1"><IndianRupee size={13} className="text-slate-400" />{formatLPA(drive.ctc_offered)}</span>
              <span className="inline-flex items-center gap-1"><Users size={13} className="text-slate-400" />{registrations.length} registered</span>
            </div>
          </div>
          <select value={drive.status} onChange={(e) => changeStatus(e.target.value as DriveStatus)}
            className={`text-[12px] font-medium px-2.5 py-1 rounded-full border-0 focus:ring-2 focus:ring-purple-500 ${DRIVE_STATUS_COLORS[drive.status]}`}>
            {DRIVE_STATUSES.map((s) => <option key={s} value={s}>{DRIVE_STATUS_LABELS[s]}</option>)}
          </select>
        </div>

        {(drive.process_stages?.length || drive.eligibility_criteria) && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid sm:grid-cols-2 gap-3 text-[12px]">
            {drive.process_stages && drive.process_stages.length > 0 && (
              <div>
                <p className="text-slate-400 mb-1">Process</p>
                <div className="flex flex-wrap gap-1">{drive.process_stages.map((s, i) => <span key={i} className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{s}</span>)}</div>
              </div>
            )}
            {drive.eligibility_criteria && (
              <div>
                <p className="text-slate-400 mb-1">Eligibility</p>
                <div className="text-slate-600 dark:text-slate-300 space-y-0.5">
                  {drive.eligibility_criteria.min_cgpa != null && <p>Min CGPA: {drive.eligibility_criteria.min_cgpa}</p>}
                  {drive.eligibility_criteria.no_backlogs && <p>No active backlogs</p>}
                  {drive.eligibility_criteria.departments && drive.eligibility_criteria.departments.length > 0 && (
                    <p>{drive.eligibility_criteria.departments.map((d) => deptNames[d] ?? d).join(", ")}</p>
                  )}
                  {drive.is_exclusive && <p className="text-amber-600 dark:text-amber-400">Exclusive drive</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stage funnel */}
      <div className="flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <span key={s} className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${STAGE_COLORS[s]}`}>{counts[s]} {STAGE_LABELS[s]}</span>
        ))}
      </div>

      {/* Registrations */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Student</th>
              <th className="text-left font-medium px-4 py-2.5">Stage</th>
              <th className="text-left font-medium px-4 py-2.5">Offer CTC</th>
              <th className="text-right font-medium px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {registrations.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">No students have registered yet.</td></tr>
            ) : registrations.map((r) => (
              <RegistrationRow key={r.id} institutionId={institutionId} driveId={drive.id} reg={r} deptNames={deptNames} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
