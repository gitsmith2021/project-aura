import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { Card, ErrorNote } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";
import { askExecutive, type MobileAnswer, type MBlock, type MKpi, type MColumn } from "@/lib/executiveApi";

// Phase 8 (P8.1) — Aura Intelligence (CF-3) on mobile. Ask a question in plain
// English; the web pipeline (under the caller's RLS) composes the answer, which
// we render mobile-first: summary + KPIs + a compact record list + follow-ups.
// Charts stay on the web dashboard — mobile shows the numbers and the narrative.

const SAMPLES = [
  "How many students do we have?",
  "Fee collection this year",
  "Faculty below ₹20,000 salary",
  "Students by department",
];
const TONE: Record<string, string> = { good: colors.emerald, warn: colors.amber, bad: colors.rose };
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

export function ExecutiveInsights() {
  const { identity } = useAuth();
  const institutionId = identity?.institutionId ?? "";
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<MobileAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(question: string) {
    if (!question.trim() || !institutionId) return;
    setQ(question); setBusy(true); setError(null); setAnswer(null);
    try { setAnswer(await askExecutive(institutionId, question)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not reach Aura Intelligence."); }
    finally { setBusy(false); }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Ionicons name="sparkles" size={18} color={colors.violet} />
        <Text style={styles.title}>Ask Aura</Text>
      </View>
      <Text style={styles.sub}>Ask anything about your institution.</Text>

      <View style={styles.inputRow}>
        <TextInput value={q} onChangeText={setQ} placeholder="e.g. Fee collection this year"
          placeholderTextColor={colors.textFaint} style={styles.input} onSubmitEditing={() => ask(q)} returnKeyType="search" />
        <TouchableOpacity style={styles.askBtn} onPress={() => ask(q)} disabled={busy || !q.trim()}>
          {busy ? <ActivityIndicator color={colors.white} size="small" /> : <Ionicons name="arrow-forward" size={18} color={colors.white} />}
        </TouchableOpacity>
      </View>

      {!answer && !busy ? (
        <View style={styles.chips}>{SAMPLES.map((s) => <Chip key={s} text={s} onPress={() => ask(s)} />)}</View>
      ) : null}

      {error ? <ErrorNote message={error} /> : null}
      {busy ? <View style={styles.center}><ActivityIndicator color={colors.violet} /><Text style={styles.dim}>Analysing…</Text></View> : null}

      {answer ? <AnswerView answer={answer} onAsk={ask} /> : null}
    </ScrollView>
  );
}

function AnswerView({ answer, onAsk }: { answer: MobileAnswer; onAsk: (q: string) => void }) {
  if (!answer.ok && answer.reason === "clarify") {
    return (
      <Card style={styles.clarify}>
        <Text style={styles.clarifyText}>{answer.message}</Text>
        <View style={styles.chips}>{answer.clarify.options.map((o) => <Chip key={o.label} text={o.label} onPress={() => onAsk(o.ask)} amber />)}</View>
      </Card>
    );
  }
  if (!answer.ok) {
    return (
      <Card>
        <Text style={styles.dim}>{answer.message}</Text>
        <View style={styles.chips}>{(answer.suggestions ?? []).map((s) => <Chip key={s} text={s} onPress={() => onAsk(s)} />)}</View>
      </Card>
    );
  }
  const { view, followups } = answer;
  if (view.empty) return <Card><Text style={styles.dim}>No data for that yet.</Text></Card>;
  return (
    <View>
      <Text style={styles.answerTitle}>{view.title}</Text>
      {view.blocks.map((b, i) => <BlockView key={i} block={b} />)}
      {followups.length ? (
        <>
          <Text style={styles.followLabel}>You may also want to ask</Text>
          <View style={styles.chips}>{followups.map((f) => <Chip key={f} text={f} onPress={() => onAsk(f)} />)}</View>
        </>
      ) : null}
    </View>
  );
}

function BlockView({ block }: { block: MBlock }) {
  switch (block.kind) {
    case "kpiStrip":
    case "comparison": {
      const kpis = (block.kpis as MKpi[]) ?? [];
      return (
        <View style={styles.kpiWrap}>
          {kpis.map((k) => (
            <View key={k.label} style={styles.kpi}>
              <Text style={[styles.kpiValue, { color: TONE[k.tone ?? ""] ?? colors.text }]}>{k.display}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
              {k.delta && k.delta.pct !== null ? (
                <Text style={[styles.kpiDelta, { color: k.delta.dir === "up" ? colors.emerald : k.delta.dir === "down" ? colors.rose : colors.textFaint }]}>
                  {k.delta.dir === "up" ? "▲" : k.delta.dir === "down" ? "▼" : "▬"} {Math.abs(k.delta.pct)}% {k.delta.label}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      );
    }
    case "summary":
      return (
        <Card style={styles.summary}>
          <Text style={styles.summaryLabel}>Executive Summary</Text>
          <Text style={styles.summaryText}>{String(block.text ?? "")}</Text>
        </Card>
      );
    case "alerts": {
      const items = (block.items as { severity: string; text: string }[]) ?? [];
      return (
        <View>
          {items.map((a, i) => (
            <View key={i} style={[styles.alert, { borderColor: TONE[a.severity] ?? colors.sky }]}>
              <Text style={[styles.alertText, { color: TONE[a.severity] ?? colors.text }]}>{a.text}</Text>
            </View>
          ))}
        </View>
      );
    }
    case "recommendations": {
      const items = (block.items as string[]) ?? [];
      return (
        <Card>
          <Text style={styles.summaryLabel}>Recommendations</Text>
          {items.map((it) => <Text key={it} style={styles.recRow}>› {it}</Text>)}
        </Card>
      );
    }
    case "recordGrid": {
      const columns = (block.columns as MColumn[]) ?? [];
      const rows = (block.rows as Record<string, unknown>[]) ?? [];
      const total = num(block.total);
      const nameCol = columns[0]?.key;
      const valCol = [...columns].reverse().find((c) => c.format === "currency" || c.format === "number")?.key;
      return (
        <Card>
          <Text style={styles.gridTitle}>{String(block.title ?? "Records")} · {total.toLocaleString("en-IN")}</Text>
          {rows.slice(0, 50).map((r, i) => (
            <View key={i} style={styles.gridRow}>
              <Text style={styles.gridName} numberOfLines={1}>{String(nameCol ? r[nameCol] ?? "—" : "—")}</Text>
              {valCol ? <Text style={styles.gridVal}>{num(r[valCol]).toLocaleString("en-IN")}</Text> : null}
            </View>
          ))}
          {rows.length > 50 ? <Text style={styles.dim}>Showing first 50 of {total.toLocaleString("en-IN")} — full list on the web dashboard.</Text> : null}
        </Card>
      );
    }
    case "chart":
    case "forecast":
    case "trend":
    case "timeline":
    case "heatmap":
    case "benchmark":
    case "riskMatrix":
      return <Card style={styles.chartNote}><Text style={styles.dim}>📊 A {block.kind} chart for this is on the Aura web dashboard.</Text></Card>;
    default:
      return null;
  }
}

function Chip({ text, onPress, amber }: { text: string; onPress: () => void; amber?: boolean }) {
  return (
    <TouchableOpacity style={[styles.chip, amber ? styles.chipAmber : null]} onPress={onPress}>
      <Text style={[styles.chipText, amber ? styles.chipTextAmber : null]}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 20, fontWeight: "800", color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2, marginBottom: spacing.lg },
  inputRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  input: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 14, color: colors.text },
  askBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.violet, alignItems: "center", justifyContent: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.md },
  chip: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  chipAmber: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
  chipTextAmber: { color: "#92400E" },
  center: { alignItems: "center", paddingVertical: spacing.xl, gap: 8 },
  dim: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  answerTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  kpiWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  kpi: { flexGrow: 1, minWidth: "45%", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  kpiValue: { fontSize: 20, fontWeight: "800", fontVariant: ["tabular-nums"] },
  kpiLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: "700" },
  kpiDelta: { fontSize: 11, fontWeight: "700", marginTop: 4 },
  summary: { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" },
  summaryLabel: { fontSize: 11, fontWeight: "800", color: colors.violetDark, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  summaryText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  alert: { backgroundColor: colors.card, borderWidth: 1, borderLeftWidth: 3, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.xs },
  alertText: { fontSize: 13, fontWeight: "600" },
  recRow: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  gridTitle: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  gridRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.border },
  gridName: { fontSize: 13, color: colors.text, flex: 1, marginRight: spacing.sm },
  gridVal: { fontSize: 13, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  chartNote: { backgroundColor: colors.bg },
  followLabel: { fontSize: 11, fontWeight: "700", color: colors.textFaint, textTransform: "uppercase", letterSpacing: 0.4, marginTop: spacing.lg },
  clarify: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
  clarifyText: { fontSize: 14, fontWeight: "600", color: "#92400E" },
});
