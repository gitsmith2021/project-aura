"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, CheckCircle2, Clock, XCircle, RefreshCw,
  Receipt, ChevronLeft, ChevronRight, Filter, CheckCheck, CreditCard,
} from "lucide-react";
import { RecordPaymentDrawer }   from "@/components/finance/RecordPaymentDrawer";
import { PaymentReceiptModal }   from "@/components/finance/PaymentReceiptModal";
import { RazorpayCheckout }      from "@/components/finance/RazorpayCheckout";
import { getFeePayments, markPaymentCompleted } from "@/actions/feePayments";
import type { FeePayment, FeeStructure, PaymentMode, PaymentStatus, PaymentSummary } from "@/types/finance";

// ── Badge configs ─────────────────────────────────────────────────────────────

const MODE_STYLES: Record<PaymentMode, string> = {
  cash:          "bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-800/40",
  upi:           "bg-violet-100/80 text-violet-700 border-violet-200/60 dark:bg-violet-900/25 dark:text-violet-300 dark:border-violet-800/40",
  razorpay:      "bg-blue-100/80 text-blue-700 border-blue-200/60 dark:bg-blue-900/25 dark:text-blue-300 dark:border-blue-800/40",
  bank_transfer: "bg-cyan-100/80 text-cyan-700 border-cyan-200/60 dark:bg-cyan-900/25 dark:text-cyan-300 dark:border-cyan-800/40",
  cheque:        "bg-amber-100/80 text-amber-700 border-amber-200/60 dark:bg-amber-900/25 dark:text-amber-300 dark:border-amber-800/40",
  dd:            "bg-slate-100/80 text-slate-600 border-slate-200/60 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};
const MODE_LABELS: Record<PaymentMode, string> = {
  cash: "Cash", upi: "UPI", razorpay: "Razorpay",
  bank_transfer: "Bank Transfer", cheque: "Cheque", dd: "DD",
};

type StatusCfg = { cls: string; Icon: React.ElementType };
const STATUS_CFG: Record<PaymentStatus, StatusCfg> = {
  completed: { Icon: CheckCircle2, cls: "bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-800/40" },
  pending:   { Icon: Clock,        cls: "bg-amber-100/80 text-amber-700 border-amber-200/60 dark:bg-amber-900/25 dark:text-amber-300 dark:border-amber-800/40" },
  failed:    { Icon: XCircle,      cls: "bg-rose-100/80 text-rose-700 border-rose-200/60 dark:bg-rose-900/25 dark:text-rose-300 dark:border-rose-800/40" },
  refunded:  { Icon: RefreshCw,    cls: "bg-slate-100/80 text-slate-600 border-slate-200/60 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" },
};

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const PAGE_SIZE = 10;

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  institutionId:   string;
  institutionName: string;
  initialPayments: FeePayment[];
  initialTotal:    number;
  summary:         PaymentSummary;
  feeStructures:   Pick<FeeStructure, "id" | "name" | "amount">[];
};

// ── Component ─────────────────────────────────────────────────────────────────

export function PaymentsClient({
  institutionId,
  institutionName,
  initialPayments,
  initialTotal,
  summary,
  feeStructures,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // ── Data state ─────────────────────────────────────────────────────────
  const [payments, setPayments]   = useState<FeePayment[]>(initialPayments);
  const [total,    setTotal]      = useState(initialTotal);
  const [fetching, setFetching]   = useState(false);

  // ── Filter state ───────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "">("");
  const [monthFilter,  setMonthFilter]  = useState("");
  const [search,       setSearch]       = useState("");
  const [page,         setPage]         = useState(1);

  // ── Modal state ────────────────────────────────────────────────────────
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [receiptTarget, setReceiptTarget] = useState<FeePayment | null>(null);
  const [markingId,     setMarkingId]     = useState<string | null>(null);

  // ── Derived: client-side search filter on current page ─────────────────
  const displayed = useMemo(() =>
    search.trim()
      ? payments.filter(p =>
          p.students?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          (p.students?.roll_no ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (p.receipt_number ?? "").toLowerCase().includes(search.toLowerCase())
        )
      : payments,
    [payments, search]
  );

  // ── Refetch helper ──────────────────────────────────────────────────────
  async function fetchPage(
    newPage:   number,
    status:    PaymentStatus | "",
    month:     string,
  ) {
    setFetching(true);
    const result = await getFeePayments(institutionId, {
      status:    status    || undefined,
      month:     month     || undefined,
      page:      newPage,
      pageSize:  PAGE_SIZE,
    });
    setFetching(false);

    if (result.success) {
      setPayments(result.data);
      setTotal(result.total);
      setPage(newPage);
    }
  }

  function handleFilterChange(newStatus: PaymentStatus | "", newMonth: string) {
    setStatusFilter(newStatus);
    setMonthFilter(newMonth);
    setSearch("");
    startTransition(() => { fetchPage(1, newStatus, newMonth); });
  }

  function handlePageChange(newPage: number) {
    startTransition(() => { fetchPage(newPage, statusFilter, monthFilter); });
  }

  function onMutationSuccess() {
    router.refresh();
    fetchPage(page, statusFilter, monthFilter);
  }

  async function handleMarkPaid(payment: FeePayment) {
    setMarkingId(payment.id);
    await markPaymentCompleted(payment.id, institutionId);
    setMarkingId(null);
    onMutationSuccess();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Summary stats cards ─────────────────────────────────────────────────
  const stats = [
    {
      label: "Total Collected",
      value: fmtINR(summary.totalCollected),
      sub:   "completed payments",
      cls:   "border-emerald-200/60 dark:border-emerald-800/40",
      txt:   "text-emerald-700 dark:text-emerald-400",
    },
    {
      label: "Pending Dues",
      value: fmtINR(summary.totalPending),
      sub:   "awaiting completion",
      cls:   "border-amber-200/60 dark:border-amber-800/40",
      txt:   "text-amber-700 dark:text-amber-400",
    },
    {
      label: "Failed Transactions",
      value: String(summary.totalFailed),
      sub:   "need attention",
      cls:   "border-rose-200/60 dark:border-rose-800/40",
      txt:   "text-rose-600 dark:text-rose-400",
    },
    {
      label: "Total Transactions",
      value: String(summary.totalTransactions),
      sub:   "all time",
      cls:   "border-violet-200/60 dark:border-violet-800/40",
      txt:   "text-violet-700 dark:text-violet-400",
    },
  ];

  return (
    <div className="flex flex-col gap-4 px-6 pt-6 pb-6 h-full overflow-y-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Fee Payments</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track, record, and verify student fee payments.
          </p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg border border-violet-700 transition-colors shadow-sm"
        >
          <Plus size={14} strokeWidth={2.5} />
          Record Payment
        </button>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
        {stats.map(s => (
          <div
            key={s.label}
            className={`px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border backdrop-blur-sm shadow-sm ${s.cls}`}
          >
            <p className={`text-base font-bold leading-tight ${s.txt}`}>{s.value}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search student or receipt…"
            className="w-full pl-8 pr-3 py-1.5 bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 rounded-lg text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 backdrop-blur-sm"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <Filter size={12} className="text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={e => handleFilterChange(e.target.value as PaymentStatus | "", monthFilter)}
            className="px-2.5 py-1.5 bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-400 backdrop-blur-sm appearance-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        {/* Month filter */}
        <input
          type="month"
          value={monthFilter}
          onChange={e => handleFilterChange(statusFilter, e.target.value)}
          className="px-2.5 py-1.5 bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-400 backdrop-blur-sm"
        />

        {/* Clear filters */}
        {(statusFilter || monthFilter) && (
          <button
            onClick={() => handleFilterChange("", "")}
            className="px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="flex-1 min-h-0">
        {fetching ? (
          <div className="flex items-center justify-center h-32">
            <span className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/20 backdrop-blur-sm py-16">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-violet-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No payments found</p>
              <p className="text-xs text-slate-400 mt-1">
                {search || statusFilter || monthFilter ? "Try adjusting your filters." : "Record the first payment to get started."}
              </p>
            </div>
            {!search && !statusFilter && !monthFilter && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus size={13} strokeWidth={2.5} />
                Record first payment
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100/80 dark:border-slate-700/60">
                  {["Receipt", "Student", "Fee Structure", "Amount", "Mode", "Status", "Date", ""].map(h => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
                {displayed.map(p => {
                  const sc = STATUS_CFG[p.payment_status];
                  return (
                    <tr key={p.id} className="group hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">

                      {/* Receipt No */}
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {p.receipt_number ?? "—"}
                        </span>
                      </td>

                      {/* Student */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                          {p.students?.full_name ?? "—"}
                        </p>
                        {p.students?.roll_no && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{p.students.roll_no}</p>
                        )}
                      </td>

                      {/* Fee Structure */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px] block">
                          {p.fee_structures?.name ?? "Manual"}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                          {fmtINR(Number(p.amount_paid))}
                        </span>
                      </td>

                      {/* Mode badge */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${MODE_STYLES[p.payment_mode]}`}>
                          {MODE_LABELS[p.payment_mode]}
                        </span>
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.cls}`}>
                          <sc.Icon size={10} />
                          {p.payment_status.charAt(0).toUpperCase() + p.payment_status.slice(1)}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {fmtDate(p.paid_at ?? p.created_at)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">

                          {/* View receipt */}
                          <button
                            type="button"
                            onClick={() => setReceiptTarget(p)}
                            title="View Receipt"
                            className="p-1.5 rounded-md text-slate-400 hover:text-violet-600 hover:bg-violet-50/80 dark:hover:bg-violet-900/30 transition-colors"
                          >
                            <Receipt size={13} />
                          </button>

                          {/* Mark as paid (pending only) */}
                          {p.payment_status === "pending" && (
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(p)}
                              disabled={markingId === p.id}
                              title="Mark as Paid"
                              className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {markingId === p.id
                                ? <span className="w-3 h-3 border-2 border-slate-300 border-t-emerald-400 rounded-full animate-spin block" />
                                : <CheckCheck size={13} />
                              }
                            </button>
                          )}

                          {/* Razorpay re-pay button for pending online payments */}
                          {p.payment_status === "pending" && p.payment_mode === "razorpay" && p.fee_structure_id && (
                            <RazorpayCheckout
                              amount={Number(p.amount_paid)}
                              studentId={p.student_id}
                              studentName={p.students?.full_name}
                              feeStructureId={p.fee_structure_id}
                              institutionId={institutionId}
                              onSuccess={onMutationSuccess}
                              label=""
                              className="p-1.5 !bg-transparent !border-transparent !shadow-none text-slate-400 hover:text-blue-600 hover:!bg-blue-50/80 dark:hover:!bg-blue-900/20"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100/60 dark:border-slate-700/40">
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Page {page} of {totalPages} · {total} total
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Online Payment CTA ── */}
      {feeStructures.length > 0 && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/40 backdrop-blur-sm">
          <CreditCard className="w-4 h-4 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300 flex-1">
            <strong>Accept online payments via Razorpay.</strong> Select a student and fee structure from the "Record Payment" drawer, or use the Pay Online button on a pending row.
          </p>
        </div>
      )}

      {/* ── Drawers / Modals ── */}
      <RecordPaymentDrawer
        isOpen={drawerOpen}
        institutionId={institutionId}
        onClose={() => setDrawerOpen(false)}
        onSuccess={onMutationSuccess}
      />

      <PaymentReceiptModal
        isOpen={receiptTarget !== null}
        payment={receiptTarget}
        institutionName={institutionName}
        onClose={() => setReceiptTarget(null)}
      />
    </div>
  );
}
