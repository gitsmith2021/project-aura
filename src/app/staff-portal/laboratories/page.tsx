import { FlaskConical } from "lucide-react";
import { getMyAssignedLabs } from "@/actions/laboratories";
import { StaffLabConsole } from "@/components/laboratories/StaffLabConsole";

export const metadata = { title: "Laboratories — Staff Portal" };

export default async function StaffLaboratoriesPage() {
  const res = await getMyAssignedLabs();
  const labs = res.success ? res.data : [];

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center gap-2">
        <FlaskConical size={18} className="text-violet-500" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Laboratories</h1>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-4">Log experiment sessions, mark attendance and record lab marks for your labs.</p>
      <StaffLabConsole labs={labs} />
    </div>
  );
}
