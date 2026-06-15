import { getMyOutpasses, getMyInstitutionId } from "@/actions/gateManagement";
import { StudentOutpass } from "@/components/gate/StudentOutpass";

export const metadata = { title: "Outpass — Student Portal" };

export default async function StudentOutpassPage() {
  const [listRes, instRes] = await Promise.all([getMyOutpasses(), getMyInstitutionId()]);
  return (
    <StudentOutpass
      institutionId={instRes.success ? instRes.data : null}
      initial={listRes.success ? listRes.data : []}
    />
  );
}
