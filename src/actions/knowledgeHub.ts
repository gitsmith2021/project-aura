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
  created_at: string;
  updated_at: string;
  departments?: { name: string } | null;
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
