import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth, type Identity } from "@/context/AuthContext";
import { roleLabel } from "@/lib/roles";
import { Card, StatCard, Loading, ErrorNote } from "@/components/ui";
import { colors, radius, spacing, inr } from "@/lib/theme";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const todayName = () => DAY_NAMES[new Date().getDay()];

function Greeting({ identity }: { identity: Identity }) {
  return (
    <View style={styles.greeting}>
      <Text style={styles.hello}>{identity.fullName ?? "Welcome"}</Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleBadgeText}>{roleLabel(identity.role)}</Text>
      </View>
    </View>
  );
}

// ── Student ───────────────────────────────────────────────────────────────────
export function StudentHome({ identity }: { identity: Identity }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendancePct, setAttendancePct] = useState<number | null>(null);
  const [feesDue, setFeesDue] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [att, fees] = await Promise.all([
          supabase.from("attendance").select("status").eq("student_id", identity.studentId ?? ""),
          supabase.from("fee_payments").select("amount_paid, payment_status").eq("student_id", identity.studentId ?? ""),
        ]);
        const rows = att.data ?? [];
        const present = rows.filter((r) => r.status === "present" || r.status === "late").length;
        setAttendancePct(rows.length > 0 ? Math.round((present / rows.length) * 100) : null);
        setFeesDue(
          (fees.data ?? [])
            .filter((f) => f.payment_status === "pending")
            .reduce((sum, f) => sum + (Number(f.amount_paid) || 0), 0)
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load your dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, [identity.studentId]);

  if (loading) return <Loading label="Loading your dashboard…" />;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Greeting identity={identity} />
      {error ? <ErrorNote message={error} /> : null}
      <View style={styles.statRow}>
        <StatCard label="Attendance" value={attendancePct == null ? "—" : `${attendancePct}%`} accent={colors.emerald} />
        <View style={{ width: spacing.md }} />
        <StatCard label="Fees Due" value={feesDue > 0 ? inr.format(feesDue) : "₹0"} accent={feesDue > 0 ? colors.rose : colors.emerald} />
      </View>
      <Card>
        <Text style={styles.note}>Open the Attendance and Fees tabs below for the full breakdown.</Text>
      </Card>
    </ScrollView>
  );
}

// ── Staff ───────────────────────────────────────────────────────────────────
export function StaffHome({ identity }: { identity: Identity }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayClasses, setTodayClasses] = useState(0);
  const [pendingLeave, setPendingLeave] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [sched, leave] = await Promise.all([
          supabase.from("schedules").select("id", { count: "exact", head: true })
            .eq("staff_id", identity.staffId ?? "").eq("day_of_week", todayName()),
          supabase.from("leave_requests").select("id", { count: "exact", head: true })
            .eq("staff_id", identity.staffId ?? "").eq("status", "pending"),
        ]);
        setTodayClasses(sched.count ?? 0);
        setPendingLeave(leave.count ?? 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load your dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, [identity.staffId]);

  if (loading) return <Loading label="Loading your dashboard…" />;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Greeting identity={identity} />
      {error ? <ErrorNote message={error} /> : null}
      <View style={styles.statRow}>
        <StatCard label={`Classes ${todayName()}`} value={String(todayClasses)} />
        <View style={{ width: spacing.md }} />
        <StatCard label="Leave Pending" value={String(pendingLeave)} accent={colors.amber} />
      </View>
      <Card>
        <Text style={styles.note}>
          Open the Schedule tab for your weekly classes. CIA marks entry, leave applications and payslips are on the web
          staff portal — coming to mobile in a later build.
        </Text>
      </Card>
    </ScrollView>
  );
}

// ── HOD ───────────────────────────────────────────────────────────────────────
export function HodHome({ identity }: { identity: Identity }) {
  return <OversightHome identity={identity} scope="department" />;
}

// ── Admin / Principal / Super Admin ────────────────────────────────────────────
export function AdminHome({ identity }: { identity: Identity }) {
  return <OversightHome identity={identity} scope="institution" />;
}

function OversightHome({ identity, scope }: { identity: Identity; scope: "institution" | "department" }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<number | null>(null);
  const [staff, setStaff] = useState<number | null>(null);
  const [instName, setInstName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!identity.institutionId) { setLoading(false); return; }
        const studentQ = supabase.from("students").select("id", { count: "exact", head: true })
          .eq("institution_id", identity.institutionId);
        const staffQ = supabase.from("staff").select("id", { count: "exact", head: true })
          .eq("institution_id", identity.institutionId);
        if (scope === "department" && identity.departmentId) {
          studentQ.eq("department_id", identity.departmentId);
          staffQ.eq("department_id", identity.departmentId);
        }
        const [s, st, inst] = await Promise.all([
          studentQ,
          staffQ,
          supabase.from("institutions").select("name").eq("id", identity.institutionId).maybeSingle(),
        ]);
        setStudents(s.count ?? 0);
        setStaff(st.count ?? 0);
        setInstName(inst.data?.name ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load overview.");
      } finally {
        setLoading(false);
      }
    })();
  }, [identity.institutionId, identity.departmentId, scope]);

  if (loading) return <Loading label="Loading overview…" />;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Greeting identity={identity} />
      {instName ? <Text style={styles.instName}>{instName}</Text> : null}
      {error ? <ErrorNote message={error} /> : null}
      <View style={styles.statRow}>
        <StatCard label={scope === "department" ? "Dept Students" : "Students"} value={students == null ? "—" : String(students)} accent={colors.sky} />
        <View style={{ width: spacing.md }} />
        <StatCard label={scope === "department" ? "Dept Staff" : "Staff"} value={staff == null ? "—" : String(staff)} accent={colors.amber} />
      </View>
      <Card>
        <Text style={styles.note}>
          {scope === "institution"
            ? "Full administration — analytics, finance, NAAC/SSR exports and configuration — lives on the Aura web dashboard. This mobile view is for on-the-go oversight."
            : "Department analytics, approvals and CIA management are on the Aura web portal. This mobile view is a quick read-only snapshot."}
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  greeting: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  hello: { fontSize: 20, fontWeight: "800", color: colors.text, flexShrink: 1 },
  roleBadge: { backgroundColor: "#EDE9FE", borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  roleBadgeText: { color: colors.violetDark, fontSize: 11, fontWeight: "700" },
  instName: { fontSize: 13, color: colors.textMuted, marginTop: -spacing.md, marginBottom: spacing.md },
  statRow: { flexDirection: "row", marginBottom: spacing.sm },
  note: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
});
