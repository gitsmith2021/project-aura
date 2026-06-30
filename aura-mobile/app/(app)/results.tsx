import { View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { ParentResults } from "@/screens/parent/ParentResults";
import { StudentResults } from "@/screens/student/StudentResults";
import { Screen, ErrorNote } from "@/components/ui";

// Role-adaptive Results tab. Parents see their selected child's published
// summary; students see their own full marksheet (exam_results). Hidden for
// other roles via href:null in the layout.
export default function Results() {
  const { identity } = useAuth();
  if (identity?.tier === "parent") return <ParentResults />;
  if (identity?.tier === "student") return <StudentResults />;
  return (
    <Screen>
      <View style={{ marginTop: 24 }}>
        <ErrorNote message="Results are available to students and parents." />
      </View>
    </Screen>
  );
}
