import { IntelligenceMetrics } from "@/components/admin/IntelligenceMetrics";

export const dynamic = "force-dynamic";

/** CF-3.1 WS5/WS6 — Aura Intelligence performance + usage analytics (SUPER_ADMIN). */
export default function AiMetricsPage() {
  return <IntelligenceMetrics />;
}
