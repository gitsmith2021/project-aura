"use client";

import { useRouter } from "next/navigation";
import {
  Bell, CalendarOff, ClipboardCheck, ClipboardList, CreditCard, Wallet,
  CalendarDays, ScrollText, X, CheckCheck,
} from "lucide-react";
import {
  groupByBucket, metaFor, relativeTime, type NotificationItem,
} from "@/lib/notifications";

const ICON: Record<string, typeof Bell> = {
  leave_request: CalendarOff,
  leave_status: ClipboardCheck,
  fee_due: CreditCard,
  fee_paid: Wallet,
  attendance_low: ClipboardList,
  salary_disbursed: Wallet,
  schedule_published: CalendarDays,
  notice: ScrollText,
  system: Bell,
};

const TONE: Record<string, string> = {
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  rose: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export function NotificationPanel({
  open, onClose, items, loading, unread, onMarkRead, onMarkAll,
}: {
  open: boolean;
  onClose: () => void;
  items: NotificationItem[];
  loading: boolean;
  unread: number;
  onMarkRead: (id: string) => void;
  onMarkAll: () => void;
}) {
  const router = useRouter();
  if (!open) return null;

  const groups = groupByBucket(items);

  const onItemClick = (n: NotificationItem) => {
    if (!n.is_read) onMarkRead(n.id);
    const href = n.data && typeof n.data.href === "string" ? (n.data.href as string) : null;
    if (href) {
      onClose();
      router.push(href);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="relative h-full w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Notifications</h2>
            {unread > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-600 text-white">
                {unread} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <button
                type="button"
                onClick={onMarkAll}
                className="flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-md px-2 py-1 transition-colors"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications"
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-slate-400 dark:text-slate-500">
              <Bell size={28} className="opacity-30" />
              <p className="text-xs">You're all caught up</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.bucket}>
                <p className="sticky top-0 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm">
                  {group.bucket}
                </p>
                {group.items.map((n) => {
                  const meta = metaFor(n.type);
                  const Icon = ICON[n.type] ?? Bell;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => onItemClick(n)}
                      className={`w-full text-left flex gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                        n.is_read ? "" : "bg-purple-50/40 dark:bg-purple-950/10"
                      }`}
                    >
                      <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${TONE[meta.tone] ?? TONE.slate}`}>
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{n.title}</p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">{relativeTime(n.created_at)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                      </div>
                      {!n.is_read && <span className="shrink-0 mt-1 w-2 h-2 rounded-full bg-purple-600" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
