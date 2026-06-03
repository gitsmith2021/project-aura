import { redirect } from "next/navigation";

/**
 * Legacy deep-link: /institutions/[id]/finance
 * Redirects to the consolidated /finance page.
 * Institution-specific deep-links from other pages still work;
 * the /finance page manages institution selection via state.
 */
export default function FinanceLegacyRedirect() {
  redirect("/finance");
}
