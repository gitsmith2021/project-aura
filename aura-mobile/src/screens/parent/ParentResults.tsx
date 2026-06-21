import { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { Card, Loading, ErrorNote } from "@/components/ui";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { useParentChild } from "@/context/ParentChildContext";
import { parentApi, type ChildResultRow } from "@/lib/parentApi";
import { colors, spacing } from "@/lib/theme";

// Phase 8F — child published results, by semester (parent view).
export function ParentResults() {
  const { selected } = useParentChild();
  const studentId = selected?.studentId;
  const [rows, setRows] = useState<ChildResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const data = await parentApi.results(studentId);
        if (active) setRows(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load results.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [studentId]);

  if (loading) return <Loading />;
  if (!selected) return <ScrollView contentContainerStyle={styles.scroll}><Card><Text style={styles.empty}>No child linked.</Text></Card></ScrollView>;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ChildSwitcher />
      {error ? <ErrorNote message={error} /> : null}
      {rows.length === 0 ? (
        <Card><Text style={styles.empty}>No published results yet.</Text></Card>
      ) : (
        rows.map((r, i) => {
          const p = r.final_percentage;
          return (
            <Card key={i}>
              <View style={styles.rowBetween}>
                <Text style={styles.sem}>Semester {r.semester ?? "—"}</Text>
                <Text style={[styles.pct, { color: p == null ? colors.textMuted : p >= 50 ? colors.emerald : colors.rose }]}>
                  {p == null ? "—" : `${Math.round(p)}%`}
                </Text>
              </View>
              <Text style={styles.detail}>{p == null ? "Result pending" : p >= 50 ? "Passed" : "Has arrears"}</Text>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sem: { fontSize: 15, fontWeight: "700", color: colors.text },
  pct: { fontSize: 16, fontWeight: "800" },
  detail: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  empty: { color: colors.textMuted, fontSize: 13 },
});
