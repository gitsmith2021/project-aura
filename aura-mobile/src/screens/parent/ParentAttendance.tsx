import { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { Card, StatCard, Loading, ErrorNote } from "@/components/ui";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { useParentChild } from "@/context/ParentChildContext";
import { parentApi, type ChildAttendanceRow } from "@/lib/parentApi";
import { colors, spacing } from "@/lib/theme";

// Phase 8F — child attendance, subject-wise (parent view).
export function ParentAttendance() {
  const { selected } = useParentChild();
  const studentId = selected?.studentId;
  const [rows, setRows] = useState<ChildAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const data = await parentApi.attendance(studentId);
        if (active) setRows(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load attendance.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [studentId]);

  if (loading) return <Loading />;
  if (!selected) return <ScrollView contentContainerStyle={styles.scroll}><Card><Text style={styles.empty}>No child linked.</Text></Card></ScrollView>;

  const present = rows.filter((r) => r.status === "present" || r.status === "late").length;
  const total = rows.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : null;

  const bySubject = rows.reduce<Record<string, { present: number; total: number }>>((acc, r) => {
    const name = r.subject ?? "General";
    acc[name] = acc[name] ?? { present: 0, total: 0 };
    acc[name].total += 1;
    if (r.status === "present" || r.status === "late") acc[name].present += 1;
    return acc;
  }, {});

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ChildSwitcher />
      {error ? <ErrorNote message={error} /> : null}
      <View style={{ flexDirection: "row", marginBottom: spacing.md }}>
        <StatCard label="Overall" value={pct == null ? "—" : `${pct}%`} accent={pct != null && pct < 75 ? colors.rose : colors.emerald} />
        <View style={{ width: spacing.md }} />
        <StatCard label="Sessions" value={String(total)} />
      </View>
      {Object.entries(bySubject).length === 0 ? (
        <Card><Text style={styles.empty}>No attendance recorded yet.</Text></Card>
      ) : (
        Object.entries(bySubject).map(([name, s]) => {
          const p = Math.round((s.present / s.total) * 100);
          return (
            <Card key={name}>
              <View style={styles.rowBetween}>
                <Text style={styles.subject}>{name}</Text>
                <Text style={[styles.pct, { color: p >= 75 ? colors.emerald : p >= 50 ? colors.amber : colors.rose }]}>{p}%</Text>
              </View>
              <Text style={styles.detail}>{s.present} / {s.total} present</Text>
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
  subject: { fontSize: 15, fontWeight: "700", color: colors.text, flexShrink: 1 },
  pct: { fontSize: 16, fontWeight: "800" },
  detail: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  empty: { color: colors.textMuted, fontSize: 13 },
});
