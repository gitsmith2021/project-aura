import { Heart } from "lucide-react";
import { getMyMedicalRecord, getMyVisitHistory } from "@/actions/infirmary";
import { MyHealthView } from "@/components/infirmary/MyHealthView";

export const metadata = { title: "Health — Student Portal" };

export default async function StudentHealthPage() {
  const [recordRes, visitsRes] = await Promise.all([
    getMyMedicalRecord(),
    getMyVisitHistory(),
  ]);

  const record = recordRes.success ? recordRes.data : null;
  const visits = visitsRes.success ? visitsRes.data : [];

  return <MyHealthView record={record} visits={visits} />;
}
