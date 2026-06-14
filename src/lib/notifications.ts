// Phase 3A — Notification domain model + pure presentation helpers.
//
// No Supabase / React here so the logic the bell and panel rely on (unread
// count, day-bucketing, relative time, per-type styling) is unit-testable.
// Server actions (src/actions/notifications.ts) and the realtime hook
// (src/hooks/useNotifications.ts) build on these types.

export type NotificationType =
  | "leave_request"
  | "leave_status"
  | "fee_due"
  | "fee_paid"
  | "attendance_low"
  | "salary_disbursed"
  | "schedule_published"
  | "notice"
  | "system";

export type NotificationItem = {
  id: string;
  type: string; // tolerant of unknown/future types from the DB
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string; // ISO timestamp
};

/** Visual treatment per type. Tone is a Tailwind colour family the UI maps to
 *  bg/text classes; icon is resolved to a Lucide component in the component. */
export const NOTIFICATION_META: Record<
  NotificationType,
  { label: string; tone: "violet" | "emerald" | "amber" | "rose" | "blue" | "slate" }
> = {
  leave_request:      { label: "Leave request",     tone: "amber" },
  leave_status:       { label: "Leave update",       tone: "violet" },
  fee_due:            { label: "Fee due",            tone: "rose" },
  fee_paid:           { label: "Payment received",   tone: "emerald" },
  attendance_low:     { label: "Attendance alert",   tone: "rose" },
  salary_disbursed:   { label: "Salary disbursed",   tone: "emerald" },
  schedule_published: { label: "Timetable",          tone: "blue" },
  notice:             { label: "Notice",             tone: "violet" },
  system:             { label: "System",             tone: "slate" },
};

export function metaFor(type: string): { label: string; tone: string } {
  return NOTIFICATION_META[type as NotificationType] ?? NOTIFICATION_META.system;
}

export function unreadCount(items: { is_read: boolean }[]): number {
  return items.reduce((n, i) => n + (i.is_read ? 0 : 1), 0);
}

/** Badge text — caps at "9+" so the bell badge stays compact. */
export function badgeText(count: number): string | null {
  if (count <= 0) return null;
  return count > 9 ? "9+" : String(count);
}

export type NotificationBucket = "Today" | "Yesterday" | "Earlier";

export function bucketFor(createdAt: string, now: Date = new Date()): NotificationBucket {
  const d = new Date(createdAt);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (d.getTime() >= startOfToday.getTime()) return "Today";
  if (d.getTime() >= startOfYesterday.getTime()) return "Yesterday";
  return "Earlier";
}

/** Group items (assumed newest-first) into Today / Yesterday / Earlier, dropping
 *  empty buckets while preserving that order. */
export function groupByBucket(
  items: NotificationItem[],
  now: Date = new Date()
): { bucket: NotificationBucket; items: NotificationItem[] }[] {
  const order: NotificationBucket[] = ["Today", "Yesterday", "Earlier"];
  const map = new Map<NotificationBucket, NotificationItem[]>();
  for (const item of items) {
    const b = bucketFor(item.created_at, now);
    const list = map.get(b);
    if (list) list.push(item);
    else map.set(b, [item]);
  }
  return order.filter((b) => map.has(b)).map((b) => ({ bucket: b, items: map.get(b)! }));
}

/** Compact relative time, e.g. "just now", "5m", "3h", "2d", else a short date. */
export function relativeTime(createdAt: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(createdAt).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
