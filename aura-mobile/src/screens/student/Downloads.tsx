import { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Card, Loading, ErrorNote } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";

// Downloads — the student's official documents (Phase 6C certificate_requests).
// Read-only under RLS (student reads own). Issued documents open their printable
// copy in the web portal (the official PDF lives there — same deep-link-to-web
// pattern as the parent Pay action; a web sign-in may be required).
const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

const CERT_LABELS: Record<string, string> = {
  bonafide: "Bonafide Certificate",
  transfer_certificate: "Transfer Certificate",
  character_certificate: "Character Certificate",
  noc: "No Objection Certificate",
  course_completion: "Course Completion Certificate",
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  requested: { label: "Requested", color: colors.amber },
  approved:  { label: "Approved",  color: colors.sky },
  issued:    { label: "Issued",    color: colors.emerald },
  rejected:  { label: "Rejected",  color: colors.rose },
};

type Doc = {
  id: string;
  certificate_type: string;
  status: string;
  certificate_no: string | null;
  purpose: string | null;
  issued_at: string | null;
  created_at: string;
};

export function Downloads() {
  const { identity } = useAuth();
  const studentId = identity?.studentId ?? "";
  const [rows, setRows] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("certificate_requests")
          .select("id, certificate_type, status, certificate_no, purpose, issued_at, created_at")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (active) setRows((data ?? []) as Doc[]);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load documents.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [studentId]);

  if (loading) return <Loading />;

  const openDoc = (id: string) => {
    if (BASE) Linking.openURL(`${BASE}/student-portal/certificates/${id}/print`).catch(() => {});
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {error ? <ErrorNote message={error} /> : null}
      {rows.length === 0 ? (
        <Card><Text style={styles.empty}>No documents yet. Request certificates (bonafide, TC, etc.) from the Aura web portal — their status appears here.</Text></Card>
      ) : (
        rows.map((d) => {
          const st = STATUS_META[d.status] ?? { label: d.status, color: colors.textMuted };
          const issued = d.status === "issued";
          return (
            <Card key={d.id}>
              <View style={styles.rowBetween}>
                <Text style={styles.title} numberOfLines={1}>{CERT_LABELS[d.certificate_type] ?? d.certificate_type}</Text>
                <View style={[styles.badge, { backgroundColor: st.color + "22" }]}>
                  <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>
              <Text style={styles.detail}>
                {d.certificate_no ? `${d.certificate_no} · ` : ""}
                {issued && d.issued_at ? `Issued ${new Date(d.issued_at).toLocaleDateString("en-IN")}` : `Requested ${new Date(d.created_at).toLocaleDateString("en-IN")}`}
              </Text>
              {d.purpose ? <Text style={styles.purpose}>{d.purpose}</Text> : null}
              {issued ? (
                <Pressable onPress={() => openDoc(d.id)} style={({ pressed }) => [styles.openBtn, pressed && styles.openBtnPressed]}>
                  <Ionicons name="download-outline" size={15} color={colors.violet} />
                  <Text style={styles.openBtnText}>Open in web portal</Text>
                </Pressable>
              ) : null}
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  empty: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  title: { fontSize: 14, fontWeight: "700", color: colors.text, flex: 1 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  detail: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  purpose: { fontSize: 12, color: colors.textFaint, marginTop: 2, fontStyle: "italic" },
  openBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginTop: spacing.md, paddingVertical: 9, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.violet,
  },
  openBtnPressed: { backgroundColor: "#EDE9FE" },
  openBtnText: { color: colors.violet, fontSize: 13, fontWeight: "700" },
});
