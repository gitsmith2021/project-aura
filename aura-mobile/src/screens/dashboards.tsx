import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth, type Identity } from "@/context/AuthContext";
import { roleLabel } from "@/lib/roles";
import { Card, StatCard, SectionTitle, Loading, ErrorNote } from "@/components/ui";
import { QuickLinks } from "@/components/QuickLinks";
import { colors, radius, spacing, inr } from "@/lib/theme";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const todayName = () => DAY_NAMES[new Date().getDay()];
const intFmt = new Intl.NumberFormat("en-IN");

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
        <Text style={styles.note}>Open the Attendance, Fees and Results tabs below for the full breakdown.</Text>
      </Card>
      <QuickLinks
        links={[
          { icon: "notifications-outline", label: "Notifications", href: "/notifications", accent: colors.rose },
          { icon: "library-outline", label: "Knowledge Hub", href: "/knowledge", accent: colors.sky },
          { icon: "download-outline", label: "Downloads", href: "/downloads", accent: colors.emerald },
          { icon: "person-outline", label: "Profile", href: "/profile" },
        ]}
      />
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
          Open the Schedule tab for your weekly classes and the Leave and Payslip tabs for your records. Enter internal
          assessment marks from CIA Marks below.
        </Text>
      </Card>
      <QuickLinks
        links={[
          { icon: "clipboard-outline", label: "CIA Marks", href: "/cia", accent: colors.violet },
          { icon: "library-outline", label: "Knowledge Hub", href: "/knowledge", accent: colors.sky },
          { icon: "notifications-outline", label: "Notifications", href: "/notifications", accent: colors.rose },
          { icon: "person-outline", label: "Profile", href: "/profile" },
        ]}
      />
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

type DeptRow = { id: string; name: string; students: number; staff: number };

function OversightHome({ identity, scope }: { identity: Identity; scope: "institution" | "department" }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<number | null>(null);
  const [staff, setStaff] = useState<number | null>(null);
  const [instName, setInstName] = useState<string | null>(null);
  const [depts, setDepts] = useState<DeptRow[]>([]);
  const [admissions, setAdmissions] = useState<number | null>(null);
  const [feeCollected, setFeeCollected] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!identity.institutionId) { setLoading(false); return; }
        const studentQ = supabase.from("students").select("id", { count: "exact", head: true })
          .eq("institution_id", identity.institutionId);
        const staffQ = supabase.from("staff").select("id", { count: "exact", head: true })
          .eq("institution_id", identity.institutionId);
        const deptQ = supabase.from("departments")
          .select("id, name, students:students!department_id(count), staff:staff!department_id(count)")
          .eq("institution_id", identity.institutionId)
          .order("name");
        if (scope === "department" && identity.departmentId) {
          studentQ.eq("department_id", identity.departmentId);
          staffQ.eq("department_id", identity.departmentId);
          deptQ.eq("id", identity.departmentId);
        }
        const [s, st, inst, d] = await Promise.all([
          studentQ,
          staffQ,
          supabase.from("institutions").select("name").eq("id", identity.institutionId).maybeSingle(),
          deptQ,
        ]);
        setStudents(s.count ?? 0);
        setStaff(st.count ?? 0);
        setInstName(inst.data?.name ?? null);
        // Institution-level KPIs (admissions + fee collected). These entities aren't
        // department-scoped, so they're shown for the institution view only.
        if (scope === "institution") {
          const [adm, fees] = await Promise.all([
            supabase.from("admissions").select("id", { count: "exact", head: true }).eq("institution_id", identity.institutionId),
            supabase.from("fee_payments").select("amount_paid").eq("institution_id", identity.institutionId),
          ]);
          setAdmissions(adm.count ?? 0);
          setFeeCollected((fees.data ?? []).reduce((sum, f) => sum + (Number(f.amount_paid) || 0), 0));
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setDepts(((d.data ?? []) as any[]).map((row) => ({
          id: row.id,
          name: row.name,
          students: row.students?.[0]?.count ?? 0,
          staff: row.staff?.[0]?.count ?? 0,
        })).sort((a, b) => b.students - a.students));
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
      {scope === "institution" ? (
        <View style={styles.statRow}>
          <StatCard label="Admissions" value={admissions == null ? "—" : intFmt.format(admissions)} accent={colors.violet} />
          <View style={{ width: spacing.md }} />
          <StatCard label="Fee Collected" value={feeCollected == null ? "—" : inr.format(feeCollected)} accent={colors.emerald} />
        </View>
      ) : null}
      {depts.length > 0 ? (
        <>
          <SectionTitle>{scope === "department" ? "Department" : "Departments"}</SectionTitle>
          {depts.map((d) => (
            <View key={d.id} style={styles.deptRow}>
              <Text style={styles.deptName} numberOfLines={1}>{d.name}</Text>
              <View style={styles.deptCounts}>
                <Text style={styles.deptCount}>{intFmt.format(d.students)}<Text style={styles.deptCountLabel}> stu</Text></Text>
                <Text style={styles.deptCount}>{intFmt.format(d.staff)}<Text style={styles.deptCountLabel}> staff</Text></Text>
              </View>
            </View>
          ))}
        </>
      ) : null}

      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.note}>
          {scope === "institution"
            ? "Full administration — analytics, finance, NAAC/SSR exports and configuration — lives on the Aura web dashboard. This mobile view is for on-the-go oversight."
            : "Department analytics, approvals and CIA management are on the Aura web portal. This mobile view is a quick read-only snapshot."}
        </Text>
      </Card>
      <QuickLinks
        links={[
          { icon: "sparkles-outline", label: "Ask Aura", href: "/insights", accent: colors.violet },
          { icon: "notifications-outline", label: "Notifications", href: "/notifications", accent: colors.rose },
          { icon: "person-outline", label: "Profile", href: "/profile" },
        ]}
      />
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
  deptRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.xs,
  },
  deptName: { fontSize: 13, fontWeight: "600", color: colors.text, flex: 1, marginRight: spacing.sm },
  deptCounts: { flexDirection: "row", gap: spacing.md },
  deptCount: { fontSize: 13, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  deptCountLabel: { fontSize: 11, fontWeight: "400", color: colors.textFaint },
  note: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
});
