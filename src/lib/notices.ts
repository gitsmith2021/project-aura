// Phase 3D — Digital Notice Board domain model + pure helpers (unit-testable).

export const NOTICE_TYPES = [
  "academic", "exam", "holiday", "event", "emergency",
  "placement", "hostel", "transport", "general",
] as const;
export type NoticeType = (typeof NOTICE_TYPES)[number];

export const NOTICE_AUDIENCES = ["all", "students", "staff", "parents", "hostel"] as const;
export type NoticeAudience = (typeof NOTICE_AUDIENCES)[number];

export type Notice = {
  id: string;
  institution_id: string;
  title: string;
  body: string;
  notice_type: NoticeType;
  target_audience: NoticeAudience;
  department_id: string | null;
  attachment_url: string | null;
  is_pinned: boolean;
  expires_at: string | null; // date
  posted_by: string | null;
  created_at: string;
  departments?: { name: string } | null;
};

export const NOTICE_TYPE_META: Record<
  NoticeType,
  { label: string; tone: "violet" | "emerald" | "amber" | "rose" | "blue" | "slate" }
> = {
  academic:  { label: "Academic",  tone: "violet" },
  exam:      { label: "Exam",      tone: "blue" },
  holiday:   { label: "Holiday",   tone: "emerald" },
  event:     { label: "Event",     tone: "amber" },
  emergency: { label: "Emergency", tone: "rose" },
  placement: { label: "Placement", tone: "blue" },
  hostel:    { label: "Hostel",    tone: "amber" },
  transport: { label: "Transport", tone: "slate" },
  general:   { label: "General",   tone: "slate" },
};

export const AUDIENCE_LABEL: Record<NoticeAudience, string> = {
  all: "Everyone",
  students: "Students",
  staff: "Staff",
  parents: "Parents",
  hostel: "Hostel residents",
};

export function noticeTypeMeta(type: string): { label: string; tone: string } {
  return NOTICE_TYPE_META[type as NoticeType] ?? NOTICE_TYPE_META.general;
}

/** A notice is active until the end of its expires_at day; null = never expires. */
export function isNoticeActive(n: { expires_at: string | null }, now: Date = new Date()): boolean {
  if (!n.expires_at) return true;
  return new Date(`${n.expires_at}T23:59:59`).getTime() >= now.getTime();
}

/** Pinned first, then newest first. Pure (returns a new array). */
export function sortNotices<T extends { is_pinned: boolean; created_at: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/** Which target_audience values a portal viewer should see. */
export function audiencesFor(viewer: "staff" | "student"): NoticeAudience[] {
  return viewer === "staff" ? ["all", "staff"] : ["all", "students", "hostel"];
}

export function audienceMatches(audience: NoticeAudience, viewer: "staff" | "student"): boolean {
  return audiencesFor(viewer).includes(audience);
}
