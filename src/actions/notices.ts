"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { notifyNoticePosted } from "@/actions/notificationTriggers";
import { audiencesFor, type Notice, type NoticeType, type NoticeAudience } from "@/lib/notices";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const COLS =
  "id, institution_id, title, body, notice_type, target_audience, department_id, attachment_url, is_pinned, expires_at, posted_by, created_at, departments!department_id(name)";

export type NoticeInput = {
  institution_id: string;
  title: string;
  body: string;
  notice_type: NoticeType;
  target_audience: NoticeAudience;
  department_id?: string | null;
  attachment_url?: string | null;
  is_pinned?: boolean;
  expires_at?: string | null;
};

// Notice types that also push an in-app notification to the audience.
const URGENT_TYPES = new Set<NoticeType>(["emergency", "exam"]);

export async function getNotices(institutionId: string): Promise<Result<Notice[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("notices")
      .select(COLS)
      .eq("institution_id", institutionId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as Notice[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getActiveNotices(
  institutionId: string,
  viewer: { kind: "staff" | "student"; departmentId?: string | null }
): Promise<Result<Notice[]>> {
  try {
    const supabase = createClient(await cookies());
    const today = new Date().toISOString().slice(0, 10);
    let query = supabase
      .from("notices")
      .select(COLS)
      .eq("institution_id", institutionId)
      .in("target_audience", audiencesFor(viewer.kind))
      .or(`expires_at.is.null,expires_at.gte.${today}`)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    // Department-specific notices only reach that department; institution-wide
    // (department_id null) reach everyone.
    if (viewer.departmentId) {
      query = query.or(`department_id.is.null,department_id.eq.${viewer.departmentId}`);
    } else {
      query = query.is("department_id", null);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as Notice[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function createNotice(input: NoticeInput): Promise<Result<Notice>> {
  try {
    if (!input.title.trim()) return { success: false, error: "Title is required." };
    if (!input.body.trim()) return { success: false, error: "Body is required." };

    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const { data, error } = await supabase
      .from("notices")
      .insert({
        institution_id:  input.institution_id,
        title:           input.title.trim(),
        body:            input.body.trim(),
        notice_type:     input.notice_type,
        target_audience: input.target_audience,
        department_id:   input.department_id ?? null,
        attachment_url:  input.attachment_url?.trim() || null,
        is_pinned:       input.is_pinned ?? false,
        expires_at:      input.expires_at || null,
        posted_by:       user.id,
      })
      .select(COLS)
      .single();

    if (error) return { success: false, error: error.message };

    // Urgent notices also ping the audience's notification bell (fire-and-forget)
    if (URGENT_TYPES.has(input.notice_type)) {
      await notifyNoticePosted({
        institutionId: input.institution_id,
        departmentId:  input.department_id ?? null,
        audience:      input.target_audience,
        noticeType:    input.notice_type,
        title:         input.title.trim(),
      });
    }

    revalidatePath(`/institutions/${input.institution_id}/notices`);
    return { success: true, data: data as unknown as Notice };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateNotice(
  id: string,
  institutionId: string,
  patch: Partial<Omit<NoticeInput, "institution_id">>
): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const update: Record<string, unknown> = {};
    if (patch.title !== undefined) update.title = patch.title.trim();
    if (patch.body !== undefined) update.body = patch.body.trim();
    if (patch.notice_type !== undefined) update.notice_type = patch.notice_type;
    if (patch.target_audience !== undefined) update.target_audience = patch.target_audience;
    if (patch.department_id !== undefined) update.department_id = patch.department_id ?? null;
    if (patch.attachment_url !== undefined) update.attachment_url = patch.attachment_url?.trim() || null;
    if (patch.is_pinned !== undefined) update.is_pinned = patch.is_pinned;
    if (patch.expires_at !== undefined) update.expires_at = patch.expires_at || null;

    const { error } = await supabase
      .from("notices")
      .update(update)
      .eq("id", id)
      .eq("institution_id", institutionId);
    if (error) return { success: false, error: error.message };

    revalidatePath(`/institutions/${institutionId}/notices`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteNotice(id: string, institutionId: string): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase
      .from("notices")
      .delete()
      .eq("id", id)
      .eq("institution_id", institutionId);
    if (error) return { success: false, error: error.message };

    revalidatePath(`/institutions/${institutionId}/notices`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
