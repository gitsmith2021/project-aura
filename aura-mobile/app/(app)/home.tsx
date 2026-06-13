import { View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { Loading, ErrorNote, Screen } from "@/components/ui";
import { StudentHome, StaffHome, HodHome, AdminHome } from "@/screens/dashboards";

// Role-adaptive home: one app, six roles. The access tier (derived from the
// user's institution_members role, same mapping as the web) decides which
// dashboard renders.
export default function Home() {
  const { identity, loading } = useAuth();

  if (loading || !identity) return <Loading label="Loading…" />;

  switch (identity.tier) {
    case "student":
      return <StudentHome identity={identity} />;
    case "staff":
      return <StaffHome identity={identity} />;
    case "hod":
      return <HodHome identity={identity} />;
    case "admin":
      return <AdminHome identity={identity} />;
    default:
      return (
        <Screen>
          <View style={{ marginTop: 24 }}>
            <ErrorNote message="Your account has no recognised role for this institution. Contact your administrator." />
          </View>
        </Screen>
      );
  }
}
