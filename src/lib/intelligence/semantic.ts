// ════════════════════════════════════════════════════════════════════════════
// CF-3 v2 — Semantic resolution ("understand the DB values")
//
// Maps a free-text fragment to a real stored value: "computer science" → the
// department_id, "comp sci" → "Computer Science", etc. Three tiers, tried in
// order so the engine works at every level of setup:
//
//   1. exact     — case/space-insensitive equality against real values
//   2. substring — ILIKE-style contains
//   3. bigram    — Dice-coefficient fuzzy match (pure, no DB, no embeddings)
//   4. vector    — pgvector cosine via RPC (ONLY when a query embedding exists)
//
// Tiers 1–3 are pure/deterministic and need no embeddings — they alone satisfy
// the acceptance tests. Tier 4 is the optional enhancement (gte-small).
// The pure helpers (normalize, bigramSimilarity, rankCandidates) are unit-tested.
// ════════════════════════════════════════════════════════════════════════════

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Candidate = { raw: string; resolved: string };
export type Resolution = { raw: string; resolved: string; score: number; via: "exact" | "substring" | "bigram" | "vector" };

export const normalize = (s: string): string =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Dice coefficient over character bigrams — robust to typos/abbreviations. */
export function bigramSimilarity(a: string, b: string): number {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const grams = (s: string) => {
    const g = new Map<string, number>();
    const t = s.replace(/ /g, "");
    for (let i = 0; i < t.length - 1; i++) {
      const k = t.slice(i, i + 2);
      g.set(k, (g.get(k) ?? 0) + 1);
    }
    return g;
  };
  const ga = grams(na), gb = grams(nb);
  if (ga.size === 0 || gb.size === 0) return 0;
  let inter = 0;
  for (const [k, va] of ga) inter += Math.min(va, gb.get(k) ?? 0);
  return (2 * inter) / (ga.size + gb.size + [...ga.values()].reduce((s, n) => s + n - 1, 0) + [...gb.values()].reduce((s, n) => s + n - 1, 0));
}

/** Rank candidates against a query through tiers 1–3. Returns the best, if any clears the floor. */
export function rankCandidates(query: string, candidates: Candidate[], floor = 0.34): Resolution | null {
  const q = normalize(query);
  if (!q) return null;
  let best: Resolution | null = null;
  for (const c of candidates) {
    const nr = normalize(c.raw);
    let score: number, via: Resolution["via"];
    if (nr === q) { score = 1; via = "exact"; }
    else if (nr.includes(q) || q.includes(nr)) { score = 0.85; via = "substring"; }
    else { score = bigramSimilarity(q, c.raw); via = "bigram"; }
    if (!best || score > best.score) best = { raw: c.raw, resolved: c.resolved, score, via };
  }
  return best && best.score >= floor ? best : null;
}

// ── DB-touching resolvers (RLS-safe — they use the caller's client) ──────────────

/** Resolve a department name/abbreviation → department_id for this institution. */
export async function resolveDepartmentId(
  client: any, institutionId: string, query: string,
): Promise<Resolution | null> {
  const { data } = await client
    .from("departments").select("id, name")
    .eq("institution_id", institutionId);
  const rows: { id: string; name: string }[] = data ?? [];
  const candidates: Candidate[] = rows.map((r) => ({ raw: r.name, resolved: r.id }));
  return rankCandidates(query, candidates);
}

/** Resolve a value via the pre-built value index (any entity/column), tiers 1–3. */
export async function resolveIndexedValue(
  client: any, institutionId: string, entityKey: string, columnKey: string, query: string,
): Promise<Resolution | null> {
  const { data } = await client
    .from("intelligence_value_index").select("raw_value, resolved_value")
    .eq("institution_id", institutionId).eq("entity_key", entityKey).eq("column_key", columnKey);
  const candidates: Candidate[] = (data ?? []).map((r: any) => ({ raw: r.raw_value, resolved: r.resolved_value }));
  if (candidates.length === 0) return null;
  return rankCandidates(query, candidates);
}

/**
 * Resolve a free-text value to the real stored value for an entity/column.
 *  - department_id columns → live name→id lookup (no index needed)
 *  - otherwise            → the value index if present, else null (caller falls
 *                            back to an ILIKE filter on the literal token)
 */
export async function resolveValue(
  client: any, institutionId: string, entityKey: string, columnKey: string, query: string,
): Promise<Resolution | null> {
  if (columnKey === "department_id") return resolveDepartmentId(client, institutionId, query);
  return resolveIndexedValue(client, institutionId, entityKey, columnKey, query);
}

// ── Optional vector tier (gte-small embeddings via Supabase edge fn) ─────────────

/** URL of the deployed gte-small `embed` edge function. Defaults to the project's
 *  Functions endpoint so no extra env var is needed once the function is deployed;
 *  override with SUPABASE_EMBED_URL if hosted elsewhere. */
function embedUrl(): string | null {
  if (process.env.SUPABASE_EMBED_URL) return process.env.SUPABASE_EMBED_URL;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base.replace(/\/$/, "")}/functions/v1/embed` : null;
}

/** Embed text with the in-stack gte-small model (returns null if unavailable). The
 *  function is custom-authenticated, so the service-role key is always sent. */
export async function embedText(text: string): Promise<number[] | null> {
  const url = embedUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ input: text }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return Array.isArray(json.embedding) ? json.embedding : null;
  } catch {
    return null;
  }
}

export function vectorAvailable(): boolean {
  return !!embedUrl() && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/** Vector resolution via the cosine RPC — only meaningful once embeddings exist. */
export async function resolveValueVector(
  client: any, institutionId: string, entityKey: string, columnKey: string, query: string,
): Promise<Resolution | null> {
  const emb = await embedText(query);
  if (!emb) return null;
  const { data } = await client.rpc("intelligence_match_values", {
    p_institution_id: institutionId, p_entity_key: entityKey, p_column_key: columnKey,
    query_embedding: emb as unknown as string, match_count: 1,
  });
  const hit = (data ?? [])[0] as { raw_value: string; resolved_value: string; distance: number } | undefined;
  if (!hit) return null;
  return { raw: hit.raw_value, resolved: hit.resolved_value, score: 1 - hit.distance, via: "vector" };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
