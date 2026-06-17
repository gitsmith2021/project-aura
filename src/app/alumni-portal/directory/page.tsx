import { redirect } from "next/navigation";
import { Users, Link2, Building2, MapPin } from "lucide-react";
import { getAlumniProfile, getAlumniDirectory } from "@/actions/alumni";
import { gradYearBreakdown, programLabel } from "@/lib/alumni";

export default async function AlumniDirectoryPage() {
  const profileRes = await getAlumniProfile();
  if (!profileRes.success || !profileRes.data) redirect("/login");
  const me = profileRes.data;

  const dirRes = await getAlumniDirectory(me.institution_id);
  const directory = dirRes.success ? dirRes.data : [];
  const byYear = gradYearBreakdown(directory);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Users size={22} className="text-teal-600" /> Alumni Directory
        </h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
          {directory.length} alumni across {byYear.length} graduating {byYear.length === 1 ? "batch" : "batches"}.
        </p>
      </div>

      {directory.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">
          The directory is empty.
        </div>
      ) : (
        byYear.map(({ year, count }) => (
          <section key={year}>
            <h2 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2 sticky top-0 bg-slate-50 dark:bg-slate-950 py-1">
              Class of {year} <span className="text-slate-400 font-normal">· {count}</span>
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {directory.filter((a) => a.graduation_year === year).map((a) => (
                <div key={a.id} className={`rounded-xl border bg-white dark:bg-slate-900 p-4 ${a.id === me.id ? "border-teal-300 dark:border-teal-700 ring-1 ring-teal-200 dark:ring-teal-800/40" : "border-slate-200 dark:border-slate-800"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">
                        {a.full_name}{a.id === me.id && <span className="ml-1.5 text-[10px] text-teal-600 dark:text-teal-400">(You)</span>}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {[programLabel(a.program), a.departments?.name].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {a.linkedin_url && (
                      <a href={a.linkedin_url} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="p-1.5 rounded-lg text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 shrink-0">
                        <Link2 size={15} />
                      </a>
                    )}
                  </div>
                  {(a.current_employer || a.city) && (
                    <div className="mt-2 space-y-1">
                      {a.current_employer && (
                        <p className="text-[12px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Building2 size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{a.current_employer}{a.current_designation ? ` · ${a.current_designation}` : ""}</span>
                        </p>
                      )}
                      {a.city && (
                        <p className="text-[12px] text-slate-500 flex items-center gap-1.5">
                          <MapPin size={12} className="text-slate-400 shrink-0" /> {a.city}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
