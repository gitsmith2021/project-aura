import { Tabs, Redirect } from "expo-router";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/lib/theme";

// Authed group as role-adaptive bottom tabs. Every role gets Home + Account;
// role-specific tabs sit between. Expo Router builds tabs from the files below,
// so we declare every tab once and hide the ones a role shouldn't see with
// `href: null` (the canonical conditional-tab pattern) — keeping it file-based
// and avoiding per-role <Tabs> branches.
export default function AppLayout() {
  const { session, identity, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.violet} size="large" />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;

  const tier = identity?.tier ?? "student";
  const isStudent = tier === "student";
  const isStaff = tier === "staff";

  // `href: null` removes a tab from the bar for roles that shouldn't see it.
  const studentOnly = isStudent ? undefined : null;
  const staffOnly = isStaff ? undefined : null;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.violet },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "800" },
        tabBarActiveTintColor: colors.violet,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          headerTitle: "Aura",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: "Attendance",
          href: studentOnly,
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="fees"
        options={{
          title: "Fees",
          href: studentOnly,
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule",
          href: staffOnly,
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
});
