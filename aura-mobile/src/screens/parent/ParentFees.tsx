import { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet, Linking } from "react-native";
import { Card, StatCard, Loading, ErrorNote, PrimaryButton } from "@/components/ui";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { useParentChild } from "@/context/ParentChildContext";
import { parentApi, webFeesUrl, type ChildFeeRow } from "@/lib/parentApi";
import { colors, spacing, inr } from "@/lib/theme";

// Phase 8F — child fees (parent view). Payment opens the web parent portal fees
// page (in-app native Razorpay is deferred to an EAS build).
export function ParentFees() {
  const { selected } = useParentChild();
  const studentId = selected?.studentId;
  const [rows, setRows] = useState<ChildFeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const data = await parentApi.fees(studentId);
        if (active) setRows(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load fees.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [studentId]);

  if (loading) return <Loading />;
  if (!selected) return <ScrollView contentContainerStyle={styles.scroll}><Card><Text style={styles.empty}>No child linked.</Text></Card></ScrollView>;

  const netDue = (f: ChildFeeRow) => f.net_due ?? f.amount_due ?? 0;
  const totalDue = rows.filter((f) => f.status !== "paid").reduce((s, f) => s + netDue(f), 0);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ChildSwitcher />
      {error ? <ErrorNote message={error} /> : null}

      <View style={{ flexDirection: "row", marginBottom: spacing.md }}>
        <StatCard label="Total due" value={inr.format(totalDue)} accent={totalDue > 0 ? colors.amber : colors.emerald} />
      </View>

      {totalDue > 0 ? (
        <View style={{ marginBottom: spacing.md }}>
          <PrimaryButton label="Pay online" onPress={() => Linking.openURL(webFeesUrl())} />
          <Text style={styles.payHint}>Opens the secure Aura payment page in your browser.</Text>
        </View>
      ) : null}

      {rows.length === 0 ? (
        <Card><Text style={styles.empty}>No fee demands.</Text></Card>
      ) : (
        rows.map((f) => {
          const paid = f.status === "paid";
          return (
            <Card key={f.id}>
              <View style={styles.rowBetween}>
                <Text style={styles.title} numberOfLines={1}>{f.title}</Text>
                <Text style={[styles.amt, { color: paid ? colors.emerald : colors.text }]}>{inr.format(netDue(f))}</Text>
              </View>
              <Text style={styles.detail}>
                {paid ? "Paid" : f.due_date ? `Due ${f.due_date}` : "Pending"}
                {f.concession_amount ? ` · concession ${inr.format(f.concession_amount)}` : ""}
              </Text>
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
  title: { fontSize: 15, fontWeight: "700", color: colors.text, flexShrink: 1, marginRight: spacing.sm },
  amt: { fontSize: 15, fontWeight: "800" },
  detail: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  payHint: { fontSize: 11, color: colors.textFaint, textAlign: "center", marginTop: 6 },
  empty: { color: colors.textMuted, fontSize: 13 },
});
