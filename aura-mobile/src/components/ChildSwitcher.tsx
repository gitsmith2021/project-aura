import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useParentChild } from "@/context/ParentChildContext";
import { colors, radius, spacing } from "@/lib/theme";

// Phase 8F — compact selector shown atop each parent screen. Hidden when the
// parent has a single linked child.
export function ChildSwitcher() {
  const { children, selectedId, select } = useParentChild();
  if (children.length <= 1) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {children.map((c) => {
        const active = c.studentId === selectedId;
        return (
          <Pressable
            key={c.studentId}
            onPress={() => select(c.studentId)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
              {c.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.textMuted, maxWidth: 140 },
  chipTextActive: { color: colors.white },
});
