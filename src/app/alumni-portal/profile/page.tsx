import { redirect } from "next/navigation";
import { UserCircle } from "lucide-react";
import { getAlumniProfile } from "@/actions/alumni";
import { graduationYearToBatch, programLabel } from "@/lib/alumni";
import { AlumniProfileForm } from "@/components/alumni-portal/AlumniProfileForm";

export default async function AlumniProfilePage() {
  const profileRes = await getAlumniProfile();
  if (!profileRes.success || !profileRes.data) redirect("/login");
  const me = profileRes.data;

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 text-right">{value}</span>
    </div>
  );

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <UserCircle size={22} className="text-teal-600" /> My Profile
        </h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
          Keep your professional details current so your institution and peers can stay in touch.
        </p>
      </div>

      {/* Read-only identity */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white mb-2">Academic Record</h2>
        <Row label="Name" value={me.full_name} />
        {me.roll_no && <Row label="Roll No" value={me.roll_no} />}
        <Row label="Batch" value={me.batch ?? graduationYearToBatch(me.graduation_year, me.program)} />
        <Row label="Programme" value={programLabel(me.program)} />
        {me.departments?.name && <Row label="Department" value={me.departments.name} />}
        {me.email && <Row label="Email" value={me.email} />}
      </div>

      {/* Editable professional info */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white mb-4">Professional Details</h2>
        <AlumniProfileForm me={me} />
      </div>
    </div>
  );
}
