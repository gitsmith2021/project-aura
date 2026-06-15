import { useCallback, useEffect, useState } from "react";
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Card, Loading, ErrorNote, PrimaryButton } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";

type LeaveType = "sick" | "casual" | "earned" | "maternity" | "paternity" | "other";
type LeaveRequest = {
  id: string;
  leave_type: LeaveType;
  from_date: string;
  to_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  created_at: string;
};

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "casual", label: "Casual" },
  { value: "sick", label: "Sick" },
  { value: "earned", label: "Earned" },
  { value: "maternity", label: "Maternity" },
  { value: "paternity", label: "Paternity" },
  { value: "other", label: "Other" },
];

const STATUS_COLOR: Record<string, string> = {
  pending: colors.amber, approved: colors.emerald, rejected: colors.rose,
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function Leave() {
  const { identity } = useAuth();
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>("casual");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leave_requests")
      .select("id, leave_type, from_date, to_date, reason, status, review_note, created_at")
      .eq("staff_id", identity?.staffId ?? "")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows((data ?? []) as LeaveRequest[]);
    setLoading(false);
  }, [identity?.staffId]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    setFormError(null);
    if (!DATE_RE.test(fromDate) || !DATE_RE.test(toDate)) {
      setFormError("Dates must be in YYYY-MM-DD format.");
      return;
    }
    if (fromDate > toDate) {
      setFormError("From date must be on or before to date.");
      return;
    }
    if (reason.trim().length < 10) {
      setFormError("Reason must be at least 10 characters.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("leave_requests").insert({
      institution_id: identity?.institutionId,
      staff_id: identity?.staffId,
      leave_type: leaveType,
      from_date: fromDate,
      to_date: toDate,
      reason: reason.trim(),
      status: "pending",
    });
    setSubmitting(false);
    if (error) { setFormError(error.message); return; }
    setShowForm(false);
    setFromDate(""); setToDate(""); setReason(""); setLeaveType("casual");
    load();
  };

  if (loading) return <Loading />;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {error ? <ErrorNote message={error} /> : null}

      <Pressable onPress={() => setShowForm((s) => !s)} style={styles.applyToggle}>
        <Text style={styles.applyToggleText}>{showForm ? "Cancel" : "+ Apply for Leave"}</Text>
      </Pressable>

      {showForm && (
        <Card>
          <Text style={styles.label}>Type</Text>
          <View style={styles.chips}>
            {LEAVE_TYPES.map((t) => (
              <Pressable
                key={t.value}
                onPress={() => setLeaveType(t.value)}
                style={[styles.chip, leaveType === t.value && styles.chipActive]}
              >
                <Text style={[styles.chipText, leaveType === t.value && styles.chipTextActive]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>From</Text>
              <TextInput value={fromDate} onChangeText={setFromDate} placeholder="2026-06-20"
                placeholderTextColor={colors.textFaint} style={styles.input} autoCapitalize="none" />
            </View>
            <View style={{ width: spacing.md }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>To</Text>
              <TextInput value={toDate} onChangeText={setToDate} placeholder="2026-06-21"
                placeholderTextColor={colors.textFaint} style={styles.input} autoCapitalize="none" />
            </View>
          </View>

          <Text style={styles.label}>Reason</Text>
          <TextInput value={reason} onChangeText={setReason} placeholder="Reason for leave (min 10 chars)"
            placeholderTextColor={colors.textFaint} style={[styles.input, styles.textarea]} multiline />

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <View style={{ height: spacing.sm }} />
          <PrimaryButton label="Submit Request" onPress={submit} loading={submitting} />
        </Card>
      )}

      {rows.length === 0 ? (
        <Card><Text style={styles.empty}>No leave requests yet.</Text></Card>
      ) : (
        rows.map((r) => (
          <Card key={r.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.type}>{LEAVE_TYPES.find((t) => t.value === r.leave_type)?.label ?? r.leave_type}</Text>
              <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[r.status] ?? colors.textMuted) + "22" }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[r.status] ?? colors.textMuted }]}>{r.status}</Text>
              </View>
            </View>
            <Text style={styles.dates}>{r.from_date} → {r.to_date}</Text>
            <Text style={styles.reason}>{r.reason}</Text>
            {r.review_note ? <Text style={styles.note}>Note: {r.review_note}</Text> : null}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  applyToggle: { alignSelf: "flex-start", marginBottom: spacing.md },
  applyToggleText: { color: colors.violet, fontWeight: "700", fontSize: 13 },
  label: { fontSize: 12, fontWeight: "600", color: colors.text, marginTop: spacing.sm, marginBottom: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.card },
  chipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  chipText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: colors.white },
  dateRow: { flexDirection: "row" },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 14, color: colors.text,
  },
  textarea: { minHeight: 70, textAlignVertical: "top" },
  formError: { color: colors.rose, fontSize: 12, marginTop: spacing.sm },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  type: { fontSize: 15, fontWeight: "700", color: colors.text },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  dates: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: "600" },
  reason: { fontSize: 13, color: colors.text, marginTop: 4 },
  note: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontStyle: "italic" },
  empty: { color: colors.textMuted, fontSize: 13 },
});
