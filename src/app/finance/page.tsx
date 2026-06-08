"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useInstitution } from "@/context/InstitutionContext";
import { createClient } from "@/utils/supabase/client";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  GraduationCap,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { LogExpensePanel } from "@/components/finance/LogExpensePanel";
import { RecordPaymentPanel } from "@/components/finance/RecordPaymentPanel";

// ── Types ─────────────────────────────────────────────────────

interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  totalSalaryDisbursed: number;
  netBalance: number;
  pendingFees: number;
  pendingSalaries: number;
  totalStudentsPaid: number;
  totalStudentsDue: number;
}

interface RecentTransaction {
  id: string;
  type: "income" | "expense";
  description: string;
  amount: number;
  status: string;
  date: string;
  meta?: string;
}

// ── Helpers ───────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Sub-components ────────────────────────────────────────────

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  iconColor,
  iconBg,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  iconColor: string;
  iconBg: string;
}) {
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : null;
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-slate-900 leading-tight">{value}</p>
        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{title}</p>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
      {TrendIcon && trendLabel && (
        <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${trend === "up" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
          <TrendIcon className="w-3 h-3" />
          {trendLabel}
        </span>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
    completed: { label: "Paid",    cls: "bg-emerald-50 text-emerald-700 border-emerald-100", Icon: CheckCircle2 },
    pending:   { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-100",       Icon: Clock },
    failed:    { label: "Failed",  cls: "bg-red-50 text-red-600 border-red-100",             Icon: AlertCircle },
  };
  const c = cfg[status] ?? cfg["pending"];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.cls}`}>
      <c.Icon className="w-2.5 h-2.5" />
      {c.label}
    </span>
  );
}

function ProgressBar({ value, colorClass }: { value: number; colorClass: string }) {
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ── Empty summary ─────────────────────────────────────────────

const EMPTY_SUMMARY: FinanceSummary = {
  totalIncome: 0,
  totalExpenses: 0,
  totalSalaryDisbursed: 0,
  netBalance: 0,
  pendingFees: 0,
  pendingSalaries: 0,
  totalStudentsPaid: 0,
  totalStudentsDue: 0,
};

// ── Page ──────────────────────────────────────────────────────

export default function FinancePage() {
  const { selectedId: selectedTenantId } = useInstitution();

  const [summary, setSummary] = useState<FinanceSummary>(EMPTY_SUMMARY);
  const [recentTxns, setRecentTxns] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpensePanelOpen, setIsExpensePanelOpen] = useState(false);
  const [isPaymentPanelOpen, setIsPaymentPanelOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Fetch finance data whenever institution or refreshKey changes ─
  const fetchData = useCallback(async (tenantId: string) => {
    if (!tenantId) return;
    setLoading(true);

    const supabase = createClient();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const monthStartDate = monthStart.slice(0, 10);

    const [
      { data: feePaid },
      { data: feePending },
      { data: expenses },
      { data: salaryDisbursed },
      { data: salaryPending },
      { data: recentFees },
      { data: recentExpenses },
    ] = await Promise.all([
      supabase.from("fee_payments")
        .select("amount_paid, student_id")
        .eq("institution_id", tenantId)
        .eq("payment_status", "completed")
        .gte("paid_at", monthStart),

      supabase.from("fee_payments")
        .select("amount_paid, student_id")
        .eq("institution_id", tenantId)
        .eq("payment_status", "pending"),

      supabase.from("expenses")
        .select("amount")
        .eq("institution_id", tenantId)
        .gte("expense_date", monthStartDate),

      supabase.from("salary_disbursements")
        .select("amount_disbursed")
        .eq("institution_id", tenantId)
        .eq("month", currentMonth)
        .eq("status", "processed"),

      supabase.from("salary_disbursements")
        .select("amount_disbursed, staff_id")
        .eq("institution_id", tenantId)
        .eq("month", currentMonth)
        .eq("status", "pending"),

      supabase.from("fee_payments")
        .select("id, amount_paid, payment_status, paid_at, payment_mode")
        .eq("institution_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(5),

      supabase.from("expenses")
        .select("id, amount, description, category, expense_date, payment_mode")
        .eq("institution_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const totalIncome = (feePaid ?? []).reduce((s, r) => s + Number(r.amount_paid), 0);
    const totalExpenses = (expenses ?? []).reduce((s, r) => s + Number(r.amount), 0);
    const totalSalaryDisbursed = (salaryDisbursed ?? []).reduce((s, r) => s + Number(r.amount_disbursed), 0);
    const pendingFees = (feePending ?? []).reduce((s, r) => s + Number(r.amount_paid), 0);
    const pendingSalaries = (salaryPending ?? []).reduce((s, r) => s + Number(r.amount_disbursed), 0);

    setSummary({
      totalIncome,
      totalExpenses: totalExpenses + totalSalaryDisbursed,
      totalSalaryDisbursed,
      netBalance: totalIncome - totalExpenses - totalSalaryDisbursed,
      pendingFees,
      pendingSalaries,
      totalStudentsPaid: new Set((feePaid ?? []).map((r) => r.student_id)).size,
      totalStudentsDue:  new Set((feePending ?? []).map((r) => r.student_id)).size,
    });

    const txns: RecentTransaction[] = [
      ...(recentFees ?? []).map((r) => ({
        id: r.id,
        type: "income" as const,
        description: "Student Fee Payment",
        amount: Number(r.amount_paid),
        status: r.payment_status,
        date: r.paid_at ?? "",
        meta: r.payment_mode,
      })),
      ...(recentExpenses ?? []).map((r) => ({
        id: r.id,
        type: "expense" as const,
        description: r.description,
        amount: Number(r.amount),
        status: "completed",
        date: r.expense_date,
        meta: r.category,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    setRecentTxns(txns);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedTenantId) fetchData(selectedTenantId);
  }, [selectedTenantId, refreshKey, fetchData]);

  const currentMonthName = new Date().toLocaleString("default", { month: "long", year: "numeric" });
  const salaryPct = summary.totalSalaryDisbursed + summary.pendingSalaries > 0
    ? (summary.totalSalaryDisbursed / (summary.totalSalaryDisbursed + summary.pendingSalaries)) * 100
    : 0;
  const feePct = summary.totalIncome + summary.pendingFees > 0
    ? (summary.totalIncome / (summary.totalIncome + summary.pendingFees)) * 100
    : 0;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 px-6 pt-6 pb-6 h-[calc(100vh-56px)] overflow-y-auto">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
              Finance Command Center
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{currentMonthName} · Real-time overview</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpensePanelOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded-md hover:bg-slate-50 transition-colors shadow-sm"
            >
              + Log Expense
            </button>
            <button
              onClick={() => setIsPaymentPanelOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-md hover:bg-violet-700 transition-colors shadow-sm border border-violet-700"
            >
              + Record Payment
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        ) : (
          <>
            {/* ── KPI row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
              <KpiCard
                title="Total Income"
                value={fmt(summary.totalIncome)}
                subtitle={`${summary.totalStudentsPaid} students paid this month`}
                icon={TrendingUp}
                trend="up"
                trendLabel="This month"
                iconColor="text-emerald-600"
                iconBg="bg-emerald-50"
              />
              <KpiCard
                title="Total Expenditure"
                value={fmt(summary.totalExpenses)}
                subtitle={`Incl. ₹${(summary.totalSalaryDisbursed / 100000).toFixed(1)}L salary`}
                icon={TrendingDown}
                trend="down"
                trendLabel="This month"
                iconColor="text-rose-500"
                iconBg="bg-rose-50"
              />
              <KpiCard
                title="Net Balance"
                value={fmt(summary.netBalance)}
                subtitle={summary.netBalance >= 0 ? "Surplus" : "Deficit"}
                icon={Wallet}
                trend={summary.netBalance >= 0 ? "up" : "down"}
                trendLabel={summary.netBalance >= 0 ? "Surplus" : "Deficit"}
                iconColor="text-violet-600"
                iconBg="bg-violet-50"
              />
              <KpiCard
                title="Pending Collections"
                value={fmt(summary.pendingFees)}
                subtitle={`${summary.totalStudentsDue} students with dues`}
                icon={GraduationCap}
                iconColor="text-amber-600"
                iconBg="bg-amber-50"
              />
            </div>

            {/* ── Secondary row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">

              {/* Salary */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-xs font-semibold text-slate-700">Salary Status</span>
                  <span className="ml-auto text-[10px] text-slate-400">{currentMonthName}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[11px] text-slate-500">Disbursed</span>
                    <span className="text-xs font-bold text-emerald-600">{fmt(summary.totalSalaryDisbursed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[11px] text-slate-500">Pending</span>
                    <span className="text-xs font-bold text-amber-600">{fmt(summary.pendingSalaries)}</span>
                  </div>
                  <ProgressBar value={salaryPct} colorClass="bg-emerald-400" />
                </div>
              </div>

              {/* Fee collection */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-xs font-semibold text-slate-700">Fee Collection Rate</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[11px] text-slate-500">Collected</span>
                    <span className="text-xs font-bold text-emerald-600">{fmt(summary.totalIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[11px] text-slate-500">Outstanding</span>
                    <span className="text-xs font-bold text-rose-500">{fmt(summary.pendingFees)}</span>
                  </div>
                  <ProgressBar value={feePct} colorClass="bg-violet-500" />
                </div>
              </div>

            </div>

            {/* ── Recent transactions ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
                <h2 className="text-sm font-semibold text-slate-800">Recent Transactions</h2>
                <Link
                  href={`/institutions/${selectedTenantId}/finance/fees/payments`}
                  className="text-[11px] text-violet-600 hover:text-violet-700 font-medium"
                >
                  View all →
                </Link>
              </div>

              {recentTxns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 flex-1">
                  <Receipt className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs font-medium text-slate-500">No transactions yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Payments and expenses will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 overflow-y-auto">
                  {recentTxns.map((txn) => (
                    <div key={txn.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                      <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${txn.type === "income" ? "bg-emerald-50" : "bg-rose-50"}`}>
                        {txn.type === "income"
                          ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          : <TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{txn.description}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {txn.meta && <span className="capitalize">{txn.meta.replace(/_/g, " ")} · </span>}
                          {fmtDate(txn.date)}
                        </p>
                      </div>
                      <StatusBadge status={txn.status} />
                      <p className={`text-xs font-bold tabular-nums ml-1 ${txn.type === "income" ? "text-emerald-600" : "text-rose-500"}`}>
                        {txn.type === "income" ? "+" : "−"}{fmt(txn.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <LogExpensePanel
        isOpen={isExpensePanelOpen}
        tenantId={selectedTenantId}
        onClose={() => setIsExpensePanelOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      <RecordPaymentPanel
        isOpen={isPaymentPanelOpen}
        tenantId={selectedTenantId}
        onClose={() => setIsPaymentPanelOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </DashboardLayout>
  );
}
