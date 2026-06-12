import { getInstitutionAnalytics } from "@/actions/superAdmin";
import { InstitutionAnalyticsView } from "@/components/admin/InstitutionAnalyticsView";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

/** Phase 7C — per-institution drill down (operator analytics, not the college dashboard). */
export default async function AdminInstitutionDrillDownPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getInstitutionAnalytics(id);

  if (!result.success) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
        <AlertTriangle size={16} className="shrink-0" />
        Failed to load institution analytics: {result.error}
      </div>
    );
  }

  return <InstitutionAnalyticsView data={result.data} />;
}
