import { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Card, Loading, ErrorNote, StatCard } from "@/components/ui";
import { computeCGPA, gradePoint, gradeColor } from "@/lib/grade";
import { colors, radius, spacing } from "@/lib/theme";

// A student's own published marksheet. Reads exam_results directly under RLS
// (student reads own rows) — the same table the web "My Results" page uses via
// getStudentMarksheet, so grades/CGPA are identical across web and mobile.
type ResultRow = {
  id: string;
  subject_name: string;
  marks_scored: number;
  max_marks: number;
  pass_marks: number;
  grade: string;
  is_arrear: boolean;
  semester: number;
};

export function StudentResults() {
  const { identity } = useAuth();
  const studentId = identity?.studentId ?? "";
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("exam_results")
          .select("id, subject_name, marks_scored, max_marks, pass_marks, grade, is_arrear, semester")
          .eq("student_id", studentId)
          .order("semester")
          .order("subject_name");
        if (error) throw error;
        if (active) setRows((data ?? []) as ResultRow[]);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load results.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [studentId]);

  if (loading) return <Loading />;

  const cgpa = computeCGPA(rows);
  const arrears = rows.filter((r) => r.is_arrear).length;
  const passed = rows.filter((r) => !r.is_arrear).length;

  // Group by semester (ascending)
  const bySem = rows.reduce<Record<number, ResultRow[]>>((acc, r) => {
    (acc[r.semester] = acc[r.semester] ?? []).push(r);
    return acc;
  }, {});
  const semesters = Object.keys(bySem).map(Number).sort((a, b) => a - b);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {error ? <ErrorNote message={error} /> : null}

      {rows.length === 0 ? (
        <Card><Text style={styles.empty}>No results yet. Your marksheet appears here once marks are published by the office.</Text></Card>
      ) : (
        <>
          <View style={styles.statRow}>
            <StatCard label="CGPA" value={cgpa.toFixed(2)} accent={cgpa >= 7 ? colors.emerald : cgpa >= 5 ? colors.amber : colors.rose} />
            <View style={{ width: spacing.md }} />
            <StatCard label="Passed" value={String(passed)} accent={colors.emerald} />
            <View style={{ width: spacing.md }} />
            <StatCard label="Arrears" value={String(arrears)} accent={arrears > 0 ? colors.rose : colors.textFaint} />
          </View>

          {arrears > 0 ? (
            <View style={styles.arrearNote}>
              <Text style={styles.arrearText}>
                You have {arrears} arrear subject{arrears !== 1 ? "s" : ""}. Contact your department office to register for the supplementary / re-exam.
              </Text>
            </View>
          ) : null}

          {semesters.map((sem) => {
            const semRows = bySem[sem];
            const semCgpa = computeCGPA(semRows);
            const semArrears = semRows.filter((r) => r.is_arrear).length;
            return (
              <Card key={sem} style={{ padding: 0, overflow: "hidden" }}>
                <View style={styles.semHeader}>
                  <View style={styles.semHeaderLeft}>
                    <Text style={styles.semTitle}>Semester {sem}</Text>
                    {semArrears > 0 ? (
                      <View style={styles.arrearBadge}><Text style={styles.arrearBadgeText}>{semArrears} arrear</Text></View>
                    ) : null}
                  </View>
                  <Text style={[styles.semCgpa, { color: semCgpa >= 7 ? colors.emerald : semCgpa >= 5 ? colors.amber : colors.rose }]}>
                    {semCgpa.toFixed(2)}
                  </Text>
                </View>
                {semRows.map((r) => {
                  const gc = gradeColor(r.grade);
                  return (
                    <View key={r.id} style={[styles.subjectRow, r.is_arrear && styles.subjectRowArrear]}>
                      <View style={styles.subjectInfo}>
                        <Text style={styles.subjectName} numberOfLines={1}>{r.subject_name}</Text>
                        <Text style={styles.subjectMarks}>{r.marks_scored}/{r.max_marks} · pass {r.pass_marks}</Text>
                      </View>
                      <View style={styles.gradeWrap}>
                        <View style={[styles.gradeChip, { backgroundColor: gc.bg }]}>
                          <Text style={[styles.gradeChipText, { color: gc.fg }]}>{r.grade}</Text>
                        </View>
                        <Text style={styles.gp}>{gradePoint(r.grade)} GP</Text>
                      </View>
                    </View>
                  );
                })}
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  statRow: { flexDirection: "row", marginBottom: spacing.md },
  empty: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  arrearNote: { backgroundColor: "#FFE4E6", borderColor: "#FECDD3", borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  arrearText: { color: "#BE123C", fontSize: 12, lineHeight: 18 },
  semHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#F8FAFC", borderBottomColor: colors.border, borderBottomWidth: 1,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  semHeaderLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  semTitle: { fontSize: 12, fontWeight: "800", color: colors.violet, textTransform: "uppercase", letterSpacing: 0.5 },
  arrearBadge: { backgroundColor: "#FFE4E6", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  arrearBadgeText: { color: colors.rose, fontSize: 9, fontWeight: "800" },
  semCgpa: { fontSize: 14, fontWeight: "800" },
  subjectRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomColor: "#F1F5F9", borderBottomWidth: 1,
  },
  subjectRowArrear: { backgroundColor: "#FFF1F2" },
  subjectInfo: { flex: 1, minWidth: 0 },
  subjectName: { fontSize: 13, fontWeight: "600", color: colors.text },
  subjectMarks: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
  gradeWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  gradeChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  gradeChipText: { fontSize: 11, fontWeight: "800" },
  gp: { fontSize: 10, fontWeight: "700", color: colors.textFaint, width: 38, textAlign: "right" },
});
