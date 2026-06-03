"use client";

import { useRef } from "react";
import { X, Printer } from "lucide-react";
import type { FeePayment } from "@/types/finance";

// ── Amount to words (Indian numbering) ──────────────────────────────────────

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function toWords(n: number): string {
  if (n === 0) return "Zero";
  if (n < 0)   return "Minus " + toWords(-n);

  const [intPart, fracPart] = String(Math.abs(n).toFixed(2)).split(".");
  let result = convertInt(parseInt(intPart, 10));
  const paise = parseInt(fracPart, 10);
  if (paise > 0) result += ` and ${convertInt(paise)} Paise`;
  return result;
}

function convertInt(n: number): string {
  if (n === 0) return "";
  if (n < 20)  return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
  if (n < 1_000)      return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertInt(n % 100) : "");
  if (n < 1_00_000)   return convertInt(Math.floor(n / 1_000))   + " Thousand" + (n % 1_000   ? " " + convertInt(n % 1_000) : "");
  if (n < 1_00_00_000) return convertInt(Math.floor(n / 1_00_000)) + " Lakh"    + (n % 1_00_000 ? " " + convertInt(n % 1_00_000) : "");
  return convertInt(Math.floor(n / 1_00_00_000)) + " Crore" + (n % 1_00_00_000 ? " " + convertInt(n % 1_00_00_000) : "");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

const MODE_LABELS: Record<string, string> = {
  cash: "Cash", upi: "UPI", razorpay: "Razorpay / Online",
  bank_transfer: "Bank Transfer", cheque: "Cheque", dd: "Demand Draft",
};

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  isOpen:          boolean;
  payment:         FeePayment | null;
  institutionName: string;
  onClose:         () => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function PaymentReceiptModal({ isOpen, payment, institutionName, onClose }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !payment) return null;

  function handlePrint() {
    if (!payment) return;
    const content = receiptRef.current?.innerHTML;
    if (!content) return;

    const win = window.open("", "_blank", "width=600,height=800");
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt — ${payment.receipt_number ?? ""}</title>
          <style>
            body { font-family: Georgia, serif; margin: 0; padding: 24px; color: #1e293b; }
            * { box-sizing: border-box; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  const amount     = Number(payment.amount_paid);
  const amtWords   = toWords(amount) + " Rupees Only";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Top toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Payment Receipt
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Printer size={13} />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Receipt content (also used for print) */}
        <div ref={receiptRef} className="p-6">

          {/* Institution header */}
          <div className="text-center mb-5 pb-4 border-b border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center mx-auto mb-2">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <h2 className="font-bold text-base text-slate-900">{institutionName}</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Official Fee Payment Receipt</p>
          </div>

          {/* PAID watermark stamp */}
          {payment.payment_status === "completed" && (
            <div className="flex justify-center mb-4">
              <div className="px-5 py-1.5 rounded-full border-2 border-emerald-500 text-emerald-600 font-black text-lg tracking-[0.3em] rotate-[-6deg] opacity-80">
                PAID
              </div>
            </div>
          )}

          {/* Receipt meta */}
          <div className="flex justify-between text-[11px] text-slate-500 mb-4">
            <span>Receipt No: <strong className="text-slate-800">{payment.receipt_number ?? "—"}</strong></span>
            <span>Date: <strong className="text-slate-800">{fmtDate(payment.paid_at ?? payment.created_at)}</strong></span>
          </div>

          {/* Details grid */}
          <table className="w-full text-xs mb-4 border-collapse">
            <tbody>
              {[
                ["Student",      payment.students?.full_name ?? "—"],
                ["Roll Number",  payment.students?.roll_no ?? "—"],
                ["Fee Head",     payment.fee_structures?.name ?? "General Payment"],
                ["Fee Type",     payment.fee_structures?.fee_type?.replace(/^\w/, c => c.toUpperCase()) ?? "—"],
                ["Payment Mode", MODE_LABELS[payment.payment_mode] ?? payment.payment_mode],
                ["Status",       payment.payment_status.charAt(0).toUpperCase() + payment.payment_status.slice(1)],
                ...(payment.razorpay_payment_id
                  ? [["Razorpay ID", payment.razorpay_payment_id]] as [string, string][]
                  : []),
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-500 w-1/3">{label}</td>
                  <td className="py-2 font-medium text-slate-800">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Amount box */}
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mb-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wide">Amount Paid</span>
              <span className="text-2xl font-black text-emerald-700">{fmtINR(amount)}</span>
            </div>
            <p className="text-[10px] text-emerald-600 mt-1 italic">{amtWords}</p>
          </div>

          {/* Notes */}
          {payment.notes && (
            <p className="text-[11px] text-slate-500 mb-4">
              <strong>Notes:</strong> {payment.notes}
            </p>
          )}

          {/* Footer */}
          <div className="text-center text-[10px] text-slate-400 border-t border-dashed border-slate-200 pt-3">
            This is a computer-generated receipt and does not require a signature.
          </div>
        </div>
      </div>
    </div>
  );
}
