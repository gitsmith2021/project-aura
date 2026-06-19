import Link from "next/link";
import { BookOpen, ChevronRight, FileStack } from "lucide-react";
import { getStaffSubjects } from "@/actions/studyMaterials";

export default async function StaffLmsPage() {
  const res = await getStaffSubjects();
  const subjects = res.success ? res.data : [];

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><FileStack size={22} className="text-violet-600" /> My E-Learning</h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Upload materials and manage assignments for the subjects you teach.</p>
      </div>

      {subjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">You have no teaching assignments yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {subjects.map((s) => (
            <Link key={s.id} href={`/staff-portal/lms/${s.id}`}
              className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 hover:border-violet-300 dark:hover:border-violet-700 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-slate-900 dark:text-white group-hover:text-violet-600 truncate">{s.name}</p>
                  <p className="text-[11px] text-slate-400">{[s.code, s.semester ? `Sem ${s.semester}` : null].filter(Boolean).join(" · ")}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-violet-500 shrink-0" />
              </div>
              <span className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px]"><BookOpen size={11} /> {s.materialCount} materials</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
