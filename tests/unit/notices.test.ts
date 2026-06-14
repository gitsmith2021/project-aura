import { describe, it, expect } from "vitest";
import {
  noticeTypeMeta, isNoticeActive, sortNotices, audiencesFor, audienceMatches,
} from "@/lib/notices";

describe("noticeTypeMeta", () => {
  it("maps known types and falls back to general", () => {
    expect(noticeTypeMeta("emergency").tone).toBe("rose");
    expect(noticeTypeMeta("holiday").tone).toBe("emerald");
    expect(noticeTypeMeta("nope")).toEqual(noticeTypeMeta("general"));
  });
});

describe("isNoticeActive", () => {
  const now = new Date(2026, 5, 14, 12, 0, 0);
  it("treats a null expiry as always active", () => {
    expect(isNoticeActive({ expires_at: null }, now)).toBe(true);
  });
  it("is active through the end of the expiry day, then expires", () => {
    expect(isNoticeActive({ expires_at: "2026-06-14" }, now)).toBe(true);  // today
    expect(isNoticeActive({ expires_at: "2026-06-20" }, now)).toBe(true);  // future
    expect(isNoticeActive({ expires_at: "2026-06-13" }, now)).toBe(false); // past
  });
});

describe("sortNotices", () => {
  it("puts pinned first, then newest first", () => {
    const list = [
      { id: "a", is_pinned: false, created_at: "2026-06-14T10:00:00Z" },
      { id: "b", is_pinned: true, created_at: "2026-06-10T10:00:00Z" },
      { id: "c", is_pinned: false, created_at: "2026-06-12T10:00:00Z" },
      { id: "d", is_pinned: true, created_at: "2026-06-13T10:00:00Z" },
    ];
    expect(sortNotices(list).map((n) => n.id)).toEqual(["d", "b", "a", "c"]);
  });
});

describe("audience targeting", () => {
  it("staff see all + staff; students see all + students + hostel", () => {
    expect(audiencesFor("staff")).toEqual(["all", "staff"]);
    expect(audiencesFor("student")).toEqual(["all", "students", "hostel"]);
    expect(audienceMatches("staff", "staff")).toBe(true);
    expect(audienceMatches("students", "staff")).toBe(false);
    expect(audienceMatches("hostel", "student")).toBe(true);
    expect(audienceMatches("parents", "student")).toBe(false);
    expect(audienceMatches("all", "staff")).toBe(true);
  });
});
