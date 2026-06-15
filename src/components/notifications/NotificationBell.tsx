"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { badgeText } from "@/lib/notifications";
import { NotificationPanel } from "./NotificationPanel";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { items, unread, loading, markRead, markAll } = useNotifications();
  const badge = badgeText(unread);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        className="relative p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
      >
        <Bell size={16} />
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 flex items-center justify-center rounded-full bg-purple-600 text-white text-[9px] font-bold leading-none ring-2 ring-white dark:ring-slate-900">
            {badge}
          </span>
        )}
      </button>

      <NotificationPanel
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        loading={loading}
        unread={unread}
        onMarkRead={markRead}
        onMarkAll={markAll}
      />
    </>
  );
}
