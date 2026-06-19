import { getBilling, getPlans } from "@/actions/subscriptions";
import { BillingDashboard } from "@/components/billing/BillingDashboard";

export const metadata = { title: "AURA — Billing" };

export default async function AdminBillingPage() {
  const [billingRes, plansRes] = await Promise.all([getBilling(), getPlans()]);
  if (!billingRes.success) {
    return <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-6 text-[13px] text-rose-600 dark:text-rose-300">{billingRes.error}</div>;
  }
  const plans = (plansRes.success ? plansRes.data : []).filter((p) => p.isActive);
  return <BillingDashboard rows={billingRes.data.rows} summary={billingRes.data.summary} plans={plans} />;
}
