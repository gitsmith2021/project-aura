import { View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { Downloads } from "@/screens/student/Downloads";
import { Screen, ErrorNote } from "@/components/ui";

// Hidden tab (href:null) — reached from Home / Account. Student documents only.
export default function DownloadsTab() {
  const { identity } = useAuth();
  if (identity?.tier === "student") return <Downloads />;
  return (
    <Screen>
      <View style={{ marginTop: 24 }}>
        <ErrorNote message="Downloads are available to students." />
      </View>
    </Screen>
  );
}
