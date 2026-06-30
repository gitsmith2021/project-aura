import { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Card, Loading, ErrorNote } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";

// Knowledge Hub — published study materials. Reads study_materials directly
// under RLS: students see published materials for their department's subjects;
// teaching staff see materials for the subjects they teach. Tapping a file/link
// opens it in the device browser (no native module needed).
type Material = {
  id: string;
  title: string;
  material_type: string;
  file_url: string | null;
  external_url: string | null;
  created_at: string;
  subjects: { name: string; code: string | null } | null;
};

const TYPE_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  notes:          { label: "Notes",          icon: "document-text-outline", color: colors.violet },
  slides:         { label: "Slides",         icon: "easel-outline",         color: colors.sky },
  video_link:     { label: "Video",          icon: "play-circle-outline",   color: colors.rose },
  scorm_package:  { label: "Interactive",    icon: "cube-outline",          color: colors.amber },
  question_paper: { label: "Question Paper", icon: "help-circle-outline",   color: colors.emerald },
  reference:      { label: "Reference",      icon: "link-outline",          color: colors.textMuted },
};

export function KnowledgeHub() {
  const [rows, setRows] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("study_materials")
          .select("id, title, material_type, file_url, external_url, created_at, subjects(name, code)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (active) setRows((data ?? []) as unknown as Material[]);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load materials.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) return <Loading />;

  const open = (m: Material) => {
    const url = m.external_url || m.file_url;
    if (url) Linking.openURL(url).catch(() => {});
  };

  // Group by subject for a tidy list
  const groups = rows.reduce<Record<string, { name: string; items: Material[] }>>((acc, m) => {
    const key = m.subjects ? `${m.subjects.name}${m.subjects.code ? ` (${m.subjects.code})` : ""}` : "General";
    (acc[key] = acc[key] ?? { name: key, items: [] }).items.push(m);
    return acc;
  }, {});

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {error ? <ErrorNote message={error} /> : null}
      {rows.length === 0 ? (
        <Card><Text style={styles.empty}>No study materials published yet.</Text></Card>
      ) : (
        Object.entries(groups).map(([key, g]) => (
          <View key={key} style={{ marginBottom: spacing.md }}>
            <Text style={styles.groupTitle}>{g.name}</Text>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {g.items.map((m, i) => {
                const meta = TYPE_META[m.material_type] ?? TYPE_META.reference;
                const url = m.external_url || m.file_url;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => open(m)}
                    disabled={!url}
                    style={({ pressed }) => [styles.item, i > 0 && styles.itemBorder, pressed && url ? styles.itemPressed : null]}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: meta.color + "1A" }]}>
                      <Ionicons name={meta.icon} size={18} color={meta.color} />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle} numberOfLines={2}>{m.title}</Text>
                      <Text style={styles.itemMeta}>{meta.label}</Text>
                    </View>
                    {url ? <Ionicons name="open-outline" size={16} color={colors.textFaint} /> : null}
                  </Pressable>
                );
              })}
            </Card>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
  empty: { color: colors.textMuted, fontSize: 13 },
  groupTitle: {
    fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase",
    letterSpacing: 0.5, marginBottom: spacing.sm, marginLeft: 2,
  },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  itemBorder: { borderTopColor: "#F1F5F9", borderTopWidth: 1 },
  itemPressed: { backgroundColor: "#F8FAFC" },
  iconWrap: { width: 34, height: 34, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  itemInfo: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 13, fontWeight: "600", color: colors.text },
  itemMeta: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
});
