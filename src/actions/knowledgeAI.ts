"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/utils/supabase/server";
import { isSettingEnabled } from "@/lib/configServer";
import { searchResources, type KnowledgeResource } from "@/actions/knowledgeHub";
import {
  SUMMARY_SYSTEM, ASSISTANT_SYSTEM, buildSummaryPrompt, buildAssistantPrompt, citedResources,
} from "@/lib/knowledgeAI";

// Phase 7X / KH-5 — Knowledge Hub AI layer. These actions call the Claude API
// (generative). Embeddings/semantic search are a separate, deferred concern.
//
// AI summaries: a resource owner/admin generates a discovery-friendly abstract.
// Knowledge Assistant: admin/HOD-gated RAG — retrieve over the KH-2 full-text
// index, answer with Claude grounded in (and citing) those documents.

const MODEL = "claude-opus-4-8";
const ADMIN_ROLES = ["SUPER_ADMIN", "INST_ADMIN", "HOD", "DEPARTMENT_HEAD"];

type Result<T = undefined> = T extends undefined
  ? { success: true } | { success: false; error: string }
  : { success: true; data: T } | { success: false; error: string };

export type AssistantSource = {
  id: string;
  title: string;
  category: string;
  department: string | null;
  file_url: string | null;
  external_url: string | null;
};

function anthropic(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

function textOf(message: Anthropic.Message): string {
  return message.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}

async function getSupabase() {
  return createClient(await cookies());
}

/** Generate (and persist) an AI summary for one resource. Owner or admin only. */
export async function generateResourceSummary(resourceId: string): Promise<Result<{ summary: string }>> {
  const client = anthropic();
  if (!client) return { success: false, error: "AI is not configured (missing ANTHROPIC_API_KEY)." };
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized." };

    const { data: resource } = await supabase
      .from("knowledge_resources")
      .select("id, institution_id, title, description, category, content_type, tags, uploaded_by, departments(name)")
      .eq("id", resourceId)
      .maybeSingle();
    if (!resource) return { success: false, error: "Resource not found." };

    // CF-1: AI summaries are an opt-in add-on — off unless enabled (fail-closed).
    if (!(await isSettingEnabled(resource.institution_id as string, "ai.summaries_enabled", false))) {
      return { success: false, error: "AI summaries are disabled for this institution." };
    }

    // Gate before spending tokens: uploader or an institution admin/HOD.
    let allowed = resource.uploaded_by === user.id;
    if (!allowed) {
      const { data: member } = await supabase.from("institution_members").select("role").eq("profile_id", user.id).maybeSingle();
      allowed = ADMIN_ROLES.includes((member?.role as string) ?? "");
    }
    if (!allowed) return { success: false, error: "You can only summarize resources you uploaded." };

    const dept = Array.isArray(resource.departments) ? resource.departments[0] : resource.departments;
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: SUMMARY_SYSTEM,
      messages: [{ role: "user", content: buildSummaryPrompt({ ...resource, departments: (dept as { name: string } | null) ?? null }) }],
    });
    const summary = textOf(message);
    if (!summary) return { success: false, error: "The model returned an empty summary." };

    // RLS enforces who may write this resource (owner/admin).
    const { error: updateError } = await supabase
      .from("knowledge_resources")
      .update({ ai_summary: summary, ai_summary_generated_at: new Date().toISOString() })
      .eq("id", resourceId);
    if (updateError) return { success: false, error: updateError.message };

    revalidatePath(`/institutions/${resource.institution_id}/knowledge-hub`);
    return { success: true, data: { summary } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Knowledge Assistant (RAG). Admin/HOD-gated. Retrieves over full-text search,
 *  answers with Claude grounded in and citing those documents, logs the exchange. */
export async function askKnowledgeAssistant(
  institutionId: string,
  question: string,
): Promise<Result<{ answer: string; sources: AssistantSource[] }>> {
  const q = question.trim();
  if (!institutionId) return { success: false, error: "Institution ID required." };
  if (q.length < 3) return { success: false, error: "Please ask a longer question." };

  const client = anthropic();
  if (!client) return { success: false, error: "AI is not configured (missing ANTHROPIC_API_KEY)." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized." };

    const { data: member } = await supabase.from("institution_members").select("role").eq("profile_id", user.id).maybeSingle();
    if (!ADMIN_ROLES.includes((member?.role as string) ?? "")) {
      return { success: false, error: "The Knowledge Assistant is available to administrators." };
    }

    // CF-1: the assistant is an opt-in add-on — off unless enabled (fail-closed).
    if (!(await isSettingEnabled(institutionId, "ai.assistant_enabled", false))) {
      return { success: false, error: "The Knowledge Assistant is disabled for this institution." };
    }

    // Retrieve top matches over the KH-2 full-text index (RLS-scoped).
    const retrieval = await searchResources(institutionId, q);
    if (!retrieval.success) return retrieval;
    const docs = retrieval.data.slice(0, 6);

    if (docs.length === 0) {
      const answer = "I couldn't find any documents in your Knowledge Hub related to that question.";
      await supabase.from("knowledge_assistant_logs").insert({ institution_id: institutionId, profile_id: user.id, question: q, answer, cited_resource_ids: [] });
      return { success: true, data: { answer, sources: [] } };
    }

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: ASSISTANT_SYSTEM,
      messages: [{ role: "user", content: buildAssistantPrompt(q, docs) }],
    });
    const answer = textOf(message) || "I wasn't able to produce an answer from the available documents.";

    const cited = citedResources(answer, docs) as KnowledgeResource[];
    const sources: AssistantSource[] = cited.map((r) => ({
      id: r.id, title: r.title, category: r.category,
      department: r.departments?.name ?? null, file_url: r.file_url, external_url: r.external_url,
    }));

    await supabase.from("knowledge_assistant_logs").insert({
      institution_id: institutionId, profile_id: user.id, question: q, answer,
      cited_resource_ids: cited.map((r) => r.id),
    });

    return { success: true, data: { answer, sources } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
