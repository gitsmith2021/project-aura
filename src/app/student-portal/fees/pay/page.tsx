import { redirect } from "next/navigation";
import { getStudentProfile, getStudentFeeHistory, getStudentFeeStructures } from "@/actions/studentPortal";
import { CheckoutClient } from "@/components/student-portal/CheckoutClient";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PayPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const structureId = resolvedParams.structureId;

  // 1. Fetch student profile
  const profileResult = await getStudentProfile();
  if (!profileResult.success) redirect("/login");
  const student = profileResult.data;

  // 2. Validate structureId
  if (!structureId || typeof structureId !== "string") {
    redirect("/student-portal/fees");
  }

  // 3. Fetch active fee structures and payment history
  const [structuresResult, historyResult] = await Promise.all([
    getStudentFeeStructures(student.institution_id),
    getStudentFeeHistory(student.id),
  ]);

  if (!structuresResult.success) {
    redirect("/student-portal/fees");
  }

  const structures = structuresResult.data;
  const payments = historyResult.success ? historyResult.data : [];

  // 4. Find the matching fee structure
  const structure = structures.find(s => s.id === structureId);
  if (!structure) {
    redirect("/student-portal/fees");
  }

  // 5. Calculate amount already paid for this specific structure
  const paidAmount = payments
    .filter(p => p.fee_structure_id === structureId && p.payment_status === "completed")
    .reduce((sum, p) => sum + Number(p.amount_paid), 0);

  return (
    <CheckoutClient
      student={student}
      structure={structure}
      paidAmount={paidAmount}
    />
  );
}
