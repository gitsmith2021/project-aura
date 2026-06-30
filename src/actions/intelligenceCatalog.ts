"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { extractQuery } from "@/lib/intelligence/slotExtractor";
import { resolveDepartmentCandidates, rankAll, embedText, type Candidate } from "@/lib/intelligence/semantic";
import { buildSemanticIndex } from "@/actions/intelligenceAdmin";
import type { EntityDef } from "@/lib/dataExplorer";

// CF-3.1 WS7 — Semantic Catalog Manager backend (SUPER_ADMIN). Manage entity
// aliases, view catalog stats, inspect trigram + vector matches, rebuild the
// index, and see unrecognized questions — all without code changes.

/* eslint-disable @typescript-eslint/no-explicit-any */
type R<T> = { ok: true; data: T } | { ok: false; error: string };
async function db() { return createClient(await cookies()); }

async function requireSuper(): Promise<{ ok: true; supabase: any; userId: string } | { ok: false; error: string }> {
  const supabase = await db();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized." };
  const { data: member } = await supabase
    .from("institution_members").select("role").eq("profile_id", user.id).eq("role", "SUPER_ADMIN").maybeSingle();
  if (!member) return { ok: false, error: "The Semantic Catalog Manager is restricted to SUPER_ADMIN." };
  return { ok: true, supabase, userId: user.id };
}

const mapEntity = (r: Record<string, unknown>): EntityDef => ({
  key: r.key as string, label: r.label as string, category: r.category as string, source: r.source as string,
  columns: (r.columns as EntityDef["columns"]) ?? [], defaultDateField: (r.default_date_field as string | null) ?? null, sortOrder: (r.sort_order as number) ?? 0,
});

async function loadCatalog(supabase: any): Promise<EntityDef[]> {
  const { data } = await supabase.from("data_explorer_entities").select("key, label, category, source, columns, default_date_field, sort_order").eq("is_active", true).order("sort_order");
  return (data ?? []).map(mapEntity);
}

export type SemanticOverview = {
  entities: { key: string; label: string }[];
  aliasCount: number;
  termsCount: number; embeddedTerms: number;
  valueCount: number; embeddedValues: number;
  unrecognized: string[];
};

export async function getSemanticOverview(): Promise<R<SemanticOverview>> {
  const g = await requireSuper(); if (!g.ok) return g;
  const { supabase } = g;
  const entities = (await loadCatalog(supabase)).map((e) => ({ key: e.key, label: e.label }));
  const count = async (table: string, embeddedOnly = false) => {
    let q = supabase.from(table).select("id", { count: "exact", head: true });
    if (embeddedOnly) q = q.not("embedding", "is", null);
    const { count: n } = await q; return n ?? 0;
  };
  const aliasCount = await count("intelligence_entity_aliases");
  const termsCount = await count("intelligence_catalog_terms");
  const embeddedTerms = await count("intelligence_catalog_terms", true);
  const valueCount = await count("intelligence_value_index");
  const embeddedValues = await count("intelligence_value_index", true);
  const { data: recent } = await supabase
    .from("intelligence_queries").select("question").eq("response_type", "no_match").order("created_at", { ascending: false }).limit(40);
  const seen = new Set<string>(); const unrecognized: string[] = [];
  for (const r of (recent ?? []) as { question: string }[]) { const k = r.question.trim().toLowerCase(); if (!seen.has(k)) { seen.add(k); unrecognized.push(r.question); } if (unrecognized.length >= 10) break; }
  return { ok: true, data: { entities, aliasCount, termsCount, embeddedTerms, valueCount, embeddedValues, unrecognized } };
}

export type AliasRow = { id: string; entity_key: string; alias: string };
export async function listAliases(): Promise<R<AliasRow[]>> {
  const g = await requireSuper(); if (!g.ok) return g;
  const { data, error } = await g.supabase.from("intelligence_entity_aliases").select("id, entity_key, alias").order("entity_key").order("alias");
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as AliasRow[] };
}

export async function addAlias(entityKey: string, alias: string): Promise<R<{ id: string }>> {
  const g = await requireSuper(); if (!g.ok) return g;
  const a = alias.trim().toLowerCase();
  if (!entityKey || a.length < 2) return { ok: false, error: "Pick an entity and an alias of 2+ characters." };
  const cat = await loadCatalog(g.supabase);
  if (!cat.some((e) => e.key === entityKey)) return { ok: false, error: "Unknown entity." };
  const { data, error } = await g.supabase.from("intelligence_entity_aliases").insert({ entity_key: entityKey, alias: a, created_by: g.userId }).select("id").single();
  if (error) return { ok: false, error: error.code === "23505" ? "That alias already exists." : error.message };
  return { ok: true, data: { id: data.id as string } };
}

export async function deleteAlias(id: string): Promise<R<null>> {
  const g = await requireSuper(); if (!g.ok) return g;
  const { error } = await g.supabase.from("intelligence_entity_aliases").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export type MatchInspection = {
  routing: { entity: string | null; confidence: number | null; responseHint: string | null; filters: unknown[] };
  trigramDepartments: { raw: string; score: number; via: string }[];
  trigramValues: { raw: string; resolved: string; score: number; via: string }[];
  vectorTerms: { entity_key: string; column_key: string | null; term: string; distance: number }[] | null;
};

export async function inspectMatches(institutionId: string, query: string): Promise<R<MatchInspection>> {
  const g = await requireSuper(); if (!g.ok) return g;
  const { supabase } = g;
  if (!query.trim()) return { ok: false, error: "Enter a phrase to inspect." };

  const catalog = await loadCatalog(supabase);
  const { data: aliasRows } = await supabase.from("intelligence_entity_aliases").select("entity_key, alias");
  const aliases: Record<string, string[]> = {};
  for (const r of (aliasRows ?? []) as { entity_key: string; alias: string }[]) (aliases[r.entity_key] ??= []).push(r.alias.toLowerCase());
  const ex = extractQuery(query, catalog, aliases);

  const deps = institutionId ? await resolveDepartmentCandidates(supabase, institutionId, query) : [];
  const { data: vi } = institutionId
    ? await supabase.from("intelligence_value_index").select("raw_value, resolved_value").eq("institution_id", institutionId).limit(1000)
    : { data: [] };
  const valueCands: Candidate[] = (vi ?? []).map((r: any) => ({ raw: r.raw_value, resolved: r.resolved_value }));
  const trigramValues = rankAll(query, valueCands).slice(0, 5).map((r) => ({ raw: r.raw, resolved: r.resolved, score: round(r.score), via: r.via }));

  let vectorTerms: MatchInspection["vectorTerms"] = null;
  const emb = await embedText(query);
  if (emb) {
    const { data } = await supabase.rpc("intelligence_match_terms", { query_embedding: emb as unknown as string, match_count: 6 });
    vectorTerms = (data ?? []).map((r: any) => ({ entity_key: r.entity_key, column_key: r.column_key, term: r.term, distance: round(r.distance) }));
  }

  return {
    ok: true,
    data: {
      routing: { entity: ex?.entity ?? null, confidence: ex?.confidence ?? null, responseHint: ex?.responseHint ?? null, filters: ex?.filters ?? [] },
      trigramDepartments: deps.slice(0, 5).map((r) => ({ raw: r.raw, score: round(r.score), via: r.via })),
      trigramValues,
      vectorTerms,
    },
  };
}

export async function rebuildIndex(institutionId: string): Promise<R<{ terms: number; values: number; embedded: boolean }>> {
  const g = await requireSuper(); if (!g.ok) return g;
  if (!institutionId) return { ok: false, error: "Select an institution to rebuild its value index." };
  const res = await buildSemanticIndex(institutionId);
  return res.success ? { ok: true, data: res.data } : { ok: false, error: res.error };
}

const round = (n: number) => Math.round(n * 1000) / 1000;
/* eslint-enable @typescript-eslint/no-explicit-any */
