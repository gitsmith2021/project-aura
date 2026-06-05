import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import Link         from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient }      from "@/utils/supabase/server";
import { DashboardLayout }   from "@/components/layout/DashboardLayout";
import { StaffViewSubNav }   from "@/components/staff-portal/StaffViewSubNav";

type Props = {
  children:  React.ReactNode;
  params:    Promise<{ staffId: string }>;
};

export default async function StaffViewLayout({ children, params }: Props) {
  const { staffId } = await params;

  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  // Auth guard — must be logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the staff member being viewed
  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, title, designation, department_id, institution_id, departments(name), institutions(name)")
    .eq("id", staffId)
    .single();

  if (!staff) redirect("/users/staff");

  const displayName = `${staff.title ? staff.title + " " : ""}${staff.full_name}`;

  const breadcrumb = (
    <>
      <Link href="/users/staff" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Staff</Link>
      <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{displayName}</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="flex flex-col h-[calc(100vh-56px)] min-h-0 overflow-hidden">

        {/* ── Admin-viewing-staff banner ── */}
        <div className="shrink-0 px-6 pt-3 pb-0">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-violet-50/80 dark:bg-violet-900/20 border border-violet-200/60 dark:border-violet-800/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {staff.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-violet-800 dark:text-violet-200 truncate">
                  Viewing portal as: {displayName}
                </p>
                <p className="text-[10px] text-violet-500 dark:text-violet-400">
                  {staff.designation ? `${staff.designation} · ` : ""}
                  {(staff.departments as unknown as { name: string } | null)?.name ?? ""} ·{" "}
                  {(staff.institutions as unknown as { name: string } | null)?.name ?? ""}
                </p>
              </div>
            </div>
            <Link
              href="/users/staff"
              className="flex items-center gap-1.5 text-[10px] font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 transition-colors shrink-0"
            >
              <ArrowLeft size={11} /> Back to Staff
            </Link>
          </div>
        </div>

        {/* ── Sub-navigation tabs (client component for active state) ── */}
        <div className="shrink-0 px-6 pt-3">
          <StaffViewSubNav staffId={staffId} />
        </div>

        {/* ── Page content ── */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </DashboardLayout>
  );
}
