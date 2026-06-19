import { getPlatformHealth } from "@/actions/platformHealth";
import { HealthDashboard } from "@/components/admin/HealthDashboard";

export const metadata = { title: "AURA — Platform Health" };

export default async function AdminHealthPage() {
  const res = await getPlatformHealth();
  if (!res.success) {
    return <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-6 text-[13px] text-rose-600 dark:text-rose-300">{res.error}</div>;
  }
  return <HealthDashboard data={res.data} />;
}
