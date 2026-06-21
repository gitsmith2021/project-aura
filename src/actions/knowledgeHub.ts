"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { logAudit } from "@/lib/auditLog";
import { validateResource, parseTags, type VisibilityTier, type ResourceStatus } from "@/lib/knowledgeHub";

// Phase 7X / KH-1 — Knowledge Hub server actions. RLS does the access control
// (three-tier visibility + admin/uploader management); these actions resolve the
// uploader, validate, and write an audit trail.

type Result<T = undefined> = T extends undefined
  ? { success: true } | { success: false; error: string }
  : { success: true; data: T } | { success: false; error: string };

export type KnowledgeResource = {
  id: string;
  institution_id: string;
  department_id: string | null;
  title: string;
  description: string | null;
  category: string;
  content_type: string;
  file_url: string | null;
  external_url: string | null;
  subject: string | null;
  academic_year: string | null;
  tags: string[];
  visibility: VisibilityTier;
  naac_criterion: string | null;
  status: ResourceStatus;
  uploaded_by: string | null;
  uploader_name: string | null;
  download_count: number;
  rating_count: number;
  rating_sum: number;
  created_at: string;
  updated_at: string;
  departments?: { name: string } | null;
};

export type Collection = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  owner_id: string;
  created_at: string;
  resourceIds: string[];
};

async function getSupabase() {
  return createClient(await cookies());
}

export async function getResources(institutionId: string): Promise<Result<KnowledgeResource[]>> {
  if (!institutionId) return { success: false, error: "Institution ID required." };
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized." };

    // RLS scopes the result to what this caller may see (three-tier visibility).
    const { data, error } = await supabase
      .from("knowledge_resources")
      .select("*, departments(name)")
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as KnowledgeResource[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** KH-2 — server-side full-text search (RLS-scoped). Empty query → recent list. */
export async function searchResources(institutionId: string, query: string): Promise<Result<KnowledgeResource[]>> {
  if (!institutionId) return { success: false, error: "Institution ID required." };
  const q = query.trim();
  if (!q) return getResources(institutionId);
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized." };

    const { data, error } = await supabase
      .from("knowledge_resources")
      .select("*, departments(name)")
      .eq("institution_id", institutionId)
      .textSearch("search_vector", q, { type: "websearch", config: "english" })
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as KnowledgeResource[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** KH-4 — data for the analytics dashboard: the RLS-scoped resources + the
 *  active teaching-faculty count (for the participation metric). */
export async function getKnowledgeAnalytics(institutionId: string): Promise<Result<{ resources: KnowledgeResource[]; facultyCount: number }>> {
  const res = await getResources(institutionId);
  if (!res.success) return res;
  try {
    const supabase = await getSupabase();
    const { count } = await supabase
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("institution_id", institutionId)
      .eq("is_active", true)
      .eq("staff_type", "teaching");
    return { success: true, data: { resources: res.data, facultyCount: count ?? 0 } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export type CreateResourceInput = {
  institutionId: string;
  title: string;
  description?: string;
  category: string;
  contentType: string;
  fileUrl?: string | null;
  externalUrl?: string | null;
  subject?: string | null;
  academicYear?: string | null;
  tags?: string; // raw comma/space string
  visibility: VisibilityTier;
  departmentId?: string | null;
  naacCriterion?: string | null;
  status?: ResourceStatus;
};

export async function createResource(input: CreateResourceInput): Promise<Result<{ id: string }>> {
  const validationError = validateResource({
    title: input.title, category: input.category, content_type: input.contentType,
    file_url: input.fileUrl, external_url: input.externalUrl,
  });
  if (validationError) return { success: false, error: validationError };
  if (input.visibility === "department" && !input.departmentId) {
    return { success: false, error: "Pick a department for department-only visibility." };
  }

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized." };

    // Resolve the uploader's staff identity (null for an admin with no staff row).
    const { data: staff } = await supabase
      .from("staff")
      .select("id, full_name")
      .eq("email", user.email ?? "")
      .maybeSingle();

    const row = {
      institution_id: input.institutionId,
      department_id: input.departmentId ?? null,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      content_type: input.contentType,
      file_url: input.fileUrl ?? null,
      external_url: input.externalUrl?.trim() || null,
      subject: input.subject?.trim() || null,
      academic_year: input.academicYear?.trim() || null,
      tags: input.tags ? parseTags(input.tags) : [],
      visibility: input.visibility,
      naac_criterion: input.naacCriterion || null,
      status: input.status ?? "published",
      uploaded_by: staff?.id ?? null,
      uploader_name: (staff?.full_name as string | undefined) ?? user.email ?? null,
    };

    const { data, error } = await supabase.from("knowledge_resources").insert(row).select("id").single();
    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId: input.institutionId,
      performedBy: user.id,
      tableName: "knowledge_resources",
      recordId: data.id as string,
      action: "INSERT",
      afterData: { title: row.title, category: row.category, visibility: row.visibility },
      notes: "Knowledge Hub resource uploaded",
    });

    revalidatePath(`/institutions/${input.institutionId}/knowledge-hub`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function setResourceStatus(
  institutionId: string, id: string, status: ResourceStatus,
): Promise<Result> {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("knowledge_resources")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId, performedBy: user?.id ?? null,
      tableName: "knowledge_resources", recordId: id, action: "UPDATE",
      afterData: { status }, notes: `Knowledge Hub resource set to ${status}`,
    });
    revalidatePath(`/institutions/${institutionId}/knowledge-hub`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteResource(institutionId: string, id: string): Promise<Result> {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("knowledge_resources").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId, performedBy: user?.id ?? null,
      tableName: "knowledge_resources", recordId: id, action: "DELETE",
      notes: "Knowledge Hub resource deleted",
    });
    revalidatePath(`/institutions/${institutionId}/knowledge-hub`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Fire-and-forget download tally — uses the service role to bypass the read-only
 *  RLS for non-owners (any authorised viewer may register a download). */
export async function incrementDownload(id: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("knowledge_resources").select("download_count").eq("id", id).maybeSingle();
    const next = ((data?.download_count as number | undefined) ?? 0) + 1;
    await admin.from("knowledge_resources").update({ download_count: next }).eq("id", id);
  } catch {
    // non-critical
  }
}

// ── KH-3 — collaboration (ratings / bookmarks / collections) ──────────────────

/** The caller's own ratings + bookmarked resource ids. */
export async function getMyEngagement(): Promise<Result<{ ratings: Record<string, number>; bookmarkedIds: string[] }>> {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { success: false, error: "Unauthorized." };
    const [rRes, bRes] = await Promise.all([
      supabase.from("knowledge_ratings").select("resource_id, rating").eq("user_id", user.id),
      supabase.from("knowledge_bookmarks").select("resource_id").eq("user_id", user.id),
    ]);
    const ratings: Record<string, number> = {};
    for (const r of rRes.data ?? []) ratings[r.resource_id as string] = r.rating as number;
    const bookmarkedIds = (bRes.data ?? []).map((b) => b.resource_id as string);
    return { success: true, data: { ratings, bookmarkedIds } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Set or update the caller's 1–5 rating; returns the resource's new aggregate. */
export async function rateResource(resourceId: string, rating: number): Promise<Result<{ rating_count: number; rating_sum: number }>> {
  if (rating < 1 || rating > 5) return { success: false, error: "Rating must be 1–5." };
  try {
    const supabase = await getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { success: false, error: "Unauthorized." };
    const { error: upErr } = await supabase
      .from("knowledge_ratings")
      .upsert({ resource_id: resourceId, user_id: user.id, rating, updated_at: new Date().toISOString() }, { onConflict: "resource_id,user_id" });
    if (upErr) return { success: false, error: upErr.message };
    const { data: kr } = await supabase.from("knowledge_resources").select("rating_count, rating_sum").eq("id", resourceId).maybeSingle();
    return { success: true, data: { rating_count: (kr?.rating_count as number) ?? 0, rating_sum: (kr?.rating_sum as number) ?? 0 } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function toggleBookmark(resourceId: string, on: boolean): Promise<Result> {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { success: false, error: "Unauthorized." };
    if (on) {
      const { error: e } = await supabase.from("knowledge_bookmarks").upsert({ resource_id: resourceId, user_id: user.id }, { onConflict: "resource_id,user_id" });
      if (e) return { success: false, error: e.message };
    } else {
      const { error: e } = await supabase.from("knowledge_bookmarks").delete().eq("resource_id", resourceId).eq("user_id", user.id);
      if (e) return { success: false, error: e.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getCollections(institutionId: string): Promise<Result<Collection[]>> {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized." };
    const { data, error } = await supabase
      .from("knowledge_collections")
      .select("id, name, description, is_public, owner_id, created_at, knowledge_collection_items(resource_id)")
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    const collections: Collection[] = (data ?? []).map((c) => ({
      id: c.id as string, name: c.name as string, description: (c.description as string | null) ?? null,
      is_public: !!c.is_public, owner_id: c.owner_id as string, created_at: c.created_at as string,
      resourceIds: (Array.isArray(c.knowledge_collection_items) ? c.knowledge_collection_items : []).map((i) => i.resource_id as string),
    }));
    return { success: true, data: collections };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function createCollection(institutionId: string, input: { name: string; description?: string; isPublic?: boolean }): Promise<Result<{ id: string }>> {
  if (!input.name?.trim()) return { success: false, error: "Collection name is required." };
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized." };
    const { data, error } = await supabase.from("knowledge_collections").insert({
      institution_id: institutionId, owner_id: user.id, name: input.name.trim(),
      description: input.description?.trim() || null, is_public: input.isPublic ?? true,
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/knowledge-hub`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteCollection(institutionId: string, id: string): Promise<Result> {
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.from("knowledge_collections").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/knowledge-hub`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function setCollectionItem(collectionId: string, resourceId: string, present: boolean): Promise<Result> {
  try {
    const supabase = await getSupabase();
    if (present) {
      const { error } = await supabase.from("knowledge_collection_items").upsert({ collection_id: collectionId, resource_id: resourceId }, { onConflict: "collection_id,resource_id" });
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from("knowledge_collection_items").delete().eq("collection_id", collectionId).eq("resource_id", resourceId);
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
