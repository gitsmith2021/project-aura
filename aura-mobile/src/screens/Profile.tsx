import { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { roleLabel } from "@/lib/roles";
import { Card, Loading, ErrorNote } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";

// Read-only identity card — the "Profile" deliverable. Detail comes from the
// student/staff row under RLS (self-read). Account stays the session/sign-out
// hub; this screen is the richer identity view.
type Field = { icon: keyof typeof Ionicons.glyphMap; label: string; value: string | null };

const STAFF_TYPE_LABEL: Record<string, string> = {
  teaching: "Teaching",
  "non-teaching_office": "Office",
  "non-teaching_warden": "Warden",
  "non-teaching_mess": "Mess",
  "non-teaching_support": "Support",
};

export function Profile() {
  const { identity, session } = useAuth();
  const [fields, setFields] = useState<Field[]>([]);
  const [deptName, setDeptName] = useState<string | null>(null);
  const [instName, setInstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identity) { setLoading(false); return; }
    let active = true;
    (async () => {
      try {
        if (identity.departmentId) {
          const { data } = await supabase.from("departments").select("name").eq("id", identity.departmentId).maybeSingle();
          if (active) setDeptName((data?.name as string) ?? null);
        }
        if (identity.institutionId) {
          const { data } = await supabase.from("institutions").select("name").eq("id", identity.institutionId).maybeSingle();
          if (active) setInstName((data?.name as string) ?? null);
        }

        let d: Record<string, unknown> | null = null;
        if (identity.tier === "student" && identity.studentId) {
          const { data } = await supabase.from("students")
            .select("roll_number, programme, semester, student_year")
            .eq("id", identity.studentId).maybeSingle();
          d = data as Record<string, unknown> | null;
        } else if (identity.tier === "staff" && identity.staffId) {
          const { data } = await supabase.from("staff")
            .select("employee_id, designation, staff_type")
            .eq("id", identity.staffId).maybeSingle();
          d = data as Record<string, unknown> | null;
        }
        if (!active) return;

        const f: Field[] = [];
        if (identity.tier === "student") {
          if (d?.roll_number) f.push({ icon: "id-card-outline", label: "Roll No.", value: String(d.roll_number) });
          if (d?.programme) f.push({ icon: "ribbon-outline", label: "Programme", value: String(d.programme) });
          if (d?.semester != null) f.push({ icon: "layers-outline", label: "Semester", value: String(d.semester) });
          else if (d?.student_year != null) f.push({ icon: "layers-outline", label: "Year", value: String(d.student_year) });
        } else if (identity.tier === "staff") {
          if (d?.designation) f.push({ icon: "briefcase-outline", label: "Designation", value: String(d.designation) });
          if (d?.employee_id) f.push({ icon: "id-card-outline", label: "Employee ID", value: String(d.employee_id) });
          if (d?.staff_type) f.push({ icon: "people-outline", label: "Type", value: STAFF_TYPE_LABEL[String(d.staff_type)] ?? String(d.staff_type) });
        }
        setFields(f);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load profile.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [identity]);

  if (loading) return <Loading />;
  if (!identity) return <ErrorNote message="No profile available." />;

  const initials = (identity.fullName ?? session?.user?.email ?? "?")
    .split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {error ? <ErrorNote message={error} /> : null}
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials || "?"}</Text></View>
        <Text style={styles.name}>{identity.fullName ?? "User"}</Text>
        <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{roleLabel(identity.role)}</Text></View>
      </View>

      <Card>
        <Field icon="mail-outline" label="Email" value={session?.user?.email ?? "—"} />
        {deptName ? (<><Divider /><Field icon="git-branch-outline" label="Department" value={deptName} /></>) : null}
        {instName ? (<><Divider /><Field icon="business-outline" label="Institution" value={instName} /></>) : null}
        {fields.map((f, i) => (
          <View key={f.label}>
            <Divider />
            <Field icon={f.icon} label={f.label} value={f.value ?? "—"} />
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.note}>
          Profile details are maintained by your institution on the Aura web portal. Contact your administrator to
          correct any information shown here.
        </Text>
      </Card>
    </ScrollView>
  );
}

function Field({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
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
  rowLabel: { fontSize: 13, color: colors.textMuted, width: 96 },
  rowValue: { fontSize: 13, color: colors.text, fontWeight: "600", flex: 1, textAlign: "right" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  note: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
});
