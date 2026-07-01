import { View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { ExecutiveInsights } from "@/screens/ExecutiveInsights";
import { Screen, ErrorNote } from "@/components/ui";

// Phase 8 (P8.1) — Executive tab. Aura Intelligence (CF-3) for Chairman /
// Principal / HOD accounts; other roles see a gentle note.
export default function InsightsTab() {
  const { identity } = useAuth();
  if (identity?.tier === "admin" || identity?.tier === "hod") return <ExecutiveInsights />;
  return (
    <Screen>
      <View style={{ marginTop: 24 }}>
        <ErrorNote message="Aura Intelligence is available to Chairman, Principal and HOD accounts." />
      </View>
    </Screen>
  );
}
