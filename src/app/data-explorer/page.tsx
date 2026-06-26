import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DataExplorer } from "@/components/data-explorer/DataExplorer";

// CF-2 — Data Explorer. Admin-tier; data is RLS-scoped to the selected
// institution. The server actions enforce the admin gate + read-only access.
export default function DataExplorerPage() {
  return (
    <DashboardLayout>
      <DataExplorer />
    </DashboardLayout>
  );
}
