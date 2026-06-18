import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FlaskConical, FileText, Wallet, BookOpen, Award, ChevronRight, BadgeCheck } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getProjects, getPublications } from "@/actions/research";
import { researchStats, publicationsByFaculty, formatINR } from "@/lib/research";

type PageProps = { params: Promise<{ id: string }> };

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{label}</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default async function ResearchDashboardPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [projRes, pubRes, instRes] = await Promise.all([
    getProjects(id),
    getPublications(id),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);
  const projects = projRes.success ? projRes.data : [];
  const publications = pubRes.success ? pubRes.data : [];
  const slug = (instRes.data?.slug as string) ?? id;
  const stats = researchStats(projects, publications);
  const faculty = publicationsByFaculty(publications).slice(0, 5);

  return (
    <DashboardLayout>
      <div className="w-full p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FlaskConical size={22} className="text-purple-600" /> Research &amp; Innovation
            </h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">NAAC Criterion 3 — projects, funding and publications.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/institutions/${slug}/research/projects`} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              <FlaskConical size={15} /> Projects
            </Link>
            <Link href={`/institutions/${slug}/research/publications`} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700">
              <FileText size={15} /> Publications
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<FlaskConical size={18} className="text-blue-600" />} label="Active Projects" value={stats.activeProjects} accent="bg-blue-100 dark:bg-blue-950/40" />
          <StatCard icon={<Wallet size={18} className="text-emerald-600" />} label="Funding Sanctioned" value={formatINR(stats.totalFunding)} accent="bg-emerald-100 dark:bg-emerald-950/40" />
          <StatCard icon={<BookOpen size={18} className="text-violet-600" />} label="Publications" value={stats.totalPublications} accent="bg-violet-100 dark:bg-violet-950/40" />
          <StatCard icon={<BadgeCheck size={18} className="text-amber-600" />} label="Scopus Indexed" value={stats.scopusCount} accent="bg-amber-100 dark:bg-amber-950/40" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<BadgeCheck size={18} className="text-teal-600" />} label="UGC-CARE Listed" value={stats.ugcCount} accent="bg-teal-100 dark:bg-teal-950/40" />
          <StatCard icon={<Award size={18} className="text-rose-600" />} label="Patents" value={stats.patents} accent="bg-rose-100 dark:bg-rose-950/40" />
          <StatCard icon={<FlaskConical size={18} className="text-slate-600" />} label="Completed Projects" value={stats.completedProjects} accent="bg-slate-200 dark:bg-slate-800" />
          <StatCard icon={<Wallet size={18} className="text-cyan-600" />} label="Funds Utilised" value={formatINR(stats.totalSpent)} accent="bg-cyan-100 dark:bg-cyan-950/40" />
        </div>

        {/* Faculty research leaderboard */}
        <div>
          <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white mb-2">Top Research Faculty</h2>
          {faculty.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-10 text-center text-slate-400 text-[13px]">
              No publications recorded yet.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="text-left font-medium px-4 py-2.5">Faculty</th>
                    <th className="text-center font-medium px-4 py-2.5">Publications</th>
                    <th className="text-center font-medium px-4 py-2.5">Scopus</th>
                    <th className="text-center font-medium px-4 py-2.5">Avg Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {faculty.map((f) => (
                    <tr key={f.staffId} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{f.name}</td>
                      <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{f.publications}</td>
                      <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{f.scopus}</td>
                      <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{f.avgImpact ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link href={`/institutions/${slug}/research/publications`} className="inline-flex items-center gap-1 text-[12px] font-medium text-purple-600 hover:text-purple-700 mt-3">
            View all publications <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
