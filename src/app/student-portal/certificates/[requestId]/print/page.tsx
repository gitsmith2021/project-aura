import { notFound } from "next/navigation";
import { getCertificateForPrint } from "@/actions/certificates";
import { CertificateDocument } from "@/components/certificates/CertificateDocument";

type PageProps = { params: Promise<{ requestId: string }> };

export default async function StudentCertificatePrintPage({ params }: PageProps) {
  const { requestId } = await params;
  const res = await getCertificateForPrint(requestId);
  if (!res.success) notFound();

  return <CertificateDocument data={res.data} backHref="/student-portal/certificates" />;
}
