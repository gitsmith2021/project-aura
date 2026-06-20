"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { RazorpayCheckout } from "@/components/finance/RazorpayCheckout";
import type { StudentProfile, StudentFeeStructure } from "@/types/studentPortal";

type Props = {
  student: StudentProfile;
  structure: StudentFeeStructure;
  paidAmount: number;
};

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

export function CheckoutClient({ student, structure, paidAmount }: Props) {
  const router = useRouter();
  const remaining = Math.max(0, structure.amount - paidAmount);
  const isPaid = remaining <= 0;

  function handleSuccess() {
    // Redirect back to fees page with success parameter
    router.push("/student-portal/fees?success=true");
    router.refresh();
  }

  return (
    <div className="px-6 pt-6 pb-6 space-y-6 max-w-2xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          href="/student-portal/fees"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors font-medium"
        >
          <ArrowLeft size={14} />
          Back to Fees &amp; Payments
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
          Secure Fee Payment
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Review payment details and complete transaction via Razorpay.
        </p>
      </div>

      {/* Checkout details grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left: Summary & Payment details */}
        <div className="md:col-span-2 space-y-4">
          
          {/* Card: Payment Details */}
          <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-md p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Fee Item Details
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{structure.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {FEE_TYPE_LABEL[structure.fee_type] ?? structure.fee_type} · Academic Year {structure.academic_year}
                  </p>
                </div>
                {isPaid && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-800/40">
                    <CheckCircle2 size={10} />
                    Fully Paid
                  </span>
                )}
              </div>

              <div className="border-t border-slate-100/60 dark:border-slate-700/40 my-2" />

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Total Fee Amount</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{fmtCurrency(structure.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Already Paid</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtCurrency(paidAmount)}</span>
                </div>
                
                <div className="border-t border-dashed border-slate-100/60 dark:border-slate-700/40 my-2 pt-2" />
                
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Outstanding Balance</span>
                  <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {fmtCurrency(remaining)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Student Identity Details */}
          <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-md p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Student Details
            </h2>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 dark:text-slate-500 font-medium text-[10px]">FULL NAME</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{student.full_name}</p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500 font-medium text-[10px]">ROLL NUMBER</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{student.roll_no ?? "—"}</p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500 font-medium text-[10px]">DEPARTMENT</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{student.departments?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500 font-medium text-[10px]">PROGRAM &amp; YEAR</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {student.student_program ?? ""} · Year {student.student_year ?? ""}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Right: Payment action column */}
        <div className="space-y-4">
          
          {/* Card: Checkout Button & Security Badges */}
          <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-md p-5 shadow-sm flex flex-col justify-between h-full min-h-[220px]">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Sparkles size={14} />
                <span>Premium Gateway</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Online payment is processed securely via Razorpay. Supported options include Card, UPI, Netbanking, and Wallets.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              {!isPaid ? (
                <div className="w-full flex justify-center">
                  <RazorpayCheckout
                    amount={remaining}
                    studentId={student.id}
                    studentName={student.full_name}
                    feeStructureId={structure.id}
                    institutionId={student.institution_id}
                    onSuccess={handleSuccess}
                    label={`Pay ${fmtCurrency(remaining)}`}
                    className="w-full py-2.5 flex items-center justify-center text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg border border-indigo-700 shadow-md transition-all active:scale-95"
                  />
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-2 py-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-center">
                  <CheckCircle2 className="text-emerald-500" size={20} />
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Fully Settled</p>
                </div>
              )}

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                <ShieldCheck size={12} className="text-emerald-500" />
                <span>Secured 256-bit SSL connection</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
