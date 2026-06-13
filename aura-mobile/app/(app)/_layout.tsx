import { Stack, Redirect, useRouter } from "expo-router";
import { Pressable, Text, ActivityIndicator, View, StyleSheet } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/lib/theme";

// Authed group: anything under (app) requires a session. Unauthenticated users
// are bounced to /login. A shared sign-out lives in the header.
export default function AppLayout() {
  const { session, loading, signOut } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.violet} size="large" />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;

  const onSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.violet },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "800" },
        headerRight: () => (
          <Pressable onPress={onSignOut} hitSlop={10}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="home" options={{ title: "Aura" }} />
      <Stack.Screen name="attendance" options={{ title: "Attendance" }} />
      <Stack.Screen name="fees" options={{ title: "Fees" }} />
      <Stack.Screen name="schedule" options={{ title: "My Schedule" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  signOut: { color: colors.white, fontWeight: "600", fontSize: 13 },
});
