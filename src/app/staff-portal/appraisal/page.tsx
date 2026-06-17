import { ClipboardCheck } from "lucide-react";
import { getMyAppraisals, getAppraisalActivities } from "@/actions/appraisals";
import { AppraisalForm } from "@/components/appraisals/AppraisalForm";
import type { AppraisalActivity } from "@/lib/appraisals";

export default async function StaffAppraisalPage() {
  const apprRes = await getMyAppraisals();
  const appraisals = apprRes.success ? apprRes.data : [];

  // Fetch activities for each appraisal in parallel.
  const activityLists = await Promise.all(appraisals.map((a) => getAppraisalActivities(a.id)));
  const activitiesByAppraisal = new Map<string, AppraisalActivity[]>();
  appraisals.forEach((a, i) => {
    const r = activityLists[i];
    activitiesByAppraisal.set(a.id, r.success ? r.data : []);
  });

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ClipboardCheck size={22} className="text-purple-600" /> My Appraisals
        </h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
          Log your teaching, research and development activities, then submit your self-appraisal for review.
        </p>
      </div>

      {appraisals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">
          No appraisal cycles have been opened for you yet.
        </div>
      ) : (
        appraisals.map((a) => (
          <AppraisalForm key={a.id} appraisal={a} activities={activitiesByAppraisal.get(a.id) ?? []} />
        ))
      )}
    </div>
  );
}
