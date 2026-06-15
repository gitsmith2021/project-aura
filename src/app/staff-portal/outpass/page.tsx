import { DoorOpen } from "lucide-react";
import { getWardenOutpasses } from "@/actions/gateManagement";
import { OutpassList } from "@/components/gate/OutpassList";

export const metadata = { title: "Outpass Approvals — Staff Portal" };

export default async function StaffOutpassPage() {
  const res = await getWardenOutpasses();
  const outpasses = res.success ? res.data : [];

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center gap-2">
        <DoorOpen size={18} className="text-violet-500" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Outpass Approvals</h1>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-4">Student outpass requests for hostels you warden.</p>
      <div className="max-w-2xl">
        <OutpassList initial={outpasses} emptyLabel="No outpass requests for your hostel(s)." />
      </div>
    </div>
  );
}
