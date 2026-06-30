import { useEffect, useState, useCallback } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { saveCIAMarks } from "@/lib/staffApi";
import { Card, Loading, ErrorNote, PrimaryButton } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";

// Staff CIA marks entry. Components/roster/marks are read directly under RLS
// (same data the web staff CIA page uses); the Save WRITE goes through
// /api/staff/cia-marks so the CF-1 toggle + audit log are enforced server-side.
type Component = {
  id: string;
  name: string;
  component_type: string;
  max_marks: number;
  semester: number;
  subject_id: string | null;
  department_id: string | null;
  subjects: { name: string; code: string | null } | null;
};

const TYPE_LABEL: Record<string, string> = {
  unit_test: "Unit Test", assignment: "Assignment", lab_record: "Lab Record",
  seminar: "Seminar", attendance_marks: "Attendance", viva: "Viva", other: "Other",
};

export function StaffCIA() {
  const { identity } = useAuth();
  const staffId = identity?.staffId ?? "";
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Component | null>(null);

  useEffect(() => {
    if (!staffId) { setLoading(false); return; }
    let active = true;
    (async () => {
      try {
        const { data: assigns, error: aErr } = await supabase
          .from("teaching_assignments").select("subject_id").eq("staff_id", staffId);
        if (aErr) throw aErr;
        const subjectIds = [...new Set((assigns ?? []).map((a) => a.subject_id).filter((v): v is string => !!v))];
        if (subjectIds.length === 0) { if (active) { setComponents([]); setLoading(false); } return; }

        const { data, error: cErr } = await supabase
          .from("cia_components")
          .select("id, name, component_type, max_marks, semester, subject_id, department_id, subjects(name, code)")
          .in("subject_id", subjectIds)
          .order("semester").order("created_at");
        if (cErr) throw cErr;
        if (active) setComponents((data ?? []) as unknown as Component[]);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load components.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [staffId]);

  if (loading) return <Loading />;
  if (selected) return <MarksGrid component={selected} onBack={() => setSelected(null)} />;

  // Group components by subject
  const groups = components.reduce<Record<string, { name: string; items: Component[] }>>((acc, c) => {
    const key = c.subjects ? `${c.subjects.name}${c.subjects.code ? ` (${c.subjects.code})` : ""}` : "Unassigned subject";
    (acc[key] = acc[key] ?? { name: key, items: [] }).items.push(c);
    return acc;
  }, {});

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {error ? <ErrorNote message={error} /> : null}
      {components.length === 0 ? (
        <Card><Text style={styles.empty}>No CIA components for your subjects yet. Your admin/HOD creates them against the subjects you teach; they appear here for marks entry.</Text></Card>
      ) : (
        Object.entries(groups).map(([key, g]) => (
          <View key={key} style={{ marginBottom: spacing.md }}>
            <Text style={styles.groupTitle}>{g.name}</Text>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {g.items.map((c, i) => (
                <Pressable
                  key={c.id}
                  onPress={() => setSelected(c)}
                  style={({ pressed }) => [styles.compRow, i > 0 && styles.compBorder, pressed && styles.compPressed]}
                >
                  <View style={styles.compInfo}>
                    <Text style={styles.compName}>{c.name}</Text>
                    <Text style={styles.compMeta}>
                      {TYPE_LABEL[c.component_type] ?? c.component_type} · Max {c.max_marks}
                      {c.semester ? ` · Sem ${c.semester}` : ""}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.violet} />
                </Pressable>
              ))}
            </Card>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ── Marks grid for one component ───────────────────────────────────────────────
type Row = { student_id: string; full_name: string; roll_number: string | null; value: string; original: number | null; dirty: boolean };

function MarksGrid({ component, onBack }: { component: Component; onBack: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!component.department_id) {
          if (active) { setRows([]); setLoading(false); setError("This component isn't linked to a department, so its student list can't be resolved. Ask an admin to set it."); }
          return;
        }
        const [{ data: studs, error: sErr }, { data: marks, error: mErr }] = await Promise.all([
          supabase.from("students").select("id, full_name, roll_number")
            .eq("department_id", component.department_id).order("full_name"),
          supabase.from("cia_marks").select("student_id, marks_scored").eq("cia_component_id", component.id),
        ]);
        if (sErr) throw sErr;
        if (mErr) throw mErr;
        const marksMap = new Map((marks ?? []).map((m) => [m.student_id as string, m.marks_scored as number]));
        if (active) {
          setRows((studs ?? []).map((s) => ({
            student_id: s.id as string,
            full_name: s.full_name as string,
            roll_number: (s.roll_number as string | null) ?? null,
            value: marksMap.has(s.id as string) ? String(marksMap.get(s.id as string)) : "",
            original: marksMap.get(s.id as string) ?? null,
            dirty: false,
          })));
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load students.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [component.id, component.department_id]);

  const onChange = useCallback((studentId: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, value, dirty: true } : r)));
    setSaved(false);
  }, []);

  const isInvalid = (r: Row) => {
    if (!r.dirty || r.value === "") return false;
    const v = parseFloat(r.value);
    return isNaN(v) || v < 0 || v > component.max_marks;
  };
  const dirtyCount = rows.filter((r) => r.dirty && r.value !== "").length;
  const invalidCount = rows.filter(isInvalid).length;

  const save = async () => {
    setSaving(true);
    setError(null);
    const valid = rows
      .filter((r) => r.dirty && r.value !== "" && !isInvalid(r))
      .map((r) => ({ student_id: r.student_id, marks_scored: parseFloat(r.value) }));
    if (valid.length === 0) { setSaving(false); setError("No valid changes to save."); return; }
    try {
      const res = await saveCIAMarks({ componentId: component.id, subjectId: component.subject_id, rows: valid });
      setSaved(true);
      setRows((prev) => prev.map((r) => ({ ...r, dirty: false, original: r.value !== "" ? parseFloat(r.value) : r.original })));
      void res;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save marks.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={onBack} hitSlop={8} style={styles.back}>
          <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
          <Text style={styles.backText}>My components</Text>
        </Pressable>

        <Text style={styles.gridTitle}>{component.name}</Text>
        <Text style={styles.gridSub}>
          {TYPE_LABEL[component.component_type] ?? component.component_type} · Max {component.max_marks}
          {component.subjects ? ` · ${component.subjects.name}` : ""}
        </Text>

        {error ? <View style={{ marginTop: spacing.md }}><ErrorNote message={error} /></View> : null}

        {loading ? <Loading /> : rows.length === 0 ? (
          <Card style={{ marginTop: spacing.md }}><Text style={styles.empty}>No students found in this department.</Text></Card>
        ) : (
          <>
            <View style={styles.statusBar}>
              <Text style={styles.statusText}>
                {rows.length} students
                {dirtyCount > 0 ? ` · ${dirtyCount} unsaved` : ""}
                {invalidCount > 0 ? ` · ${invalidCount} invalid` : ""}
              </Text>
              {saved ? <Text style={styles.savedText}>✓ Saved</Text> : null}
            </View>

            <Card style={{ padding: 0, overflow: "hidden", marginTop: spacing.sm }}>
              {rows.map((r, i) => {
                const bad = isInvalid(r);
                return (
                  <View key={r.student_id} style={[styles.markRow, i > 0 && styles.markBorder, r.dirty && styles.markDirty]}>
                    <Text style={styles.markIndex}>{i + 1}</Text>
                    <View style={styles.markInfo}>
                      <Text style={styles.markName} numberOfLines={1}>{r.full_name}</Text>
                      <Text style={styles.markRoll}>{r.roll_number ?? "—"}</Text>
                    </View>
                    <TextInput
                      value={r.value}
                      onChangeText={(t) => onChange(r.student_id, t)}
                      keyboardType="numeric"
                      placeholder="—"
                      placeholderTextColor={colors.textFaint}
                      style={[styles.input, bad && styles.inputBad, r.dirty && !bad && styles.inputDirty]}
                    />
                  </View>
                );
              })}
            </Card>

            <View style={{ marginTop: spacing.lg }}>
              <PrimaryButton
                label={`Save Marks${dirtyCount > 0 ? ` (${dirtyCount})` : ""}`}
                onPress={save}
                loading={saving}
                disabled={dirtyCount === 0 || invalidCount > 0}
              />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  empty: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  groupTitle: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.sm, marginLeft: 2 },
  compRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  compBorder: { borderTopColor: "#F1F5F9", borderTopWidth: 1 },
  compPressed: { backgroundColor: "#F8FAFC" },
  compInfo: { flex: 1, minWidth: 0 },
  compName: { fontSize: 14, fontWeight: "600", color: colors.text },
  compMeta: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
  back: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: spacing.md },
  backText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  gridTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  gridSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  statusBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md },
  statusText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  savedText: { fontSize: 12, color: colors.emerald, fontWeight: "700" },
  markRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  markBorder: { borderTopColor: "#F1F5F9", borderTopWidth: 1 },
  markDirty: { backgroundColor: "#FAF5FF" },
  markIndex: { fontSize: 12, color: colors.textFaint, width: 22 },
  markInfo: { flex: 1, minWidth: 0 },
  markName: { fontSize: 13, fontWeight: "600", color: colors.text },
  markRoll: { fontSize: 11, color: colors.textFaint, marginTop: 1, fontVariant: ["tabular-nums"] },
  input: {
    width: 72, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
    textAlign: "right", fontSize: 14, fontWeight: "700", color: colors.text,
  },
  inputDirty: { borderColor: colors.violet },
  inputBad: { borderColor: colors.rose, backgroundColor: "#FFF1F2", color: colors.rose },
});
