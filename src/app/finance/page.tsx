import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function FinanceRedirectPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("institutions")
    .select("id")
    .order("name")
    .limit(1)
    .single();

  if (data?.id) {
    redirect(`/institutions/${data.id}/finance`);
  }

  redirect("/institutions");
}
