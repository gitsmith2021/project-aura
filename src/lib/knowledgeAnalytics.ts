// Phase 7X / KH-4 — Knowledge Hub analytics: pure metric computations.
// No React / no Supabase — fully unit-testable (Dev Rule 18). The dashboard and
// the CSV export both read these.

import { KH_CATEGORIES, NAAC_CRITERIA, categoryLabel, type KnowledgeCategory } from "./knowledgeHub";

export type AnalyticsResource = {
  category: string;
  content_type: string;
  department_id: string | null;
  naac_criterion: string | null;
  created_at: string;
  download_count: number;
  uploader_name: string | null;
  status: string;
  departments?: { name: string } | null;
};

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Upload counts per month for the trailing `months` months (oldest → newest). */
export function uploadsByMonth(resources: AnalyticsResource[], months = 12, now: Date = new Date()): { month: string; count: number }[] {
  const buckets: { month: string; count: number }[] = [];
  const index = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    index.set(key, buckets.length);
    buckets.push({ month: key, count: 0 });
  }
  for (const r of resources) {
    const key = r.created_at.slice(0, 7);
    const at = index.get(key);
    if (at !== undefined) buckets[at].count += 1;
  }
  return buckets;
}

/** Counts for all 7 categories (zero-filled), most first. */
export function uploadsByCategory(resources: AnalyticsResource[]): { category: KnowledgeCategory; label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of resources) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
  return KH_CATEGORIES
    .map((c) => ({ category: c.value, label: c.label, count: counts.get(c.value) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

/** Per-department upload counts (named), most first. */
export function uploadsByDepartment(resources: AnalyticsResource[]): { department: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of resources) {
    const name = r.departments?.name ?? "Unassigned";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts, ([department, count]) => ({ department, count })).sort((a, b) => b.count - a.count);
}

/** Top contributors by uploads (downloads as tiebreak), grouped by uploader name. */
export function topContributors(resources: AnalyticsResource[], n = 8): { name: string; uploads: number; downloads: number }[] {
  const map = new Map<string, { uploads: number; downloads: number }>();
  for (const r of resources) {
    const name = r.uploader_name ?? "Unknown";
    const cur = map.get(name) ?? { uploads: 0, downloads: 0 };
    cur.uploads += 1;
    cur.downloads += r.download_count;
    map.set(name, cur);
  }
  return Array.from(map, ([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.uploads - a.uploads || b.downloads - a.downloads)
    .slice(0, n);
}

/** NAAC criterion coverage from accreditation resources; flags under-evidenced criteria. */
export function naacCoverage(resources: AnalyticsResource[], minPerCriterion = 3): { criterion: string; label: string; count: number; gap: boolean }[] {
  const counts = new Map<string, number>();
  for (const r of resources) {
    if (r.category === "accreditation" && r.naac_criterion) counts.set(r.naac_criterion, (counts.get(r.naac_criterion) ?? 0) + 1);
  }
  return NAAC_CRITERIA.map((c) => {
    const count = counts.get(c.value) ?? 0;
    return { criterion: c.value, label: c.label, count, gap: count < minPerCriterion };
  });
}

/** Share of faculty who have uploaded at least one resource. */
export function departmentParticipation(resources: AnalyticsResource[], facultyCount: number): { uploaders: number; facultyCount: number; pct: number } {
  const uploaders = new Set(resources.map((r) => r.uploader_name).filter(Boolean) as string[]).size;
  const pct = facultyCount > 0 ? Math.round((uploaders / facultyCount) * 100) : 0;
  return { uploaders, facultyCount, pct };
}

export type HealthScore = {
  score: number;
  volume: number;
  diversity: number;
  currency: number;
  participation: number;
};

/**
 * Composite Knowledge Health Score (0–100):
 *   volume (30%)        — count vs a soft target of 100
 *   diversity (25%)     — how many of the 7 categories have content
 *   currency (25%)      — share uploaded in the last 12 months
 *   participation (20%) — faculty who have contributed
 */
export function knowledgeHealthScore(resources: AnalyticsResource[], facultyCount: number, now: Date = new Date()): HealthScore {
  const total = resources.length;
  const volume = Math.round(Math.min(total / 100, 1) * 100);
  const categoriesWith = new Set(resources.map((r) => r.category)).size;
  const diversity = Math.round((categoriesWith / KH_CATEGORIES.length) * 100);
  const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString();
  const recent = resources.filter((r) => r.created_at >= yearAgo).length;
  const currency = total > 0 ? Math.round((recent / total) * 100) : 0;
  const participation = departmentParticipation(resources, facultyCount).pct;
  const score = Math.round(0.3 * volume + 0.25 * diversity + 0.25 * currency + 0.2 * participation);
  return { score, volume, diversity, currency, participation };
}

/** Build a CSV summary of the analytics (for export). */
export function analyticsCsv(resources: AnalyticsResource[], facultyCount: number, now: Date = new Date()): string {
  const lines: string[] = [];
  const push = (...cells: (string | number)[]) => lines.push(cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));

  const health = knowledgeHealthScore(resources, facultyCount, now);
  push("Section", "Metric", "Value");
  push("Overview", "Total resources", resources.length);
  push("Overview", "Knowledge Health Score", health.score);
  push("Overview", "Faculty participation %", health.participation);

  for (const c of uploadsByCategory(resources)) push("By category", c.label, c.count);
  for (const d of uploadsByDepartment(resources)) push("By department", d.department, d.count);
  for (const t of topContributors(resources, 100)) push("Top contributors", t.name, `${t.uploads} uploads / ${t.downloads} downloads`);
  for (const n of naacCoverage(resources)) push("NAAC coverage", n.label, `${n.count}${n.gap ? " (GAP)" : ""}`);

  return lines.join("\n");
}

// Re-export for convenience in the dashboard.
export { categoryLabel };
