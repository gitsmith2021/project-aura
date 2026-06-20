import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { createClient }          from "@/utils/supabase/server";
import { getLeaveRequests } from "@/actions/staffPortal";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function days(f: string, t: string) {
  return Math.round((new Date(t).getTime() - new Date(f).getTime()) / 86_400_000) + 1;
}

const statusCfg = {
  approved: { Icon: CheckCircle2, cls: "bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-800/40" },
  rejected: { Icon: XCircle,      cls: "bg-rose-100/80 text-rose-700 border-rose-200/60 dark:bg-rose-900/25 dark:text-rose-300 dark:border-rose-800/40" },
  pending:  { Icon: Clock,        cls: "bg-amber-100/80 text-amber-700 border-amber-200/60 dark:bg-amber-900/25 dark:text-amber-300 dark:border-amber-800/40" },
};

export default async function AdminStaffLeave({ params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = await params;

  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("full_name, title, institution_id")
    .eq("id", staffId).single();
  if (!staff) redirect("/users/staff");

  const result = await getLeaveRequests(staffId);
  const leaves  = result.success ? result.data : [];

  return (
    <div className="px-6 pt-4 pb-6 space-y-5">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        {staff.title ? `${staff.title} ` : ""}{staff.full_name} — Leave History
      </h1>

      <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100/60 dark:border-slate-700/40">
          <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {leaves.length} leave request{leaves.length !== 1 ? "s" : ""}
          </h2>
        </div>

        {leaves.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-xs text-slate-400">No leave requests.</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100/80 dark:border-slate-700/60">
                {["Type","From","To","Days","Reason","Status","Review Note"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
              {leaves.map(l => {
                const cfg = statusCfg[l.status] ?? statusCfg.pending;
                return (
                  <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 capitalize">{l.leave_type}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(l.from_date)}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(l.to_date)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 tabular-nums">{days(l.from_date, l.to_date)}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 max-w-[180px] truncate">{l.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${cfg.cls}`}>
                        <cfg.Icon size={9} /> {l.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400 max-w-[120px] truncate">{l.review_note ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
