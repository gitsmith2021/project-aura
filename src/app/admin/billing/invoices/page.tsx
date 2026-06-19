import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getInvoices } from "@/actions/subscriptions";
import { InvoicesManager } from "@/components/billing/InvoicesManager";

export const metadata = { title: "AURA — Invoices" };

export default async function AdminInvoicesPage() {
  const res = await getInvoices();
  if (!res.success) {
    return <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-6 text-[13px] text-rose-600 dark:text-rose-300">{res.error}</div>;
  }

  // Super-admin gate already passed inside getInvoices; the institution picker
  // needs the full cross-tenant list, so read it with the service role.
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  let institutions: { id: string; name: string }[] = [];
  if (user) {
    const admin = createAdminClient();
    const { data } = await admin.from("institutions").select("id, name").order("name");
    institutions = (data ?? []).map((i) => ({ id: i.id as string, name: i.name as string }));
  }

  return <InvoicesManager initial={res.data} institutions={institutions} />;
}
