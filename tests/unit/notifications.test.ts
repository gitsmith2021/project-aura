import { describe, it, expect } from "vitest";
import {
  unreadCount, badgeText, bucketFor, groupByBucket, relativeTime, metaFor,
  buildLeaveRequestedMessage, buildLeaveReviewedMessage, buildPaymentReceivedMessage,
  buildSalaryDisbursedMessage, buildSchedulePublishedMessage, buildFeeDueMessage,
  buildLowAttendanceMessage,
  type NotificationItem,
} from "@/lib/notifications";

// Local-constructed "now" so day-bucket assertions are timezone-independent
// (bucketFor derives Today/Yesterday from the viewer's local day).
const NOW = new Date(2026, 5, 14, 12, 0, 0); // 14 Jun 2026, 12:00 local
const local = (y: number, m: number, d: number, h = 0) => new Date(y, m, d, h).toISOString();
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

function item(over: Partial<NotificationItem> & { id: string; created_at: string }): NotificationItem {
  return { type: "system", title: "T", body: "B", data: null, is_read: false, ...over };
}

describe("unreadCount / badgeText", () => {
  it("counts unread items", () => {
    expect(unreadCount([{ is_read: false }, { is_read: true }, { is_read: false }])).toBe(2);
    expect(unreadCount([])).toBe(0);
  });

  it("formats the badge, capping at 9+", () => {
    expect(badgeText(0)).toBeNull();
    expect(badgeText(-1)).toBeNull();
    expect(badgeText(1)).toBe("1");
    expect(badgeText(9)).toBe("9");
    expect(badgeText(10)).toBe("9+");
    expect(badgeText(250)).toBe("9+");
  });
});

describe("bucketFor", () => {
  it("buckets timestamps relative to a fixed local now", () => {
    expect(bucketFor(local(2026, 5, 14, 9), NOW)).toBe("Today");
    expect(bucketFor(local(2026, 5, 13, 23), NOW)).toBe("Yesterday");
    expect(bucketFor(local(2026, 5, 10, 10), NOW)).toBe("Earlier");
  });
});

describe("groupByBucket", () => {
  it("groups items and drops empty buckets while preserving order", () => {
    const items = [
      item({ id: "a", created_at: local(2026, 5, 14, 10) }),
      item({ id: "b", created_at: local(2026, 5, 14, 8) }),
      item({ id: "c", created_at: local(2026, 5, 10, 8) }),
    ];
    const groups = groupByBucket(items, NOW);
    expect(groups.map((g) => g.bucket)).toEqual(["Today", "Earlier"]); // no "Yesterday"
    expect(groups[0].items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(groups[1].items.map((i) => i.id)).toEqual(["c"]);
  });

  it("returns an empty array for no items", () => {
    expect(groupByBucket([], NOW)).toEqual([]);
  });
});

describe("relativeTime", () => {
  it("renders compact relative strings", () => {
    expect(relativeTime(ago(20_000), NOW)).toBe("just now");
    expect(relativeTime(ago(30 * 60_000), NOW)).toBe("30m");
    expect(relativeTime(ago(3 * 3_600_000), NOW)).toBe("3h");
    expect(relativeTime(ago(2 * 86_400_000), NOW)).toBe("2d");
  });

  it("falls back to a short date beyond a week", () => {
    const out = relativeTime(ago(14 * 86_400_000), NOW);
    expect(out).not.toMatch(/^\d+[mhd]$/);
    expect(out).not.toBe("just now");
  });
});

describe("metaFor", () => {
  it("maps known types and falls back to system for unknown", () => {
    expect(metaFor("fee_paid").tone).toBe("emerald");
    expect(metaFor("attendance_low").tone).toBe("rose");
    expect(metaFor("totally_unknown_type")).toEqual(metaFor("system"));
  });
});

describe("message builders (Phase 3B)", () => {
  it("builds a leave-requested message for admins", () => {
    const m = buildLeaveRequestedMessage("A. Arunkumar", "casual", "2026-06-20", "2026-06-21");
    expect(m.type).toBe("leave_request");
    expect(m.body).toContain("A. Arunkumar");
    expect(m.body).toContain("casual");
    expect(m.body).toContain("2026-06-20 → 2026-06-21");
  });

  it("collapses a single-day leave range", () => {
    const m = buildLeaveRequestedMessage("X", "sick", "2026-06-20", "2026-06-20");
    expect(m.body).toContain("(2026-06-20)");
    expect(m.body).not.toContain("→");
  });

  it("builds approved/rejected leave-status messages", () => {
    expect(buildLeaveReviewedMessage("approved", "casual", "2026-06-20", "2026-06-20").title).toBe("Leave approved");
    const rej = buildLeaveReviewedMessage("rejected", "casual", "2026-06-20", "2026-06-21");
    expect(rej.type).toBe("leave_status");
    expect(rej.body).toContain("rejected");
  });

  it("formats currency as INR in payment/salary/fee messages", () => {
    const pay = buildPaymentReceivedMessage(12500, "RCPT-1");
    expect(pay.type).toBe("fee_paid");
    expect(pay.body).toContain("₹12,500");
    expect(pay.body).toContain("RCPT-1");

    expect(buildPaymentReceivedMessage(500).body).not.toContain("receipt");

    const sal = buildSalaryDisbursedMessage("2026-06", 48000);
    expect(sal.type).toBe("salary_disbursed");
    expect(sal.body).toContain("2026-06");
    expect(sal.body).toContain("₹48,000");
    expect(buildSalaryDisbursedMessage().body).not.toMatch(/for|₹/);

    const due = buildFeeDueMessage(7500, "2026-07-01");
    expect(due.type).toBe("fee_due");
    expect(due.body).toContain("₹7,500");
    expect(due.body).toContain("2026-07-01");
  });

  it("builds schedule + low-attendance messages", () => {
    expect(buildSchedulePublishedMessage("Physics").body).toContain("Physics");
    expect(buildSchedulePublishedMessage().type).toBe("schedule_published");
    const att = buildLowAttendanceMessage(68);
    expect(att.type).toBe("attendance_low");
    expect(att.body).toContain("68%");
    expect(att.body).toContain("75%");
  });
});
