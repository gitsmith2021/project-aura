import { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Card, Loading, ErrorNote, StatCard } from "@/components/ui";
import { ParentFees } from "@/screens/parent/ParentFees";
import { colors, spacing, inr } from "@/lib/theme";

type Payment = {
  id: string;
  amount_paid: number;
  payment_status: string;
  payment_mode: string | null;
  paid_at: string | null;
  created_at: string;
  receipt_number: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  completed: colors.emerald, pending: colors.amber, failed: colors.rose, refunded: colors.textMuted,
};

// Role-adaptive: parents see their child's fee demands; students see own payments.
export default function Fees() {
  const { identity } = useAuth();
  if (identity?.tier === "parent") return <ParentFees />;
  return <StudentFees studentId={identity?.studentId ?? ""} />;
}

// Student fees — own payments (RLS scopes to the student).
function StudentFees({ studentId }: { studentId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("fee_payments")
          .select("id, amount_paid, payment_status, payment_mode, paid_at, created_at, receipt_number")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setPayments((data ?? []) as Payment[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load fees.");
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  if (loading) return <Loading />;

  const paid = payments.filter((p) => p.payment_status === "completed").reduce((s, p) => s + (Number(p.amount_paid) || 0), 0);
  const due = payments.filter((p) => p.payment_status === "pending").reduce((s, p) => s + (Number(p.amount_paid) || 0), 0);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {error ? <ErrorNote message={error} /> : null}
      <View style={{ flexDirection: "row", marginBottom: spacing.md }}>
        <StatCard label="Paid" value={inr.format(paid)} accent={colors.emerald} />
        <View style={{ width: spacing.md }} />
        <StatCard label="Due" value={inr.format(due)} accent={due > 0 ? colors.rose : colors.emerald} />
      </View>

      {payments.length === 0 ? (
        <Card><Text style={styles.empty}>No payment records yet.</Text></Card>
      ) : (
        payments.map((p) => (
          <Card key={p.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.amount}>{inr.format(Number(p.amount_paid) || 0)}</Text>
              <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[p.payment_status] ?? colors.textMuted) + "22" }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[p.payment_status] ?? colors.textMuted }]}>
                  {p.payment_status}
                </Text>
              </View>
            </View>
            <Text style={styles.detail}>
              {p.payment_mode ?? "—"}
              {p.receipt_number ? ` · ${p.receipt_number}` : ""}
              {p.paid_at ? ` · ${new Date(p.paid_at).toLocaleDateString("en-IN")}` : ""}
            </Text>
          </Card>
        ))
      )}
      {due > 0 ? (
        <Text style={styles.payNote}>Online payment from mobile is coming in a later build — pay via the Aura web portal for now.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  amount: { fontSize: 16, fontWeight: "800", color: colors.text },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  detail: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  empty: { color: colors.textMuted, fontSize: 13 },
  payNote: { fontSize: 11, color: colors.textFaint, textAlign: "center", marginTop: spacing.sm },
});
