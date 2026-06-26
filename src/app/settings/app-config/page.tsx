import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ConfigurationCenter } from "@/components/settings/ConfigurationCenter";

// AURA CORE FOUNDATION · CF-1 — the App Configuration Center: the data-driven
// 17-category settings registry (app_setting_definitions / app_setting_values),
// scoped to the selected institution. Lives under Settings → App Config.
export default function AppConfigPage() {
  return (
    <DashboardLayout>
      <ConfigurationCenter />
    </DashboardLayout>
  );
}
