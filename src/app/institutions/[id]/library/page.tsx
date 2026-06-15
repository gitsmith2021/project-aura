import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getBooks } from "@/actions/library";
import { LibraryManager } from "@/components/library/LibraryManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function LibraryPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [booksRes, deptRes] = await Promise.all([
    getBooks(id),
    supabase.from("departments").select("id, name").eq("institution_id", id).order("name"),
  ]);
  const books = booksRes.success ? booksRes.data : [];
  const departments = (deptRes.data ?? []) as { id: string; name: string }[];

  return (
    <DashboardLayout>
      <LibraryManager institutionId={id} initial={books} departments={departments} />
    </DashboardLayout>
  );
}
