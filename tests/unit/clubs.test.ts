import { describe, it, expect } from "vitest";
import {
  formatClubType,
  formatClubMemberRole,
  formatClubActivityType,
  calculateNSSAndNCCStats,
  calculateNAACParticipation,
  type Club,
  type ClubMember,
  type ClubActivity,
} from "@/lib/clubs";

describe("Clubs domain library formatters", () => {
  it("formats club type correctly", () => {
    expect(formatClubType("nss")).toBe("NSS (National Service Scheme)");
    expect(formatClubType("ncc")).toBe("NCC (National Cadet Corps)");
    expect(formatClubType("cultural")).toBe("Cultural Committee");
    expect(formatClubType("other")).toBe("Other");
  });

  it("formats club member role correctly", () => {
    expect(formatClubMemberRole("member")).toBe("Member");
    expect(formatClubMemberRole("secretary")).toBe("Secretary");
    expect(formatClubMemberRole("president")).toBe("President");
  });

  it("formats club activity type correctly", () => {
    expect(formatClubActivityType("event")).toBe("Regular Event");
    expect(formatClubActivityType("camp")).toBe("Special Camp");
    expect(formatClubActivityType("community_service")).toBe("Community Service");
  });
});

describe("calculateNSSAndNCCStats", () => {
  it("tallies NSS and NCC events and participants correctly", () => {
    const activities: ClubActivity[] = [
      {
        id: "1",
        club_id: "c1",
        title: "NSS Clean Drive",
        activity_type: "community_service",
        activity_date: "2026-06-10",
        venue: "Village A",
        participants_count: 50,
        description: "",
        photo_urls: [],
        created_at: "",
        club: { name: "NSS unit", club_type: "nss" },
      },
      {
        id: "2",
        club_id: "c2",
        title: "NCC Camp",
        activity_type: "camp",
        activity_date: "2026-06-12",
        venue: "Ground B",
        participants_count: 30,
        description: "",
        photo_urls: [],
        created_at: "",
        club: { name: "NCC unit", club_type: "ncc" },
      },
      {
        id: "3",
        club_id: "c1",
        title: "NSS Blood Donation",
        activity_type: "community_service",
        activity_date: "2026-06-15",
        venue: "Hall C",
        participants_count: 25,
        description: "",
        photo_urls: [],
        created_at: "",
        club: { name: "NSS unit", club_type: "nss" },
      },
      {
        id: "4",
        club_id: "c3",
        title: "Cultural Fest",
        activity_type: "event",
        activity_date: "2026-06-14",
        venue: "Auditorium",
        participants_count: 100,
        description: "",
        photo_urls: [],
        created_at: "",
        club: { name: "Cultural group", club_type: "cultural" },
      },
    ];

    const stats = calculateNSSAndNCCStats(activities);
    expect(stats.nssEvents).toBe(2);
    expect(stats.nccEvents).toBe(1);
    expect(stats.nssParticipants).toBe(75);
    expect(stats.nccParticipants).toBe(30);
  });
});

describe("calculateNAACParticipation", () => {
  it("compiles NAAC statistics correctly", () => {
    const clubs: Club[] = [
      {
        id: "c1",
        institution_id: "i1",
        name: "NSS",
        club_type: "nss",
        faculty_coordinator: null,
        student_secretary_id: null,
        description: "",
        is_active: true,
        created_at: "",
      },
      {
        id: "c2",
        institution_id: "i1",
        name: "NCC",
        club_type: "ncc",
        faculty_coordinator: null,
        student_secretary_id: null,
        description: "",
        is_active: true,
        created_at: "",
      },
    ];

    const members: ClubMember[] = [
      { id: "m1", club_id: "c1", student_id: "s1", role: "member", joined_at: "", created_at: "" },
      { id: "m2", club_id: "c1", student_id: "s2", role: "secretary", joined_at: "", created_at: "" },
      { id: "m3", club_id: "c2", student_id: "s3", role: "member", joined_at: "", created_at: "" },
    ];

    const activities: ClubActivity[] = [
      {
        id: "a1",
        club_id: "c1",
        title: "Service Camp",
        activity_type: "community_service",
        activity_date: "2026-06-15",
        venue: "",
        participants_count: 40,
        description: "",
        photo_urls: [],
        created_at: "",
        club: { name: "NSS", club_type: "nss" },
      },
    ];

    const report = calculateNAACParticipation(clubs, members, activities);

    expect(report.totalClubs).toBe(2);
    expect(report.totalMembers).toBe(3);
    expect(report.totalActivities).toBe(1);
    expect(report.totalParticipants).toBe(40);
    expect(report.nssNCCActivities).toBe(1);
    expect(report.nssNCCParticipants).toBe(40);
    expect(report.clubTypeCounts.nss).toBe(1);
    expect(report.clubTypeCounts.ncc).toBe(1);
    expect(report.clubTypeCounts.cultural).toBe(0);
    expect(report.activityTypeCounts.community_service).toBe(1);
    expect(report.activityTypeCounts.camp).toBe(0);
  });
});
