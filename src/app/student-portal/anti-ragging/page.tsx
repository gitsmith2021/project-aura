import { ShieldX } from "lucide-react";
import { StudentReportForm } from "@/components/disciplinary/StudentReportForm";

export default function StudentAntiRaggingPage() {
  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldX size={22} className="text-rose-600" /> Report an Incident
        </h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
          Report ragging, misconduct or any safety concern. You can choose to report anonymously —
          your identity will not be stored or shared.
        </p>
      </div>
      <StudentReportForm />
    </div>
  );
}
