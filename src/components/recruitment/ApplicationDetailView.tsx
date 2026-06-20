"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, Briefcase, FileText, CalendarClock, CheckCircle, XCircle, ChevronRight, UserCheck } from "lucide-react";
import { HireDrawer } from "./HireDrawer";
import { nextApplicationStatus, canHire, canReject, APPLICATION_STATUS_LABELS, RECRUITMENT_PIPELINE, type JobApplication, type ApplicationStatus } from "@/lib/recruitment";
import { updateApplicationStatus, scheduleInterview, makeOffer } from "@/actions/recruitment";

type Dept = { id: string; name: string };

export function ApplicationDetailView({
  application: initial,
  institutionId,
  departments,
  emailDomain = null,
  autoOpenHire = false,
}: {
  application: JobApplication;
  institutionId: string;
  departments: Dept[];
  emailDomain?: string | null;
  autoOpenHire?: boolean;
}) {
  const router = useRouter();
  const [app, setApp] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hireOpen, setHireOpen] = useState(autoOpenHire && canHire(initial.status));

  // Interview scheduling state
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");

  // Offer state
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerDate, setOfferDate] = useState(new Date().toISOString().slice(0, 10));
  const [offerDetails, setOfferDetails] = useState("");

  useEffect(() => {
    setApp(initial);
  }, [initial]);

  const next = nextApplicationStatus(app.status);

  async function advance(status: ApplicationStatus) {
    setBusy(true);
    setError(null);
    const result = await updateApplicationStatus({
      institutionId,
      jobId: app.job_posting_id,
      applicationId: app.id,
      status,
    });
    setBusy(false);
    if (!result.success) { setError(result.error); return; }
    setApp(prev => ({ ...prev, status, updated_at: new Date().toISOString() }));
    router.refresh();
  }

  async function handleScheduleInterview() {
    if (!interviewDate) { setError("Please select an interview date."); return; }
    setBusy(true);
    setError(null);
    const result = await scheduleInterview({
      institutionId,
      jobId: app.job_posting_id,
      applicationId: app.id,
      interviewDate,
      interviewNotes: interviewNotes || null,
    });
    setBusy(false);
    if (!result.success) { setError(result.error); return; }
    setApp(prev => ({ ...prev, status: "interview", interview_date: interviewDate, interview_notes: interviewNotes || null }));
    setShowInterviewForm(false);
    router.refresh();
  }

  async function handleMakeOffer() {
    if (!offerDate) { setError("Please select an offer date."); return; }
    setBusy(true);
    setError(null);
    const result = await makeOffer({
      institutionId,
      jobId: app.job_posting_id,
      applicationId: app.id,
      offerDate,
      offerDetails: offerDetails || null,
    });
    setBusy(false);
    if (!result.success) { setError(result.error); return; }
    setApp(prev => ({ ...prev, status: "offer", offer_date: offerDate, offer_details: offerDetails || null }));
    setShowOfferForm(false);
    router.refresh();
  }

  async function reject() {
    if (!confirm(`Reject ${app.applicant_name}? This cannot be undone easily.`)) return;
    await advance("rejected");
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-[12px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-xl">
          {error}
        </p>
      )}

      {/* Pipeline progress */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <h2 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-3">Pipeline Stage</h2>
        <div className="flex items-center gap-1">
          {RECRUITMENT_PIPELINE.map((s, i) => {
            const isDone = RECRUITMENT_PIPELINE.indexOf(app.status) > i;
            const isCurrent = app.status === s;
            return (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={`flex-1 flex flex-col items-center`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-colors ${
                    isCurrent ? "border-purple-500 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300" :
                    isDone ? "border-emerald-500 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600" :
                    "border-slate-300 dark:border-slate-700 text-slate-400"
                  }`}>
                    {isDone ? <CheckCircle size={14} /> : i + 1}
                  </div>
                  <span className={`mt-1 text-[10px] font-medium ${
                    isCurrent ? "text-purple-600 dark:text-purple-400" :
                    isDone ? "text-emerald-600 dark:text-emerald-400" :
                    "text-slate-400"
                  }`}>
                    {APPLICATION_STATUS_LABELS[s]}
                  </span>
                </div>
                {i < RECRUITMENT_PIPELINE.length - 1 && (
                  <ChevronRight size={12} className={`mb-4 shrink-0 ${isDone ? "text-emerald-400" : "text-slate-300 dark:text-slate-700"}`} />
                )}
              </div>
            );
          })}
        </div>

        {app.status === "rejected" && (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-rose-500 dark:text-rose-400">
            <XCircle size={14} />
            This application was rejected.
          </div>
        )}
        {app.status === "joined" && (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-emerald-500 dark:text-emerald-400">
            <UserCheck size={14} />
            Hired and joined successfully.
          </div>
        )}
      </div>

      {/* Applicant details */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Applicant Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {app.applicant_phone && (
            <div className="flex items-center gap-2 text-[13px]">
              <Phone size={14} className="text-slate-400 shrink-0" />
              <span className="text-slate-600 dark:text-slate-300">{app.applicant_phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-[13px]">
            <Mail size={14} className="text-slate-400 shrink-0" />
            <a href={`mailto:${app.applicant_email}`} className="text-purple-600 dark:text-purple-400 hover:underline truncate">{app.applicant_email}</a>
          </div>
          {app.current_employer && (
            <div className="flex items-center gap-2 text-[13px]">
              <Briefcase size={14} className="text-slate-400 shrink-0" />
              <span className="text-slate-600 dark:text-slate-300">
                {app.current_employer}
                {app.experience_years != null ? ` · ${app.experience_years}y exp` : ""}
              </span>
            </div>
          )}
          {app.cv_url && (
            <div className="flex items-center gap-2 text-[13px]">
              <FileText size={14} className="text-slate-400 shrink-0" />
              <a href={app.cv_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline">
                View CV / Resume
              </a>
            </div>
          )}
        </div>
        {app.qualifications && (
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Qualifications</p>
            <p className="text-[13px] text-slate-600 dark:text-slate-300">{app.qualifications}</p>
          </div>
        )}
        {app.admin_notes && (
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-[13px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{app.admin_notes}</p>
          </div>
        )}
      </div>

      {/* Interview details */}
      {app.interview_date && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock size={16} className="text-amber-600 dark:text-amber-400" />
            <h2 className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">Interview Scheduled</h2>
          </div>
          <p className="text-[13px] text-amber-700 dark:text-amber-400">
            {new Date(app.interview_date).toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
          {app.interview_notes && (
            <p className="mt-2 text-[12px] text-amber-600 dark:text-amber-500 whitespace-pre-wrap">{app.interview_notes}</p>
          )}
        </div>
      )}

      {/* Offer details */}
      {app.offer_date && (
        <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck size={16} className="text-violet-600 dark:text-violet-400" />
            <h2 className="text-[13px] font-semibold text-violet-800 dark:text-violet-300">Offer Extended</h2>
          </div>
          <p className="text-[13px] text-violet-700 dark:text-violet-400">
            Offer date: {new Date(app.offer_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          {app.offer_details && (
            <p className="mt-2 text-[12px] text-violet-600 dark:text-violet-500 whitespace-pre-wrap">{app.offer_details}</p>
          )}
        </div>
      )}

      {/* Action panel */}
      {app.status !== "joined" && app.status !== "rejected" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Actions</h2>

          {/* Schedule interview */}
          {(app.status === "screened" || app.status === "applied") && !showInterviewForm && !showOfferForm && (
            <button
              type="button"
              onClick={() => setShowInterviewForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-400 text-amber-700 dark:text-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-[13px] font-medium transition-colors"
            >
              <CalendarClock size={15} />
              Schedule Interview
            </button>
          )}

          {showInterviewForm && (
            <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">Schedule Interview</p>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={interviewDate}
                  onChange={e => setInterviewDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Notes</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  value={interviewNotes}
                  onChange={e => setInterviewNotes(e.target.value)}
                  placeholder="Panel details, location, round type..."
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowInterviewForm(false)} className="px-3 py-1.5 text-[12px] rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">Cancel</button>
                <button type="button" onClick={handleScheduleInterview} disabled={busy} className="px-3 py-1.5 text-[12px] rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">{busy ? "Saving…" : "Confirm"}</button>
              </div>
            </div>
          )}

          {/* Make Offer */}
          {app.status === "interview" && !showInterviewForm && !showOfferForm && (
            <button
              type="button"
              onClick={() => setShowOfferForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-400 text-violet-700 dark:text-violet-300 dark:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/20 text-[13px] font-medium transition-colors"
            >
              <UserCheck size={15} />
              Make Offer
            </button>
          )}

          {showOfferForm && (
            <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">Extend Offer</p>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Offer Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={offerDate}
                  onChange={e => setOfferDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Offer Details (salary, terms…)</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  value={offerDetails}
                  onChange={e => setOfferDetails(e.target.value)}
                  placeholder="Designation, salary, joining date..."
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowOfferForm(false)} className="px-3 py-1.5 text-[12px] rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">Cancel</button>
                <button type="button" onClick={handleMakeOffer} disabled={busy} className="px-3 py-1.5 text-[12px] rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">{busy ? "Saving…" : "Confirm Offer"}</button>
              </div>
            </div>
          )}

          {/* Generic advance for applied → screened */}
          {next && next !== "interview" && next !== "offer" && !showInterviewForm && !showOfferForm && (
            <button
              type="button"
              onClick={() => advance(next)}
              disabled={busy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-[13px] font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              Move to {APPLICATION_STATUS_LABELS[next]}
            </button>
          )}

          {/* Hire */}
          {canHire(app.status) && !showOfferForm && (
            <button
              type="button"
              onClick={() => setHireOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-[13px] font-medium hover:bg-emerald-700 transition-colors"
            >
              <UserCheck size={15} />
              Hire — Create Staff Account
            </button>
          )}

          {/* Reject */}
          {canReject(app.status) && !showInterviewForm && !showOfferForm && (
            <button
              type="button"
              onClick={reject}
              disabled={busy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[13px] font-medium hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-50 transition-colors"
            >
              <XCircle size={15} />
              Reject Application
            </button>
          )}
        </div>
      )}

      <HireDrawer
        open={hireOpen}
        application={app}
        institutionId={institutionId}
        departments={departments}
        emailDomain={emailDomain}
        onClose={() => setHireOpen(false)}
      />
    </div>
  );
}
