import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCertificateForPrint } from "@/actions/certificates";
import { CertificateDocument } from "@/components/certificates/CertificateDocument";

type PageProps = { params: Promise<{ id: string; requestId: string }> };

export default async function AdminCertificatePrintPage({ params }: PageProps) {
  const { id, requestId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getCertificateForPrint(requestId);
  if (!res.success) notFound();

  return <CertificateDocument data={res.data} backHref={`/institutions/${id}/certificates`} />;
}
