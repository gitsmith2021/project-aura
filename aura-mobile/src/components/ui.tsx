import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { colors, radius, spacing } from "@/lib/theme";

export function Screen({ children }: { children: React.ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatCard({ label, value, accent = colors.violet }: { label: string; value: string; accent?: string }) {
  return (
    <View style={[styles.card, styles.stat]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.violet} />
      {label ? <Text style={styles.muted}>{label}</Text> : null}
    </View>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled, loading }: {
  label: string; onPress: () => void; disabled?: boolean; loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.button, (disabled || loading) && styles.buttonDisabled, pressed && styles.buttonPressed]}
    >
      {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  stat: { flex: 1, marginBottom: 0 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  sectionTitle: {
    fontSize: 12, fontWeight: "700", color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.sm,
  },
  muted: { color: colors.textMuted, fontSize: 13 },
  errorBox: { backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  errorText: { color: colors.rose, fontSize: 13 },
  button: {
    backgroundColor: colors.violet, borderRadius: radius.md, paddingVertical: 14,
    alignItems: "center", justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { backgroundColor: colors.violetDark },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
