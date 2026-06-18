import { getStudentCertificates } from "@/actions/certificates";
import { StudentCertificates } from "@/components/certificates/StudentCertificates";

export const metadata = { title: "AURA — Certificates" };

export default async function StudentCertificatesPage() {
  const res = await getStudentCertificates();
  return <StudentCertificates initial={res.success ? res.data : []} />;
}
