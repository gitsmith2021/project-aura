import { View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { StaffCIA } from "@/screens/staff/StaffCIA";
import { Screen, ErrorNote } from "@/components/ui";

// Hidden tab (href:null) — reached from the staff Home. Marks entry for the
// signed-in teacher's CIA components.
export default function CIATab() {
  const { identity } = useAuth();
  if (identity?.tier === "staff") return <StaffCIA />;
  return (
    <Screen>
      <View style={{ marginTop: 24 }}>
        <ErrorNote message="CIA marks entry is available to teaching staff." />
      </View>
    </Screen>
  );
}
