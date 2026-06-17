import { redirect } from "next/navigation";
import Link from "next/link";
import { Megaphone, Users, GraduationCap, Briefcase, UserCircle, ArrowRight } from "lucide-react";
import { getAlumniProfile, getAlumniDirectory, getAlumniAnnouncements } from "@/actions/alumni";
import {
  announcementMatchesAlumnus, announcementAudienceLabel, alumniStats, employmentRate,
  graduationYearToBatch,
} from "@/lib/alumni";

export default async function AlumniDashboardPage() {
  const profileRes = await getAlumniProfile();
  if (!profileRes.success || !profileRes.data) redirect("/login");
  const me = profileRes.data;

  const [dirRes, annRes] = await Promise.all([
    getAlumniDirectory(me.institution_id),
    getAlumniAnnouncements(me.institution_id),
  ]);
  const directory = dirRes.success ? dirRes.data : [];
  const announcements = (annRes.success ? annRes.data : [])
    .filter((a) => announcementMatchesAlumnus(a, me))
    .slice(0, 5);

  const sameBatch = directory.filter((a) => a.graduation_year === me.graduation_year);
  const stats = alumniStats(directory);
  const empRate = employmentRate(directory);

  const profileComplete = !!(me.current_employer && me.linkedin_url && me.city);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Welcome */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white p-6">
        <p className="text-teal-100 text-[13px]">Welcome back,</p>
        <h1 className="text-2xl font-bold mt-0.5">{me.full_name}</h1>
        <p className="text-teal-100 text-[13px] mt-1">
          Class of {me.graduation_year} · {graduationYearToBatch(me.graduation_year, me.program)}
        </p>
      </div>

      {/* Profile nudge */}
      {!profileComplete && (
        <Link href="/alumni-portal/profile" className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 hover:bg-amber-100/60 dark:hover:bg-amber-950/30 transition-colors">
          <div className="flex items-center gap-3">
            <UserCircle size={20} className="text-amber-500" />
            <div>
              <p className="text-[13px] font-medium text-amber-800 dark:text-amber-300">Complete your profile</p>
              <p className="text-[12px] text-amber-600 dark:text-amber-400/80">Add your employer, role, city and LinkedIn so peers can connect with you.</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-amber-500 shrink-0" />
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <Users size={18} className="text-teal-600" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{stats.total}</p>
          <p className="text-[12px] text-slate-500">Alumni in network</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <GraduationCap size={18} className="text-emerald-600" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{sameBatch.length}</p>
          <p className="text-[12px] text-slate-500">In your batch ({me.graduation_year})</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <Briefcase size={18} className="text-blue-600" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{empRate}%</p>
          <p className="text-[12px] text-slate-500">Employment rate</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <Megaphone size={18} className="text-purple-600" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{announcements.length}</p>
          <p className="text-[12px] text-slate-500">Recent updates</p>
        </div>
      </div>

      {/* Announcements */}
      <div>
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Megaphone size={17} className="text-teal-600" /> Announcements
        </h2>
        {announcements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-10 text-center text-slate-400 text-[13px]">
            No announcements right now. Check back soon.
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{a.body}</p>
                <span className="inline-block mt-2 text-[11px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-300">
                  {announcementAudienceLabel(a.graduation_year, a.program)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
