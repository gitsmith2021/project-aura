"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { embedText } from "@/lib/intelligence/semantic";
import type { EntityDef } from "@/lib/dataExplorer";

// CF-3 v2 — build the semantic catalog (vector search index). SUPER_ADMIN-gated.
// Seeds entity/column terms (shared) and per-institution dimension values
// (departments name→id) so vector + fuzzy resolution have data to match against.
// Embeddings are best-effort (gte-small edge fn); the deterministic resolver
// works without them, so a missing SUPABASE_EMBED_URL is non-fatal.

type Result = { success: true; data: { terms: number; values: number; embedded: boolean } } | { success: false; error: string };

async function db() { return createClient(await cookies()); }

export async function buildSemanticIndex(institutionId: string): Promise<Result> {
  try {
    const supabase = await db();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };
    const { data: member } = await supabase
      .from("institution_members").select("role").eq("profile_id", user.id).eq("role", "SUPER_ADMIN").maybeSingle();
    if (!member) return { success: false, error: "Only a SUPER_ADMIN may build the semantic index." };

    const { data: entRows } = await supabase
      .from("data_explorer_entities").select("key, label, category, source, columns").eq("is_active", true);
    const entities = (entRows ?? []) as unknown as EntityDef[];

    // 1) Catalog terms — one per entity + one per column (shared across institutions).
    let terms = 0;
    let embedded = false;
    for (const e of entities) {
      const entDesc = `${e.label} (${e.category}). Entity for querying ${e.label.toLowerCase()} records.`;
      const eEmb = await embedText(`${e.label} ${e.category}`);
      if (eEmb) embedded = true;
      await supabase.from("intelligence_catalog_terms").upsert(
        { kind: "entity", entity_key: e.key, column_key: null, term: e.label, description: entDesc, embedding: eEmb as unknown as string ?? null },
        { onConflict: "kind,entity_key,column_key,term" },
      );
      terms++;
      for (const c of e.columns) {
        const cEmb = await embedText(`${c.label} ${e.label}`);
        await supabase.from("intelligence_catalog_terms").upsert(
          { kind: "column", entity_key: e.key, column_key: c.key, term: c.label, description: `${c.label} of ${e.label}`, embedding: cEmb as unknown as string ?? null },
          { onConflict: "kind,entity_key,column_key,term" },
        );
        terms++;
      }
    }

    // 2) Value index — departments name→id for every entity that has department_id.
    const { data: depts } = await supabase
      .from("departments").select("id, name").eq("institution_id", institutionId);
    let values = 0;
    const deptEntities = entities.filter((e) => e.columns.some((c) => c.key === "department_id"));
    for (const e of deptEntities) {
      for (const d of (depts ?? []) as { id: string; name: string }[]) {
        const emb = await embedText(d.name);
        if (emb) embedded = true;
        await supabase.from("intelligence_value_index").upsert(
          { institution_id: institutionId, entity_key: e.key, column_key: "department_id", raw_value: d.name, resolved_value: d.id, embedding: emb as unknown as string ?? null },
          { onConflict: "institution_id,entity_key,column_key,raw_value" },
        );
        values++;
      }
    }

    return { success: true, data: { terms, values, embedded } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
