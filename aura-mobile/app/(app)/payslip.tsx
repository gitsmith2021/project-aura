import { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Card, Loading, ErrorNote, SectionTitle } from "@/components/ui";
import { colors, spacing, inr } from "@/lib/theme";

type Disbursement = {
  id: string;
  month: string;
  amount_disbursed: number;
  payment_mode: string | null;
  status: string;
  disbursed_at: string | null;
};

type Structure = {
  basic_salary: number; hra: number; ta: number; da: number; other_allowances: number;
  pf_deduction: number; esi_deduction: number; tds_deduction: number; other_deductions: number; net_salary: number;
};

const STATUS_COLOR: Record<string, string> = {
  processed: colors.emerald, pending: colors.amber, failed: colors.rose, on_hold: colors.textMuted,
};

function LineRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <View style={styles.lineRow}>
      <Text style={[styles.lineLabel, strong && styles.lineStrong]}>{label}</Text>
      <Text style={[styles.lineValue, strong && styles.lineStrong]}>{inr.format(value)}</Text>
    </View>
  );
}

export default function Payslip() {
  const { identity } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slips, setSlips] = useState<Disbursement[]>([]);
  const [structure, setStructure] = useState<Structure | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: disb, error: dErr }, { data: struct }] = await Promise.all([
          supabase.from("salary_disbursements")
            .select("id, month, amount_disbursed, payment_mode, status, disbursed_at")
            .eq("staff_id", identity?.staffId ?? "")
            .order("month", { ascending: false }),
          supabase.from("salary_structures")
            .select("basic_salary, hra, ta, da, other_allowances, pf_deduction, esi_deduction, tds_deduction, other_deductions, net_salary")
            .eq("staff_id", identity?.staffId ?? "")
            .eq("is_active", true)
            .maybeSingle(),
        ]);
        if (dErr) throw dErr;
        setSlips((disb ?? []).map((d) => ({ ...d, amount_disbursed: Number(d.amount_disbursed) })) as Disbursement[]);
        if (struct) {
          setStructure(Object.fromEntries(Object.entries(struct).map(([k, v]) => [k, Number(v)])) as Structure);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load payslip.");
      } finally {
        setLoading(false);
      }
    })();
  }, [identity?.staffId]);

  if (loading) return <Loading />;

  const earnings = structure
    ? structure.basic_salary + structure.hra + structure.ta + structure.da + structure.other_allowances
    : 0;
  const deductions = structure
    ? structure.pf_deduction + structure.esi_deduction + structure.tds_deduction + structure.other_deductions
    : 0;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {error ? <ErrorNote message={error} /> : null}

      {structure ? (
        <Card>
          <Text style={styles.netLabel}>Net Monthly Salary</Text>
          <Text style={styles.net}>{inr.format(structure.net_salary)}</Text>
          <View style={styles.divider} />
          <Text style={styles.blockTitle}>Earnings</Text>
          <LineRow label="Basic" value={structure.basic_salary} />
          <LineRow label="HRA" value={structure.hra} />
          <LineRow label="TA" value={structure.ta} />
          <LineRow label="DA" value={structure.da} />
          <LineRow label="Other allowances" value={structure.other_allowances} />
          <LineRow label="Total earnings" value={earnings} strong />
          <View style={styles.divider} />
          <Text style={styles.blockTitle}>Deductions</Text>
          <LineRow label="PF" value={structure.pf_deduction} />
          <LineRow label="ESI" value={structure.esi_deduction} />
          <LineRow label="TDS" value={structure.tds_deduction} />
          <LineRow label="Other" value={structure.other_deductions} />
          <LineRow label="Total deductions" value={deductions} strong />
        </Card>
      ) : (
        <Card><Text style={styles.empty}>No active salary structure on record.</Text></Card>
      )}

      <SectionTitle>Disbursement History</SectionTitle>
      {slips.length === 0 ? (
        <Card><Text style={styles.empty}>No disbursements yet.</Text></Card>
      ) : (
        slips.map((s) => (
          <Card key={s.id}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.month}>{s.month}</Text>
                <Text style={styles.sub}>
                  {s.payment_mode ?? "—"}
                  {s.disbursed_at ? ` · ${new Date(s.disbursed_at).toLocaleDateString("en-IN")}` : ""}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.amount}>{inr.format(s.amount_disbursed)}</Text>
                <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[s.status] ?? colors.textMuted) + "22" }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLOR[s.status] ?? colors.textMuted }]}>{s.status}</Text>
                </View>
              </View>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  netLabel: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  net: { fontSize: 28, fontWeight: "800", color: colors.emerald, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  blockTitle: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.xs },
  lineRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  lineLabel: { fontSize: 13, color: colors.textMuted },
  lineValue: { fontSize: 13, color: colors.text },
  lineStrong: { fontWeight: "800", color: colors.text },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  month: { fontSize: 15, fontWeight: "700", color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: "800", color: colors.text },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 3 },
  badgeText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  empty: { color: colors.textMuted, fontSize: 13 },
});
