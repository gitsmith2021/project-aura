import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { roleLabel } from "@/lib/roles";
import { Card, PrimaryButton } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export default function Account() {
  const { identity, session, signOut } = useAuth();
  const router = useRouter();
  const [instName, setInstName] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Institution name for the header card (best-effort).
  useEffect(() => {
    if (!identity?.institutionId) return;
    supabase.from("institutions").select("name").eq("id", identity.institutionId).maybeSingle()
      .then(({ data }) => setInstName(data?.name ?? null));
  }, [identity?.institutionId]);

  const initials = (identity?.fullName ?? session?.user?.email ?? "?")
    .split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  const onSignOut = async () => {
    setSigningOut(true);
    await signOut();
    router.replace("/login");
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials || "?"}</Text></View>
        <Text style={styles.name}>{identity?.fullName ?? "User"}</Text>
        <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{roleLabel(identity?.role)}</Text></View>
      </View>

      <Card>
        <Row icon="mail-outline" label="Email" value={session?.user?.email ?? "—"} />
        <View style={styles.divider} />
        <Row icon="shield-checkmark-outline" label="Role" value={roleLabel(identity?.role)} />
        {instName ? (
          <>
            <View style={styles.divider} />
            <Row icon="business-outline" label="Institution" value={instName} />
          </>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.note}>
          You&apos;re signed in to the same Aura account as the web portal. Full administration and data entry remain on
          the web dashboard; this app is for on-the-go access.
        </Text>
      </Card>

      <View style={{ marginTop: spacing.sm }}>
        <PrimaryButton label="Sign Out" onPress={onSignOut} loading={signingOut} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  header: { alignItems: "center", marginBottom: spacing.lg },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.violet,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.sm,
  },
  avatarText: { color: colors.white, fontSize: 24, fontWeight: "800" },
  name: { fontSize: 18, fontWeight: "800", color: colors.text },
  roleBadge: { backgroundColor: "#EDE9FE", borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  roleBadgeText: { color: colors.violetDark, fontSize: 11, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 4 },
  rowLabel: { fontSize: 13, color: colors.textMuted, width: 84 },
  rowValue: { fontSize: 13, color: colors.text, fontWeight: "600", flex: 1, textAlign: "right" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  note: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
});
