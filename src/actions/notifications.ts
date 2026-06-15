"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import type { NotificationItem, NotificationType } from "@/lib/notifications";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const SELECT_COLS = "id, type, title, body, data, is_read, created_at";

export type CreateNotificationInput = {
  institutionId: string;
  recipientId: string;
  type: NotificationType | string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
};

// Notifications are written on behalf of the system (a trigger reacting to a
// leave approval, fee payment, etc.) for *other* users, so this must bypass the
// recipient-scoped RLS — Dev Rule 16: service-role client, server-only file.
export async function createNotification(
  input: CreateNotificationInput
): Promise<Result<{ id: string }>> {
  try {
    if (!input.recipientId || !input.institutionId) {
      return { success: false, error: "recipientId and institutionId are required." };
    }
    if (!input.title.trim() || !input.body.trim()) {
      return { success: false, error: "Notification title and body are required." };
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("notifications")
      .insert({
        institution_id: input.institutionId,
        recipient_id: input.recipientId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data ?? null,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// Fan-out helper for triggers that notify many recipients at once (e.g. a
// published timetable → every staff member in a department). Skips silently
// when the recipient list is empty.
export async function createNotificationsBulk(
  institutionId: string,
  recipientIds: string[],
  payload: { type: NotificationType | string; title: string; body: string; data?: Record<string, unknown> | null }
): Promise<Result<{ count: number }>> {
  try {
    const recipients = Array.from(new Set(recipientIds.filter(Boolean)));
    if (recipients.length === 0) return { success: true, data: { count: 0 } };

    const admin = createAdminClient();
    const rows = recipients.map((recipient_id) => ({
      institution_id: institutionId,
      recipient_id,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? null,
    }));
    const { error } = await admin.from("notifications").insert(rows);
    if (error) return { success: false, error: error.message };
    return { success: true, data: { count: rows.length } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getNotifications(
  limit = 30
): Promise<Result<{ items: NotificationItem[]; unread: number }>> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const { data, error } = await supabase
      .from("notifications")
      .select(SELECT_COLS)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { success: false, error: error.message };

    const items = (data ?? []) as NotificationItem[];
    const unread = items.reduce((n, i) => n + (i.is_read ? 0 : 1), 0);
    return { success: true, data: { items, unread } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function markAsRead(id: string): Promise<Result<null>> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    // RLS scopes this to the caller's own rows; the explicit filter is defensive.
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("recipient_id", user.id);
    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function markAllRead(): Promise<Result<null>> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("recipient_id", user.id)
      .eq("is_read", false);
    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
