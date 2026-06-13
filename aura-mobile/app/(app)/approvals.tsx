import { useCallback, useEffect, useState } from "react";
import { ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Card, Loading, ErrorNote } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";

type Filter = "pending" | "all";
type Row = {
  id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  staff: { full_name: string; designation: string | null } | null;
};

const STATUS_COLOR: Record<string, string> = {
  pending: colors.amber, approved: colors.emerald, rejected: colors.rose,
};

export default function Approvals() {
  const { identity } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let q = supabase
      .from("leave_requests")
      .select("id, leave_type, from_date, to_date, reason, status, created_at, staff(full_name, designation)")
      .eq("institution_id", identity?.institutionId ?? "")
      .order("created_at", { ascending: false });
    if (filter === "pending") q = q.eq("status", "pending");
    const { data, error } = await q;
    if (error) setError(error.message);
    else setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  }, [identity?.institutionId, filter]);

  useEffect(() => { load(); }, [load]);

  const review = async (id: string, status: "approved" | "rejected") => {
    setActingId(id);
    setError(null);
    const { error } = await supabase.rpc("review_leave_request", { p_leave_id: id, p_status: status });
    setActingId(null);
    if (error) { setError(error.message); return; }
    load();
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        {(["pending", "all"] as Filter[]).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filterBtn, filter === f && styles.filterActive]}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === "pending" ? "Pending" : "All"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {error ? <ErrorNote message={error} /> : null}
          {rows.length === 0 ? (
            <Card><Text style={styles.empty}>{filter === "pending" ? "No pending leave requests." : "No leave requests."}</Text></Card>
          ) : (
            rows.map((r) => (
              <Card key={r.id}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{r.staff?.full_name ?? "—"}</Text>
                    {r.staff?.designation ? <Text style={styles.desig}>{r.staff.designation}</Text> : null}
                  </View>
                  <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[r.status] ?? colors.textMuted) + "22" }]}>
                    <Text style={[styles.badgeText, { color: STATUS_COLOR[r.status] ?? colors.textMuted }]}>{r.status}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>
                  <Text style={styles.metaStrong}>{r.leave_type}</Text> · {r.from_date} → {r.to_date}
                </Text>
                <Text style={styles.reason}>{r.reason}</Text>

                {r.status === "pending" ? (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => review(r.id, "rejected")}
                      disabled={actingId === r.id}
                      style={[styles.actionBtn, styles.reject]}
                    >
                      {actingId === r.id ? <ActivityIndicator size="small" color={colors.rose} /> : <Text style={styles.rejectText}>Reject</Text>}
                    </Pressable>
                    <Pressable
                      onPress={() => review(r.id, "approved")}
                      disabled={actingId === r.id}
                      style={[styles.actionBtn, styles.approve]}
                    >
                      {actingId === r.id ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.approveText}>Approve</Text>}
                    </Pressable>
                  </View>
                ) : null}
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  filterBar: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, paddingBottom: 0 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  filterActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  filterText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  filterTextActive: { color: colors.white },
  scroll: { padding: spacing.lg, paddingTop: spacing.md },
  rowBetween: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  desig: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  metaStrong: { color: colors.text, fontWeight: "700", textTransform: "capitalize" },
  reason: { fontSize: 13, color: colors.text, marginTop: 4 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flex: 1, borderRadius: radius.md, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  reject: { borderWidth: 1, borderColor: colors.rose },
  rejectText: { color: colors.rose, fontWeight: "700", fontSize: 13 },
  approve: { backgroundColor: colors.emerald },
  approveText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  empty: { color: colors.textMuted, fontSize: 13 },
});
