import { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Card, Loading, ErrorNote, SectionTitle } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";

type Slot = {
  id: string;
  subject_name: string | null;
  day_of_week: string;
  start_time: string;
  end_time: string;
};

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const today = DAY_NAMES[new Date().getDay()];

function fmtTime(t: string): string {
  // "09:30:00" → "9:30 AM"
  const [hStr, m] = t.split(":");
  const h = Number(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${ampm}`;
}

// Staff weekly schedule — own classes (RLS scopes by staff_id).
export default function Schedule() {
  const { identity } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("class_schedules")
          .select("id, subject_name, day_of_week, start_time, end_time")
          .eq("staff_id", identity?.staffId ?? "")
          .order("start_time");
        if (error) throw error;
        setSlots((data ?? []) as Slot[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load your schedule.");
      } finally {
        setLoading(false);
      }
    })();
  }, [identity?.staffId]);

  if (loading) return <Loading />;

  const byDay = DAY_ORDER
    .map((day) => ({ day, items: slots.filter((s) => s.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time)) }))
    .filter((d) => d.items.length > 0);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {error ? <ErrorNote message={error} /> : null}
      {byDay.length === 0 ? (
        <Card><Text style={styles.empty}>No classes scheduled.</Text></Card>
      ) : (
        byDay.map(({ day, items }) => (
          <View key={day}>
            <SectionTitle>{day === today ? `${day} · Today` : day}</SectionTitle>
            {items.map((s) => (
              <Card key={s.id} style={day === today ? styles.todayCard : undefined}>
                <View style={styles.rowBetween}>
                  <Text style={styles.subject}>{s.subject_name ?? "Class"}</Text>
                  <Text style={styles.time}>{fmtTime(s.start_time)} – {fmtTime(s.end_time)}</Text>
                </View>
              </Card>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  subject: { fontSize: 15, fontWeight: "700", color: colors.text, flexShrink: 1 },
  time: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  todayCard: { borderColor: colors.violet, borderWidth: 1.5 },
  empty: { color: colors.textMuted, fontSize: 13 },
});
