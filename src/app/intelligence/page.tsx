import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AuraIntelligence } from "@/components/intelligence/AuraIntelligence";

// CF-3 — Aura Intelligence. Admin-tier; all data flows through CF-2 (RLS-scoped).
// The server actions enforce the access gate.
export default function IntelligencePage() {
  return (
    <DashboardLayout>
      <AuraIntelligence />
    </DashboardLayout>
  );
}
