import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getOnboardingState } from "@/actions/onboarding";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

type PageProps = { params: Promise<{ institutionId: string }> };

// Arch A4 — Institution Onboarding Wizard. Standalone full-screen flow (no
// DashboardLayout): a fresh tenant has nothing for the sidebar to render yet.
export default async function OnboardingPage({ params }: PageProps) {
  const { institutionId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // getOnboardingState() also enforces the admin-of-this-institution guard.
  const res = await getOnboardingState(institutionId);
  if (!res.success) redirect("/");

  // Already onboarded → nothing to do here; send them to the dashboard.
  if (res.data.isOnboarded) redirect("/");

  const { data: inst } = await supabase
    .from("institutions")
    .select("name")
    .eq("id", institutionId)
    .maybeSingle();

  return (
    <OnboardingWizard
      institutionId={institutionId}
      institutionName={inst?.name ?? "Your institution"}
      initial={res.data}
    />
  );
}
