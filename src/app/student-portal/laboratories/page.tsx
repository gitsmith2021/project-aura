import { FlaskConical } from "lucide-react";
import { getMyLabSessions } from "@/actions/laboratories";
import { MyLabsList } from "@/components/laboratories/MyLabsList";

export const metadata = { title: "Laboratories — Student Portal" };

export default async function StudentLaboratoriesPage() {
  const res = await getMyLabSessions();
  const sessions = res.success ? res.data : [];

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center gap-2">
        <FlaskConical size={18} className="text-violet-500" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">My Laboratories</h1>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-4">Your lab sessions, attendance and internal lab marks.</p>
      <div className="max-w-3xl"><MyLabsList sessions={sessions} /></div>
    </div>
  );
}
