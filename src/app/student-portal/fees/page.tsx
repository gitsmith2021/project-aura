import { redirect } from "next/navigation";
import Link from "next/link";
import { getStudentProfile, getStudentFeeHistory, getStudentFeeStructures } from "@/actions/studentPortal";
import { getMyDemands } from "@/actions/feeDemands";
import { isSettingEnabled } from "@/lib/configServer";
import { SectionUnavailable } from "@/components/student-portal/SectionUnavailable";
import { MyDues } from "@/components/finance/MyDues";
import { CheckCircle2, Clock, XCircle, AlertCircle, CreditCard, type LucideIcon } from "lucide-react";

const FEE_TYPE_LABEL: Record<string, string> = {
  tuition: "Tuition Fee",
  hostel:  "Hostel Fee",
  exam:    "Exam Fee",
  library: "Library Fee",
  lab:     "Lab Fee",
  other:   "Other Fee",
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

type PageProps = {
  searchParams: Promise<{ success?: string }>;
};

export default async function FeesPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const showSuccess = resolvedParams.success === "true";

  const profileResult = await getStudentProfile();
  if (!profileResult.success) redirect("/login");
  const student = profileResult.data;

  // CF-1: institution can hide the fees section from the student portal.
  if (!(await isSettingEnabled(student.institution_id, "student_portal.show_fees"))) {
    return <SectionUnavailable title="Fees & Payments" />;
  }

  const [historyResult, structuresResult, demandsResult] = await Promise.all([
    getStudentFeeHistory(student.id),
    getStudentFeeStructures(student.institution_id),
    getMyDemands(),
  ]);

  const payments   = historyResult.success   ? historyResult.data   : [];
  const structures = structuresResult.success ? structuresResult.data : [];
  const demands    = demandsResult.success    ? demandsResult.data    : [];

  const totalDue    = structures.reduce((s, f) => s + Number(f.amount), 0);
  const totalPaid   = payments
    .filter(p => p.payment_status === "completed")
    .reduce((s, p) => s + Number(p.amount_paid), 0);
  const outstanding = Math.max(0, totalDue - totalPaid);

  return (
    <div className="px-6 pt-6 pb-6 space-y-6">
      {/* Toast Notification for Success */}
      {showSuccess && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 backdrop-blur-sm shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 animate-bounce" />
          <div>
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Payment Successful!</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              Your online payment has been verified and your status has been updated.
            </p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Fees &amp; Payments</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {student.institutions?.name ?? ""} · {student.departments?.name ?? ""}
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Fees",   value: fmtCurrency(totalDue),    cls: "border-indigo-200/60 dark:border-indigo-800/40", txt: "text-indigo-700 dark:text-indigo-400" },
          { label: "Paid",         value: fmtCurrency(totalPaid),   cls: "border-emerald-200/60 dark:border-emerald-800/40", txt: "text-emerald-700 dark:text-emerald-400" },
          { label: "Outstanding",  value: fmtCurrency(outstanding), cls: outstanding > 0 ? "border-rose-200/60 dark:border-rose-800/40" : "border-emerald-200/60 dark:border-emerald-800/40", txt: outstanding > 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400" },
        ].map(s => (
          <div key={s.label} className={`px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border backdrop-blur-sm shadow-sm ${s.cls}`}>
            <p className={`text-xl font-black ${s.txt}`}>{s.value}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Per-student dues with due dates (Fee Demand model) */}
      <MyDues demands={demands} />

      {/* Fee structures */}
      {structures.length > 0 && (
        <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100/60 dark:border-slate-700/40">
            <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Fee Schedule</h2>
          </div>
          <div className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
            {structures.map(f => {
              const paidForThis = payments
                .filter(p => p.fee_structure_id === f.id && p.payment_status === "completed")
                .reduce((sum, p) => sum + Number(p.amount_paid), 0);
              const isPending = payments.some(p => p.fee_structure_id === f.id && p.payment_status === "pending");
              const remaining = Math.max(0, Number(f.amount) - paidForThis);
              const isPaid = remaining <= 0;

              return (
                <div key={f.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/40 dark:hover:bg-slate-800/25 transition-colors">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{f.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {FEE_TYPE_LABEL[f.fee_type] ?? f.fee_type} · {f.academic_year}
                      {paidForThis > 0 && !isPaid && ` · Paid: ${fmtCurrency(paidForThis)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums">{fmtCurrency(f.amount)}</p>
                      {!isPaid && paidForThis > 0 && (
                        <p className="text-[9px] text-rose-500 font-semibold mt-0.5">Due: {fmtCurrency(remaining)}</p>
                      )}
                    </div>
                    <div>
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-800/40">
                          <CheckCircle2 size={10} />
                          Paid
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border bg-amber-100/80 text-amber-700 border-amber-200/60 dark:bg-amber-900/25 dark:text-amber-300 dark:border-amber-800/40 animate-pulse">
                              <Clock size={10} />
                              Pending
                            </span>
                          )}
                          <Link
                            href={`/student-portal/fees/pay?structureId=${f.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold rounded-lg border border-violet-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                          >
                            <CreditCard size={10} />
                            Pay Now
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment history */}
      <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100/60 dark:border-slate-700/40">
          <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Payment History</h2>
        </div>

        {payments.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-xs text-slate-400">
            No payments recorded yet.
          </div>
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
                    <td className="px-4 py-3 text-xs font-medium text-slate-800 dark:text-slate-200">
                      {p.fee_structures?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {fmtCurrency(p.amount_paid)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 capitalize">{p.payment_mode}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.payment_status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(p.paid_at)}</td>
                    <td className="px-4 py-3 text-[10px] text-slate-400 dark:text-slate-500 font-mono">{p.receipt_number ?? "—"}</td>
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
