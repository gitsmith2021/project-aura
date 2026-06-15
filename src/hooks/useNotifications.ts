"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { markAsRead, markAllRead } from "@/actions/notifications";
import type { NotificationItem } from "@/lib/notifications";

const SELECT = "id, type, title, body, data, is_read, created_at";
const LIMIT = 30;

// Live notification inbox for the current user: initial fetch + a Supabase
// Realtime subscription scoped to the caller's rows (Realtime honours the
// recipient-only SELECT policy). Mutations go through server actions with an
// optimistic local update so the bell reacts instantly.
export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active || !user) {
        setLoading(false);
        return;
      }

      supabase
        .from("notifications")
        .select(SELECT)
        .order("created_at", { ascending: false })
        .limit(LIMIT)
        .then(({ data }) => {
          if (!active) return;
          setItems((data ?? []) as NotificationItem[]);
          setLoading(false);
        });

      const filter = `recipient_id=eq.${user.id}`;
      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter },
          (payload) =>
            setItems((prev) => [payload.new as NotificationItem, ...prev].slice(0, LIMIT))
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter },
          (payload) =>
            setItems((prev) =>
              prev.map((i) =>
                i.id === (payload.new as NotificationItem).id ? (payload.new as NotificationItem) : i
              )
            )
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "notifications", filter },
          (payload) =>
            setItems((prev) => prev.filter((i) => i.id !== (payload.old as { id: string }).id))
        )
        .subscribe();
    });

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_read: true } : i)));
    await markAsRead(id);
  }, []);

  const markAll = useCallback(async () => {
    setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
    await markAllRead();
  }, []);

  const unread = items.reduce((n, i) => n + (i.is_read ? 0 : 1), 0);

  return { items, unread, loading, markRead, markAll };
}
