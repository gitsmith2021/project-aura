import { getSecurityPosture } from "@/actions/platformHealth";
import { SecurityDashboard } from "@/components/admin/SecurityDashboard";

export const metadata = { title: "AURA — Security" };

export default async function AdminSecurityPage() {
  const res = await getSecurityPosture();
  if (!res.success) {
    return <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-6 text-[13px] text-rose-600 dark:text-rose-300">{res.error}</div>;
  }
  return <SecurityDashboard data={res.data} />;
}
