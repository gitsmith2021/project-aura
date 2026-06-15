import { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Card, Loading, ErrorNote, StatCard } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";

type Row = { status: string; class_schedules: { subject_name: string | null } | null };

// Student attendance — reads own rows (RLS: attendance.student_id = auth.uid()).
export default function Attendance() {
  const { identity } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("attendance")
          .select("status, class_schedules(subject_name)")
          .eq("student_id", identity?.studentId ?? "");
        if (error) throw error;
        setRows((data ?? []) as unknown as Row[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load attendance.");
      } finally {
        setLoading(false);
      }
    })();
  }, [identity?.studentId]);

  if (loading) return <Loading />;

  const present = rows.filter((r) => r.status === "present" || r.status === "late").length;
  const total = rows.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : null;

  // Subject-wise rollup
  const bySubject = rows.reduce<Record<string, { present: number; total: number }>>((acc, r) => {
    const name = r.class_schedules?.subject_name ?? "General";
    acc[name] = acc[name] ?? { present: 0, total: 0 };
    acc[name].total += 1;
    if (r.status === "present" || r.status === "late") acc[name].present += 1;
    return acc;
  }, {});

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {error ? <ErrorNote message={error} /> : null}
      <View style={{ flexDirection: "row", marginBottom: spacing.md }}>
        <StatCard label="Overall" value={pct == null ? "—" : `${pct}%`} accent={colors.emerald} />
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
