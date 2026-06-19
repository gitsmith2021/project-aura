import { getPlans } from "@/actions/subscriptions";
import { PlansManager } from "@/components/billing/PlansManager";

export const metadata = { title: "AURA — Subscription Plans" };

export default async function AdminPlansPage() {
  const res = await getPlans();
  if (!res.success) {
    return <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-6 text-[13px] text-rose-600 dark:text-rose-300">{res.error}</div>;
  }
  return <PlansManager initial={res.data} />;
}
