import { FlaskConical } from "lucide-react";
import { getMyPublications } from "@/actions/research";
import { StaffPublications } from "@/components/research/StaffPublications";

export default async function StaffResearchPage() {
  const res = await getMyPublications();
  const publications = res.success ? res.data : [];

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FlaskConical size={22} className="text-indigo-600" /> My Research
        </h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
          Log your journal articles, conference papers, books and patents for NAAC / NIRF reporting.
        </p>
      </div>
      <StaffPublications initial={publications} />
    </div>
  );
}
