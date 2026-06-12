import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import { createClient }                          from "@/utils/supabase/server";
import { getStudentFeeHistory, getStudentFeeStructures } from "@/actions/studentPortal";
import { CheckCircle2, Clock, XCircle, AlertCircle, type LucideIcon } from "lucide-react";

const FEE_TYPE_LABEL: Record<string, string> = {
  tuition: "Tuition Fee", hostel: "Hostel Fee", exam: "Exam Fee",
  library: "Library Fee", lab: "Lab Fee", other: "Other Fee",
};

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; Icon: LucideIcon; label: string }> = {
    completed: { cls: "bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-800/40", Icon: CheckCircle2, label: "Paid" },
    pending:   { cls: "bg-amber-100/80   text-amber-700   border-amber-200/60   dark:bg-amber-900/25   dark:text-amber-300   dark:border-amber-800/40",   Icon: Clock,        label: "Pending" },
    failed:    { cls: "bg-rose-100/80    text-rose-700    border-rose-200/60    dark:bg-rose-900/25    dark:text-rose-300    dark:border-rose-800/40",    Icon: XCircle,      label: "Failed" },
    refunded:  { cls: "bg-sky-100/80     text-sky-700     border-sky-200/60     dark:bg-sky-900/25     dark:text-sky-300     dark:border-sky-800/40",     Icon: AlertCircle,  label: "Refunded" },
  };
  const cfg = map[status] ?? map["pending"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${cfg.cls}`}>
      <cfg.Icon size={10} />
      {cfg.label}
    </span>
  );
}

export default async function AdminStudentFees({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;

  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, institution_id, departments(name), institutions(name)")
    .eq("id", studentId).single();

  if (!student) redirect("/users/students");

  const [historyResult, structuresResult] = await Promise.all([
    getStudentFeeHistory(studentId),
    getStudentFeeStructures(student.institution_id),
  ]);

  const payments   = historyResult.success   ? historyResult.data   : [];
  const structures = structuresResult.success ? structuresResult.data : [];

  const totalDue    = structures.reduce((s, f) => s + Number(f.amount), 0);
  const totalPaid   = payments.filter(p => p.payment_status === "completed").reduce((s, p) => s + Number(p.amount_paid), 0);
  const outstanding = Math.max(0, totalDue - totalPaid);

  const inst = (student.institutions as unknown as { name: string } | null)?.name ?? "";
  const dept = (student.departments  as unknown as { name: string } | null)?.name ?? "";

  return (
    <div className="px-6 pt-4 pb-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Fees — {student.full_name}</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{inst} · {dept}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Fees",  value: fmtCurrency(totalDue),    cls: "border-indigo-200/60 dark:border-indigo-800/40", txt: "text-indigo-700 dark:text-indigo-400" },
          { label: "Paid",        value: fmtCurrency(totalPaid),   cls: "border-emerald-200/60 dark:border-emerald-800/40", txt: "text-emerald-700 dark:text-emerald-400" },
          { label: "Outstanding", value: fmtCurrency(outstanding), cls: outstanding > 0 ? "border-rose-200/60 dark:border-rose-800/40" : "border-emerald-200/60 dark:border-emerald-800/40", txt: outstanding > 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400" },
        ].map(s => (
          <div key={s.label} className={`px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border backdrop-blur-sm shadow-sm ${s.cls}`}>
            <p className={`text-xl font-black ${s.txt}`}>{s.value}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {structures.length > 0 && (
        <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100/60 dark:border-slate-700/40">
            <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Fee Schedule</h2>
          </div>
          <div className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
            {structures.map(f => (
              <div key={f.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{f.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{FEE_TYPE_LABEL[f.fee_type] ?? f.fee_type} · {f.academic_year}</p>
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums">{fmtCurrency(f.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100/60 dark:border-slate-700/40">
          <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Payment History</h2>
        </div>
        {payments.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-xs text-slate-400">No payments recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100/80 dark:border-slate-700/60">
                  {["Fee Name","Amount","Mode","Status","Paid On","Receipt"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-xs font-medium text-slate-800 dark:text-slate-200">{p.fee_structures?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs font-semibold tabular-nums">{fmtCurrency(p.amount_paid)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 capitalize">{p.payment_mode}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.payment_status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(p.paid_at)}</td>
                    <td className="px-4 py-3 text-[10px] text-slate-400 font-mono">{p.receipt_number ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
