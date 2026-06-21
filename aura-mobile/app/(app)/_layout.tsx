import { Tabs, Redirect } from "expo-router";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { ParentChildProvider } from "@/context/ParentChildContext";
import { colors } from "@/lib/theme";

// Authed group as role-adaptive bottom tabs. Every role gets Home + Account;
// role-specific tabs sit between. Expo Router builds tabs from the files below,
// so we declare every tab once and hide the ones a role shouldn't see with
// `href: null` (the canonical conditional-tab pattern) — keeping it file-based
// and avoiding per-role <Tabs> branches.
export default function AppLayout() {
  const { session, identity, loading } = useAuth();

  // Hold on a loader until the role is resolved. Without this, a freshly
  // logged-in session has session-but-no-identity for a moment, the tier
  // would default to "student", and the bar would briefly show the student
  // tab set before snapping to the real role — the flash of wrong tabs.
  if (loading || (session && !identity)) {
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
  const isAdminOrHod = tier === "admin" || tier === "hod";
  const isParent = tier === "parent";

  // `href: null` removes a tab from the bar for roles that shouldn't see it.
  const staffOnly = isStaff ? undefined : null;
  const adminOnly = isAdminOrHod ? undefined : null;
  const parentOnly = isParent ? undefined : null;
  // Attendance + Fees are shared by students (own data) and parents (child data).
  const studentOrParent = isStudent || isParent ? undefined : null;

  return (
    <ParentChildProvider>
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
          href: studentOrParent,
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="fees"
        options={{
          title: "Fees",
          href: studentOrParent,
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: "Results",
          href: parentOnly,
          tabBarIcon: ({ color, size }) => <Ionicons name="school-outline" color={color} size={size} />,
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
        name="leave"
        options={{
          title: "Leave",
          href: staffOnly,
          tabBarIcon: ({ color, size }) => <Ionicons name="exit-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="payslip"
        options={{
          title: "Payslip",
          href: staffOnly,
          tabBarIcon: ({ color, size }) => <Ionicons name="cash-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: "Approvals",
          href: adminOnly,
          tabBarIcon: ({ color, size }) => <Ionicons name="checkbox-outline" color={color} size={size} />,
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
    </ParentChildProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
});
