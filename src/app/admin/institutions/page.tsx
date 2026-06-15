import { getPlatformOverview } from "@/actions/superAdmin";
import { InstitutionsTable } from "@/components/admin/InstitutionsTable";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

/** Phase 7C — institutions register; each row drills into per-institution analytics. */
export default async function AdminInstitutionsPage() {
  const result = await getPlatformOverview();

  if (!result.success) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
        <AlertTriangle size={16} className="shrink-0" />
        Failed to load institutions: {result.error}
      </div>
    );
  }

  return (
    <InstitutionsTable
      institutions={result.data.institutions}
      title={`Institutions (${result.data.institutions.length})`}
      subtitle="Sorted by lifetime collections · click a name for full analytics"
    />
  );
}
