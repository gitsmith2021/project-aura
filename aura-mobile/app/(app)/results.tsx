import { View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { ParentResults } from "@/screens/parent/ParentResults";
import { Screen, ErrorNote } from "@/components/ui";

// Parent-only tab (hidden for other roles via href:null in the layout).
export default function Results() {
  const { identity } = useAuth();
  if (identity?.tier === "parent") return <ParentResults />;
  return (
    <Screen>
      <View style={{ marginTop: 24 }}>
        <ErrorNote message="Results are available in the parent app." />
      </View>
    </Screen>
  );
}
