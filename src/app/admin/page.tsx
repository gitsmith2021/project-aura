import { getPlatformOverview } from "@/actions/superAdmin";
import { PlatformDashboard } from "@/components/admin/PlatformDashboard";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

/** Phase 7B — Platform Overview Dashboard (SaaS operator bird's-eye view). */
export default async function AdminOverviewPage() {
  const result = await getPlatformOverview();

  if (!result.success) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
        <AlertTriangle size={16} className="shrink-0" />
        Failed to load platform data: {result.error}
      </div>
    );
  }

  return <PlatformDashboard initial={result.data} />;
}
