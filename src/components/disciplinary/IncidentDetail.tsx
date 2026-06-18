"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, MapPin, Calendar, Plus, X, Trash2, Save, Printer, Gavel } from "lucide-react";
import {
  INCIDENT_TYPE_LABELS, INCIDENT_TYPE_COLORS, INCIDENT_STATUS_LABELS, INCIDENT_STATUS_COLORS,
  INCIDENT_STATUSES, ACTION_TYPE_LABELS, ACTION_TYPE_COLORS, ACTION_TYPES,
  type DisciplinaryIncident, type DisciplinaryAction, type IncidentStatus, type ActionType,
} from "@/lib/disciplinary";
import { updateIncidentStatus, recordAction, deleteAction } from "@/actions/disciplinary";

function printWarningLetter(opts: {
  institutionName: string; studentName: string; rollNo: string | null;
  incidentType: string; incidentDate: string; action: DisciplinaryAction;
}) {
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const incDate = new Date(opts.incidentDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const effDate = new Date(opts.action.effective_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const actionLabel = ACTION_TYPE_LABELS[opts.action.action_type];
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Disciplinary Letter</title>
    <style>
      body{font-family:Georgia,'Times New Roman',serif;max-width:720px;margin:48px auto;padding:0 32px;color:#0f172a;line-height:1.7}
      h1{text-align:center;font-size:20px;margin-bottom:4px}
      .sub{text-align:center;color:#64748b;font-size:13px;margin-bottom:28px}
      .meta{display:flex;justify-content:space-between;font-size:13px;color:#475569;margin-bottom:24px}
      .title{text-align:center;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:24px 0;font-size:15px}
      p{font-size:14px}
      .sign{margin-top:64px;display:flex;justify-content:space-between;font-size:13px}
      @media print{body{margin:0}}
    </style></head><body>
    <h1>${opts.institutionName}</h1>
    <div class="sub">Office of the Disciplinary Committee</div>
    <div class="meta"><span>Ref: DC/${opts.action.id.slice(0, 8).toUpperCase()}</span><span>Date: ${today}</span></div>
    <p>To,<br><strong>${opts.studentName}</strong>${opts.rollNo ? `<br>Roll No: ${opts.rollNo}` : ""}</p>
    <div class="title">${actionLabel}</div>
    <p>This is to formally notify you that, following a review of the incident of
    <strong>${opts.incidentType}</strong> reported on ${incDate}, the Disciplinary Committee has decided to
    issue a <strong>${actionLabel.toLowerCase()}</strong>, effective from <strong>${effDate}</strong>.</p>
    ${opts.action.duration_days ? `<p>Duration: <strong>${opts.action.duration_days} day(s)</strong>.</p>` : ""}
    ${opts.action.fine_amount ? `<p>Fine imposed: <strong>₹${Number(opts.action.fine_amount).toLocaleString("en-IN")}</strong>.</p>` : ""}
    ${opts.action.remarks ? `<p>${opts.action.remarks}</p>` : ""}
    <p>You are advised to adhere strictly to the institution's code of conduct. Any further violation may
    invite stricter disciplinary action as per institutional and UGC regulations.</p>
    <div class="sign"><span>Student Acknowledgement</span><span>Chairperson, Disciplinary Committee</span></div>
    </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}

export function IncidentDetail({
  institutionId, institutionName, incident, actions,
}: {
  institutionId: string; institutionName: string; incident: DisciplinaryIncident | null; actions: DisciplinaryAction[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<IncidentStatus>(incident?.status ?? "reported");
  const [remarks, setRemarks] = useState(incident?.committee_remarks ?? "");
  const [actionTaken, setActionTaken] = useState(incident?.action_taken ?? "");
  const [busy, setBusy] = useState(false);

  const [drawer, setDrawer] = useState(false);
  const [aType, setAType] = useState<ActionType>("written_warning");
  const [aDate, setADate] = useState(new Date().toISOString().slice(0, 10));
  const [aDuration, setADuration] = useState("");
  const [aFine, setAFine] = useState("");
  const [aRemarks, setARemarks] = useState("");
  const [aBusy, setABusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!incident) return <p className="text-slate-400">Incident not found.</p>;

  async function saveStatus() {
    setBusy(true);
    await updateIncidentStatus({ institutionId, incidentId: incident!.id, status, committeeRemarks: remarks, actionTaken });
    setBusy(false);
    router.refresh();
  }

  async function addAction() {
    setABusy(true); setError(null);
    const res = await recordAction({
      institutionId, incidentId: incident!.id, actionType: aType, effectiveDate: aDate,
      durationDays: aDuration ? Number(aDuration) : null,
      fineAmount: aFine ? Number(aFine) : null,
      remarks: aRemarks || null,
    });
    setABusy(false);
    if (!res.success) { setError(res.error); return; }
    setAType("written_warning"); setADuration(""); setAFine(""); setARemarks("");
    setDrawer(false);
    router.refresh();
  }

  async function removeAction(id: string) {
    await deleteAction({ institutionId, incidentId: incident!.id, id });
    router.refresh();
  }

  const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500";
  const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";
  const studentName = incident.is_anonymous ? null : (incident.students?.full_name ?? null);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert size={18} className="text-purple-600" />
              <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${INCIDENT_TYPE_COLORS[incident.incident_type]}`}>{INCIDENT_TYPE_LABELS[incident.incident_type]}</span>
              {incident.is_anonymous && <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500">Anonymous</span>}
            </div>
            <p className="text-[13px] text-slate-700 dark:text-slate-300">
              {studentName ? <span className="font-semibold">{studentName}{incident.students?.roll_no ? ` · ${incident.students.roll_no}` : ""}</span> : <span className="text-slate-400 italic">No student linked</span>}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[12px] text-slate-500">
              <span className="inline-flex items-center gap-1"><Calendar size={13} className="text-slate-400" />{new Date(incident.incident_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              {incident.location && <span className="inline-flex items-center gap-1"><MapPin size={13} className="text-slate-400" />{incident.location}</span>}
            </div>
          </div>
          <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full ${INCIDENT_STATUS_COLORS[incident.status]}`}>{INCIDENT_STATUS_LABELS[incident.status]}</span>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[12px] font-medium text-slate-500 mb-1">Report</p>
          <p className="text-[13px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{incident.description}</p>
        </div>
      </div>

      {/* Committee review */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><Gavel size={16} className="text-purple-600" /> Committee Review</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as IncidentStatus)}>
              {INCIDENT_STATUSES.map((s) => <option key={s} value={s}>{INCIDENT_STATUS_LABELS[s]}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3"><label className={labelCls}>Committee remarks</label><textarea className={`${inputCls} min-h-[70px]`} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></div>
        <div className="mt-3"><label className={labelCls}>Action taken (summary)</label><textarea className={`${inputCls} min-h-[60px]`} value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} placeholder="Short summary for the register / NAAC evidence" /></div>
        <div className="mt-4 flex justify-end">
          <button onClick={saveStatus} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"><Save size={15} /> {busy ? "Saving…" : "Save Review"}</button>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white">Disciplinary Actions <span className="text-slate-400 font-normal">({actions.length})</span></h2>
          <button onClick={() => { setDrawer(true); setError(null); }} className="inline-flex items-center gap-1 text-[12px] font-medium text-purple-600 hover:text-purple-700"><Plus size={14} /> Record Action</button>
        </div>
        {actions.length === 0 ? (
          <p className="text-[13px] text-slate-400">No actions recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {actions.map((act) => (
              <li key={act.id} className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${ACTION_TYPE_COLORS[act.action_type]}`}>{ACTION_TYPE_LABELS[act.action_type]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-slate-600 dark:text-slate-300">
                    Effective {new Date(act.effective_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {act.duration_days ? ` · ${act.duration_days} day(s)` : ""}
                    {act.fine_amount ? ` · ₹${Number(act.fine_amount).toLocaleString("en-IN")}` : ""}
                  </p>
                  {act.remarks && <p className="text-[12px] text-slate-500">{act.remarks}</p>}
                  {act.staff?.full_name && <p className="text-[11px] text-slate-400">Issued by {act.staff.full_name}</p>}
                </div>
                {studentName && (act.action_type === "written_warning" || act.action_type === "suspension" || act.action_type === "expulsion" || act.action_type === "fine") && (
                  <button onClick={() => printWarningLetter({ institutionName, studentName, rollNo: incident.students?.roll_no ?? null, incidentType: INCIDENT_TYPE_LABELS[incident.incident_type], incidentDate: incident.incident_date, action: act })}
                    title="Print letter" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-purple-600 shrink-0"><Printer size={14} /></button>
                )}
                <button onClick={() => removeAction(act.id)} title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 shrink-0"><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Record action drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Record Action</h2>
              <button onClick={() => setDrawer(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Action</label>
                  <select className={inputCls} value={aType} onChange={(e) => setAType(e.target.value as ActionType)}>
                    {ACTION_TYPES.map((t) => <option key={t} value={t}>{ACTION_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Effective date</label><input type="date" className={inputCls} value={aDate} onChange={(e) => setADate(e.target.value)} /></div>
              </div>
              {aType === "suspension" && (
                <div><label className={labelCls}>Duration (days)</label><input type="number" className={inputCls} value={aDuration} onChange={(e) => setADuration(e.target.value)} /></div>
              )}
              {aType === "fine" && (
                <div><label className={labelCls}>Fine amount (₹)</label><input type="number" className={inputCls} value={aFine} onChange={(e) => setAFine(e.target.value)} /></div>
              )}
              <div><label className={labelCls}>Remarks</label><textarea className={`${inputCls} min-h-[80px]`} value={aRemarks} onChange={(e) => setARemarks(e.target.value)} /></div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setDrawer(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={addAction} disabled={aBusy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">{aBusy ? "Saving…" : "Record"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
