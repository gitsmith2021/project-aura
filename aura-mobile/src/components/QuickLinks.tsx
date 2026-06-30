import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/lib/theme";

// Navigation tiles to the secondary screens that are kept out of the bottom tab
// bar (Notifications, Knowledge Hub, Downloads, Profile, CIA). Rendered on the
// role dashboards and the Account hub so every screen stays one tap away.
export type QuickLink = { icon: keyof typeof Ionicons.glyphMap; label: string; href: Href; accent?: string };

export function QuickLinks({ title = "Quick Access", links }: { title?: string; links: QuickLink[] }) {
  const router = useRouter();
  if (links.length === 0) return null;
  return (
    <View style={{ marginTop: spacing.sm }}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.grid}>
        {links.map((l) => (
          <Pressable
            key={l.label}
            onPress={() => router.push(l.href)}
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
          >
            <View style={[styles.iconWrap, { backgroundColor: (l.accent ?? colors.violet) + "1A" }]}>
              <Ionicons name={l.icon} size={20} color={l.accent ?? colors.violet} />
            </View>
            <Text style={styles.label} numberOfLines={1}>{l.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase",
    letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.sm,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: {
    width: "31%", flexGrow: 1, minWidth: 96,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm, alignItems: "center", gap: 6,
  },
  tilePressed: { backgroundColor: "#F8FAFC" },
  iconWrap: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 11, fontWeight: "600", color: colors.text, textAlign: "center" },
});
