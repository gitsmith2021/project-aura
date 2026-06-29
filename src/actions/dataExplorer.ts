"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";
import {
  validateQueryModel, compileFilters, groupAndAggregate, resultColumns,
  MAX_LIMIT, DEFAULT_LIMIT,
  type EntityDef, type QueryModel, type Condition, type ResultRow,
} from "@/lib/dataExplorer";

// AURA CORE FOUNDATION · CF-2 — Data Explorer server actions.
//
// Admin-tier only. Queries run through the user's own supabase client, so they
// are read-only by nature and RLS-respecting (a user only sees data they may
// already see). The Query Model is validated against the registry before any
// query is built — invalid models never reach the DB.

type Result<T> = { success: true; data: T } | { success: false; error: string };
const ADMIN_ROLES = ["SUPER_ADMIN", "INST_ADMIN", "PRINCIPAL"];

async function db() {
  return createClient(await cookies());
}

async function requireExplorerAdmin(institutionId: string): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await db();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized." };
  const { data: member } = await supabase
    .from("institution_members").select("role, institution_id").eq("profile_id", user.id).maybeSingle();
  if (!member || !ADMIN_ROLES.includes(member.role as string)) return { ok: false, error: "Not authorised." };
  if (member.role !== "SUPER_ADMIN" && member.institution_id !== institutionId) {
    return { ok: false, error: "Not authorised for this institution." };
  }
  return { ok: true, userId: user.id };
}

function mapEntity(row: Record<string, unknown>): EntityDef {
  return {
    key: row.key as string,
    label: row.label as string,
    category: row.category as string,
    source: row.source as string,
    columns: (row.columns as EntityDef["columns"]) ?? [],
    defaultDateField: (row.default_date_field as string | null) ?? null,
    sortOrder: (row.sort_order as number) ?? 0,
  };
}

/** The explorable entity registry (active entities). */
export async function listExplorerEntities(institutionId: string): Promise<Result<EntityDef[]>> {
  try {
    const guard = await requireExplorerAdmin(institutionId);
    if (!guard.ok) return { success: false, error: guard.error };
    const supabase = await db();
    const { data, error } = await supabase
      .from("data_explorer_entities")
      .select("key, label, category, source, columns, default_date_field, sort_order")
      .eq("is_active", true)
      .order("sort_order");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []).map(mapEntity) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function applyLeaf(query: any, c: Condition): any {
  switch (c.operator) {
    case "eq":  return query.eq(c.field, c.value);
    case "neq": return query.neq(c.field, c.value);
    case "gt":  return query.gt(c.field, c.value);
    case "gte": return query.gte(c.field, c.value);
    case "lt":  return query.lt(c.field, c.value);
    case "lte": return query.lte(c.field, c.value);
    case "like":  return query.like(c.field, `%${c.value}%`);
    case "ilike": return query.ilike(c.field, `%${c.value}%`);
    case "in":  return query.in(c.field, Array.isArray(c.value) ? c.value : [c.value]);
    case "is_null":  return query.is(c.field, null);
    case "not_null": return query.not(c.field, "is", null);
    case "between": {
      const [lo, hi] = Array.isArray(c.value) ? c.value : [undefined, undefined];
      return query.gte(c.field, lo).lte(c.field, hi);
    }
    default: return query;
  }
}

export type RunResult = { columns: string[]; rows: ResultRow[]; rowCount: number; capped: boolean };

type SupabaseSrv = Awaited<ReturnType<typeof db>>;

/**
 * Validate + compile + run a Query Model on a CALLER-PROVIDED client. The shared
 * CF-2 execution core: it runs read-only, RLS-scoped to the institution, and is
 * reused by CF-3 (Aura Intelligence) so there is exactly ONE query path. Callers
 * are responsible for their own authorization before invoking this.
 */
export async function executeQueryModel(
  supabase: SupabaseSrv, institutionId: string, model: QueryModel,
): Promise<Result<RunResult>> {
  try {
    const { data: entRow, error: entErr } = await supabase
      .from("data_explorer_entities")
      .select("key, label, category, source, columns, default_date_field, sort_order")
      .eq("key", model.entity).eq("is_active", true).maybeSingle();
    if (entErr) return { success: false, error: entErr.message };
    if (!entRow) return { success: false, error: "Unknown or inactive entity." };
    const entity = mapEntity(entRow);

    const valid = validateQueryModel(model, entity);
    if (!valid.ok) return { success: false, error: valid.error };

    // Columns to fetch: display fields ∪ groupBy ∪ aggregation fields ∪ sort fields.
    const needed = new Set<string>([
      ...model.fields,
      ...(model.groupBy ?? []),
      ...(model.aggregations ?? []).filter((a) => a.fn !== "count").map((a) => a.field),
      ...(model.sort ?? []).map((s) => s.field),
    ]);
    const sel = needed.size > 0 ? [...needed].join(",") : "*";

    // Aggregations are computed in-process, so fetch up to MAX_LIMIT for them.
    const aggregating = (model.groupBy?.length ?? 0) > 0 || (model.aggregations?.length ?? 0) > 0;
    const fetchLimit = aggregating ? MAX_LIMIT : Math.min(model.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    let query = supabase.from(entity.source).select(sel).eq("institution_id", institutionId);

    // Filters
    const plan = compileFilters(model.filters);
    for (const leaf of plan.andLeaves) query = applyLeaf(query, leaf);
    for (const orStr of plan.orStrings) query = query.or(orStr);

    // Date range
    if (model.dateRange?.field) {
      if (model.dateRange.from) query = query.gte(model.dateRange.field, model.dateRange.from);
      if (model.dateRange.to) query = query.lte(model.dateRange.field, model.dateRange.to);
    }

    // Sort (raw fetch order)
    for (const s of model.sort ?? []) query = query.order(s.field, { ascending: s.dir === "asc" });

    query = query.limit(fetchLimit);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const raw = (data ?? []) as unknown as ResultRow[];
    const rows = groupAndAggregate(raw, model);
    return {
      success: true,
      data: { columns: resultColumns(model), rows, rowCount: rows.length, capped: raw.length >= fetchLimit },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Admin-tier Data Explorer entry point: guard, then run via the shared executor. */
export async function runQuery(institutionId: string, model: QueryModel): Promise<Result<RunResult>> {
  const guard = await requireExplorerAdmin(institutionId);
  if (!guard.ok) return { success: false, error: guard.error };
  const supabase = await db();
  return executeQueryModel(supabase, institutionId, model);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Saved views ────────────────────────────────────────────────────────────────
export type SavedView = { id: string; name: string; queryModel: QueryModel; isFavourite: boolean; updatedAt: string };

export async function listSavedViews(institutionId: string): Promise<Result<SavedView[]>> {
  try {
    const guard = await requireExplorerAdmin(institutionId);
    if (!guard.ok) return { success: false, error: guard.error };
    const supabase = await db();
    const { data, error } = await supabase
      .from("data_explorer_reports")
      .select("id, name, query_model, is_favourite, updated_at")
      .eq("institution_id", institutionId)
      .order("is_favourite", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: (data ?? []).map((r) => ({
        id: r.id as string, name: r.name as string,
        queryModel: r.query_model as QueryModel, isFavourite: !!r.is_favourite, updatedAt: r.updated_at as string,
      })),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function saveView(input: {
  institutionId: string; name: string; queryModel: QueryModel; isFavourite?: boolean;
}): Promise<Result<{ id: string }>> {
  try {
    const guard = await requireExplorerAdmin(input.institutionId);
    if (!guard.ok) return { success: false, error: guard.error };
    if (!input.name.trim()) return { success: false, error: "Name is required." };
    const supabase = await db();
    const { data, error } = await supabase
      .from("data_explorer_reports")
      .insert({
        institution_id: input.institutionId, owner_id: guard.userId,
        name: input.name.trim(), query_model: input.queryModel, is_favourite: !!input.isFavourite,
      })
      .select("id").single();
    if (error) return { success: false, error: error.message };
    await logAudit({
      institutionId: input.institutionId, performedBy: guard.userId,
      tableName: "data_explorer_reports", recordId: data.id as string, action: "INSERT",
      afterData: { name: input.name.trim() }, notes: `Saved Data Explorer view: ${input.name.trim()}`,
    });
    revalidatePath("/data-explorer");
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteSavedView(input: { institutionId: string; id: string }): Promise<Result<null>> {
  try {
    const guard = await requireExplorerAdmin(input.institutionId);
    if (!guard.ok) return { success: false, error: guard.error };
    const supabase = await db();
    const { error } = await supabase.from("data_explorer_reports").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    await logAudit({
      institutionId: input.institutionId, performedBy: guard.userId,
      tableName: "data_explorer_reports", recordId: input.id, action: "DELETE",
      notes: "Deleted Data Explorer view",
    });
    revalidatePath("/data-explorer");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function toggleViewFavourite(input: { institutionId: string; id: string; isFavourite: boolean }): Promise<Result<null>> {
  try {
    const guard = await requireExplorerAdmin(input.institutionId);
    if (!guard.ok) return { success: false, error: guard.error };
    const supabase = await db();
    const { error } = await supabase.from("data_explorer_reports").update({ is_favourite: input.isFavourite }).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/data-explorer");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
