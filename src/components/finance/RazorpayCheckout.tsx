"use client";

import { useState } from "react";
import { CreditCard, CheckCircle2, XCircle } from "lucide-react";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/actions/feePayments";

// ── Razorpay window type declaration ─────────────────────────────────────────

interface RazorpayOptions {
  key:        string;
  amount:     number;
  currency:   string;
  name:       string;
  description?: string;
  order_id:   string;
  prefill?: {
    name?:  string;
    email?: string;
    contact?: string;
  };
  theme?: { color?: string };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id:   string;
    razorpay_signature:  string;
  }) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open(): void };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  amount:         number;   // INR
  studentId:      string;
  studentName?:   string;
  feeStructureId: string;
  institutionId:  string;
  onSuccess:      () => void;
  label?:         string;
  className?:     string;
};

type ToastState = { type: "success" | "error"; message: string } | null;

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

async function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src     = SCRIPT_URL;
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function RazorpayCheckout({
  amount,
  studentId,
  studentName,
  feeStructureId,
  institutionId,
  onSuccess,
  label     = "Pay Online",
  className = "",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState<ToastState>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleClick() {
    setLoading(true);
    setToast(null);

    // 1. Create server-side order
    const orderResult = await createRazorpayOrder({ amount, studentId, feeStructureId, institutionId });

    if (!orderResult.success) {
      setLoading(false);
      showToast("error", orderResult.error);
      return;
    }

    // 2. Load Razorpay script
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setLoading(false);
      showToast("error", "Failed to load Razorpay. Check your internet connection.");
      return;
    }

    setLoading(false);

    // 3. Open Razorpay modal
    const rzp = new window.Razorpay({
      key:         orderResult.keyId,
      amount:      orderResult.amount * 100, // paise
      currency:    orderResult.currency,
      name:        "Aura — Fee Payment",
      description: `Fee payment for ${studentName ?? "student"}`,
      order_id:    orderResult.orderId,
      prefill:     { name: studentName },
      theme:       { color: "#7c3aed" },
      modal:       { ondismiss: () => showToast("error", "Payment cancelled.") },

      handler: async (response) => {
        setLoading(true);
        const verifyResult = await verifyRazorpayPayment({
          razorpay_order_id:   response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature:  response.razorpay_signature,
          fee_payment_id:      orderResult.feePaymentId,
          institutionId,
        });
        setLoading(false);

        if (verifyResult.success) {
          showToast("success", `Payment of ${fmtINR(amount)} verified successfully!`);
          onSuccess();
        } else {
          showToast("error", verifyResult.error);
        }
      },
    });

    rzp.open();
  }

  return (
    <div className="relative inline-flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm bg-blue-600 hover:bg-blue-700 text-white border-blue-700 ${className}`}
      >
        {loading
          ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          : <CreditCard size={13} strokeWidth={2.5} />
        }
        {label}
      </button>

      {/* Toast notification */}
      {toast && (
        <div className={`absolute top-full mt-2 left-0 z-50 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-200 ${
          toast.type === "success"
            ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
            : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40"
        }`}>
          {toast.type === "success"
            ? <CheckCircle2 size={13} />
            : <XCircle size={13} />
          }
          {toast.message}
        </div>
      )}
    </div>
  );
}
