import { useEffect, useState, useCallback } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Card, Loading, ErrorNote } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";

// In-app notification inbox. Reads/updates the notifications table directly
// under RLS ("recipient reads own" / "recipient marks own read"). This is the
// inbox shell — it surfaces notifications already created by the web triggers.
// Push delivery to the device is P8.5 (needs Phase 3 + a device-token table).
type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN");
}

export function Notifications() {
  const [rows, setRows] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, is_read, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setRows((data ?? []) as Notification[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load notifications.");
    }
  }, []);

  useEffect(() => {
    (async () => { await load(); setLoading(false); })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const markRead = useCallback(async (n: Notification) => {
    if (n.is_read) return;
    // Optimistic — RLS lets a recipient flag only their own rows.
    setRows((prev) => prev.map((r) => (r.id === n.id ? { ...r, is_read: true } : r)));
    await supabase.from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", n.id);
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = rows.filter((r) => !r.is_read);
    if (unread.length === 0) return;
    setRows((prev) => prev.map((r) => ({ ...r, is_read: true })));
    await supabase.from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", unread.map((r) => r.id));
  }, [rows]);

  if (loading) return <Loading />;

  const unreadCount = rows.filter((r) => !r.is_read).length;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.violet} />}
    >
      {error ? <ErrorNote message={error} /> : null}

      {rows.length > 0 ? (
        <View style={styles.toolbar}>
          <Text style={styles.count}>{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</Text>
          {unreadCount > 0 ? (
            <Pressable onPress={markAllRead} hitSlop={8}><Text style={styles.markAll}>Mark all read</Text></Pressable>
          ) : null}
        </View>
      ) : null}

      {rows.length === 0 ? (
        <Card><Text style={styles.empty}>No notifications yet.</Text></Card>
      ) : (
        rows.map((n) => (
          <Pressable key={n.id} onPress={() => markRead(n)}>
            <Card style={n.is_read ? undefined : styles.unreadCard}>
              <View style={styles.row}>
                {!n.is_read ? <View style={styles.dot} /> : <View style={styles.dotSpacer} />}
                <View style={styles.info}>
                  <Text style={[styles.title, !n.is_read && styles.titleUnread]} numberOfLines={2}>{n.title}</Text>
                  <Text style={styles.body} numberOfLines={3}>{n.body}</Text>
                  <Text style={styles.time}>{timeAgo(n.created_at)}</Text>
                </View>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  count: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  markAll: { fontSize: 12, fontWeight: "700", color: colors.violet },
  empty: { color: colors.textMuted, fontSize: 13 },
  unreadCard: { borderColor: "#DDD6FE", backgroundColor: "#FAF5FF" },
  row: { flexDirection: "row", gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.violet, marginTop: 5 },
  dotSpacer: { width: 8 },
  info: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: "600", color: colors.text },
  titleUnread: { fontWeight: "800" },
  body: { fontSize: 13, color: colors.textMuted, marginTop: 3, lineHeight: 18 },
  time: { fontSize: 11, color: colors.textFaint, marginTop: 6 },
});
