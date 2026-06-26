import { Lock } from "lucide-react";

// CF-1: shown when an institution turns off a student-portal section
// (student_portal.show_results / show_fees / show_attendance).
export function SectionUnavailable({ title }: { title: string }) {
  return (
    <div className="px-6 pt-6 pb-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
      <div className="mt-6 flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm py-14 text-center">
        <Lock className="w-6 h-6 text-slate-300 dark:text-slate-600" />
        <p className="text-sm text-slate-400 dark:text-slate-500">
          This section is currently unavailable for your institution.
        </p>
      </div>
    </div>
  );
}
