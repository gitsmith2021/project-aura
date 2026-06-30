import { View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { KnowledgeHub } from "@/screens/KnowledgeHub";
import { Screen, ErrorNote } from "@/components/ui";

// Hidden tab (href:null) — reached from Home. Students see their department's
// published materials; teaching staff see their subjects' materials (RLS-scoped).
export default function KnowledgeTab() {
  const { identity } = useAuth();
  if (identity?.tier === "student" || identity?.tier === "staff") return <KnowledgeHub />;
  return (
    <Screen>
      <View style={{ marginTop: 24 }}>
        <ErrorNote message="The Knowledge Hub is available to students and teaching staff." />
      </View>
    </Screen>
  );
}
