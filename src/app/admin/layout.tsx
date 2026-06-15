import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { ShieldCheck, ExternalLink } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = {
  title: "Platform Operator",
};

/**
 * Phase 7A — Super admin layout. Deliberately separate from the institution
 * Sidebar/Topbar shell: this is the SaaS operator surface, not a college
 * admin view. Middleware already fences /admin to SUPER_ADMIN; this layout
 * re-checks server-side as defense in depth (a layout must never rely on
 * middleware alone).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: superRow } = await supabase
    .from("institution_members")
    .select("id")
    .eq("profile_id", user.id)
    .eq("role", "SUPER_ADMIN")
    .limit(1)
    .maybeSingle();
  if (!superRow) redirect("/");

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/admin" className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center">
              <ShieldCheck size={16} />
            </span>
            <span className="font-bold text-slate-900 dark:text-white tracking-tight">
              AURA <span className="text-violet-600 dark:text-violet-400">Operator</span>
            </span>
          </Link>

          <AdminNav />

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 transition-colors"
            >
              Exit to app <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
