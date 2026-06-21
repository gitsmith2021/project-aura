import { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { Card, StatCard, Loading, ErrorNote, SectionTitle } from "@/components/ui";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { useParentChild } from "@/context/ParentChildContext";
import { parentApi } from "@/lib/parentApi";
import { colors, spacing, inr } from "@/lib/theme";

// Phase 8F — parent dashboard: selected child's attendance % + fees-due summary.
export function ParentHome() {
  const { selected, loading: childLoading, error: childError } = useParentChild();
  const [pct, setPct] = useState<number | null>(null);
  const [feesDue, setFeesDue] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const studentId = selected?.studentId;

  useEffect(() => {
    if (!studentId) return;
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [att, fees] = await Promise.all([
          parentApi.attendance(studentId),
          parentApi.fees(studentId),
        ]);
        if (!active) return;
        const present = att.filter((r) => r.status === "present" || r.status === "late").length;
        setPct(att.length > 0 ? Math.round((present / att.length) * 100) : null);
        const due = fees
          .filter((f) => f.status !== "paid")
          .reduce((sum, f) => sum + (f.net_due ?? f.amount_due ?? 0), 0);
        setFeesDue(due);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load summary.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [studentId]);

  if (childLoading) return <Loading label="Loading…" />;
  if (childError) return <ScrollView contentContainerStyle={styles.scroll}><ErrorNote message={childError} /></ScrollView>;
  if (!selected) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card><Text style={styles.empty}>No children are linked to your account yet. Please contact your institution to link your child.</Text></Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ChildSwitcher />

      <Card>
        <Text style={styles.childName}>{selected.name}</Text>
        <Text style={styles.childMeta}>
          {[selected.rollNo, selected.department, selected.year ? `Year ${selected.year}` : null].filter(Boolean).join(" · ") || "—"}
        </Text>
      </Card>

      <View style={{ height: spacing.md }} />

      {error ? <ErrorNote message={error} /> : null}

      <View style={styles.statRow}>
        <StatCard label="Attendance" value={loading ? "…" : pct == null ? "—" : `${pct}%`} accent={pct != null && pct < 75 ? colors.rose : colors.emerald} />
        <View style={{ width: spacing.md }} />
        <StatCard label="Fees due" value={loading ? "…" : inr.format(feesDue)} accent={feesDue > 0 ? colors.amber : colors.emerald} />
      </View>

      <View style={{ height: spacing.lg }} />
      <SectionTitle>Quick view</SectionTitle>
      <Card>
        <Text style={styles.hint}>Use the tabs below to see {selected.name.split(" ")[0]}&apos;s attendance, results, and fees.</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  statRow: { flexDirection: "row" },
  childName: { fontSize: 18, fontWeight: "800", color: colors.text },
  childMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  hint: { fontSize: 13, color: colors.textMuted },
  empty: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
});
