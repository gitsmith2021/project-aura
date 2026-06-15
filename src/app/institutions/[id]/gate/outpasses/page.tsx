import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getOutpasses } from "@/actions/gateManagement";
import { OutpassList } from "@/components/gate/OutpassList";

type PageProps = { params: Promise<{ id: string }> };

export default async function GateOutpassesPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getOutpasses(id);

  return (
    <DashboardLayout>
      <div className="px-6 pt-6 pb-6 w-full">
        <Link href={`/institutions/${id}/gate`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-purple-600 font-medium mb-4">
          <ArrowLeft size={13} /> Gate dashboard
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList size={18} className="text-purple-500" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Student Outpasses</h1>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">Approve or reject requests, and mark students returned on re-entry.</p>
        <div className="max-w-2xl">
          <OutpassList initial={res.success ? res.data : []} emptyLabel="No outpass requests." />
        </div>
      </div>
    </DashboardLayout>
  );
}
