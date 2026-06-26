import { redirect } from "next/navigation";

// Settings is now a parent of two sub-pages: General (platform/institution
// settings) and App Config (the CF-1 Configuration Center). Land on General.
export default function SettingsPage() {
  redirect("/settings/general");
}
