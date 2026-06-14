import { Megaphone } from "lucide-react";
import { getStaffProfile } from "@/actions/staffPortal";
import { getActiveNotices } from "@/actions/notices";
import { NoticeBoard } from "@/components/notices/NoticeBoard";

export const metadata = { title: "Notices — Staff Portal" };

export default async function StaffNoticesPage() {
  const profile = await getStaffProfile();
  const staff = profile.success ? profile.data : null;
  const res = staff
    ? await getActiveNotices(staff.institution_id, { kind: "staff", departmentId: staff.department_id })
    : null;
  const notices = res && res.success ? res.data : [];

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center gap-2">
        <Megaphone size={18} className="text-violet-500" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Notices</h1>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
        Announcements for staff and your department.
      </p>
      <div className="max-w-3xl">
        <NoticeBoard notices={notices} emptyText="No notices for you right now." />
      </div>
    </div>
  );
}
