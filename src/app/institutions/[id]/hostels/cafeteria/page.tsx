import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getHostels } from "@/actions/hostels";
import { MessMenuEditor } from "@/components/hostels/MessMenuEditor";

type PageProps = { params: Promise<{ id: string }> };

export default async function CafeteriaPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getHostels(id);
  const hostels = (res.success ? res.data : []).map((h) => ({ id: h.id, name: h.name }));

  return (
    <DashboardLayout>
      <div className="px-6 pt-4">
        <Link href={`/institutions/${id}/hostels`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
          <ChevronLeft size={14} /> Hostels
        </Link>
      </div>
      <MessMenuEditor institutionId={id} hostels={hostels} />
    </DashboardLayout>
  );
}
