import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ConfigurationCenter } from "@/components/settings/ConfigurationCenter";

// AURA CORE FOUNDATION · CF-1 — the App Configuration Center replaces the former
// mock settings tabs. Behaviour is now data-driven (app_setting_definitions /
// app_setting_values), scoped to the selected institution.
export default function SettingsPage() {
  return (
    <DashboardLayout>
      <ConfigurationCenter />
    </DashboardLayout>
  );
}
