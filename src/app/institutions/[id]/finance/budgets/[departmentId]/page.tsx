import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getOrCreateDepartmentBudget } from "@/actions/budgets";
import { BudgetDetail } from "@/components/finance/BudgetDetail";

type PageProps = {
  params: Promise<{ id: string; departmentId: string }>;
  searchParams: Promise<{ ay?: string }>;
};

export default async function BudgetDetailPage({ params, searchParams }: PageProps) {
  const { id, departmentId } = await params;
  const { ay: ayId } = await searchParams;
  if (!ayId) notFound();

  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: department }, { data: ay }, { data: instRes }, { data: members }] = await Promise.all([
    supabase.from("departments").select("name").eq("id", departmentId).maybeSingle(),
    supabase.from("academic_years").select("label").eq("id", ayId).maybeSingle(),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
    supabase.from("institution_members").select("role, institution_id").eq("profile_id", user.id),
  ]);
  if (!department) notFound();

  const isAdmin = (members ?? []).some((m) => m.role === "SUPER_ADMIN" || (m.institution_id === id && (m.role === "INST_ADMIN" || m.role === "PRINCIPAL")));

  const res = await getOrCreateDepartmentBudget(id, departmentId, ayId);

  return (
    <DashboardLayout>
      {res.success ? (
        <BudgetDetail
          institutionId={id}
          instSlug={(instRes?.slug as string) ?? id}
          departmentName={department.name as string}
          ayLabel={(ay?.label as string) ?? ""}
          isAdmin={isAdmin}
          initial={res.data}
        />
      ) : (
        <p className="m-6 text-[13px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">
          Failed to load budget: {res.error}
        </p>
      )}
    </DashboardLayout>
  );
}
