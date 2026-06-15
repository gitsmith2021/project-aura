// Phase 4H — Student Clubs & Organizations (NSS / NCC / Cultural) Domain Models and Helpers

export type ClubType = "nss" | "ncc" | "cultural" | "sports" | "literary" | "technical" | "environmental" | "other";
export type ClubMemberRole = "member" | "secretary" | "joint_secretary" | "treasurer" | "president";
export type ClubActivityType = "event" | "camp" | "competition" | "workshop" | "community_service" | "seminar" | "other";

export const CLUB_TYPE_LABELS: Record<ClubType, string> = {
  nss: "NSS (National Service Scheme)",
  ncc: "NCC (National Cadet Corps)",
  cultural: "Cultural Committee",
  sports: "Sports Association",
  literary: "Literary & Debate Club",
  technical: "Technical Club",
  environmental: "Eco / Green Club",
  other: "Other",
};

export const CLUB_MEMBER_ROLE_LABELS: Record<ClubMemberRole, string> = {
  member: "Member",
  secretary: "Secretary",
  joint_secretary: "Joint Secretary",
  treasurer: "Treasurer",
  president: "President",
};

export const CLUB_ACTIVITY_TYPE_LABELS: Record<ClubActivityType, string> = {
  event: "Regular Event",
  camp: "Special Camp",
  competition: "Competition",
  workshop: "Workshop",
  community_service: "Community Service",
  seminar: "Seminar",
  other: "Other",
};

export const CLUB_TYPE_COLORS: Record<ClubType, string> = {
  nss: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  ncc: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  cultural: "bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300",
  sports: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  literary: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  technical: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  environmental: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-300",
};

export interface Club {
  id: string;
  institution_id: string;
  name: string;
  club_type: ClubType;
  faculty_coordinator: string | null;
  student_secretary_id: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  coordinator?: { id: string; title: string | null; full_name: string; email: string } | null;
  secretary?: { id: string; full_name: string; roll_no: string | null } | null;
  members_count?: number;
  activities_count?: number;
}

export interface ClubMember {
  id: string;
  club_id: string;
  student_id: string;
  role: ClubMemberRole;
  joined_at: string;
  created_at: string;
  student?: {
    id: string;
    full_name: string;
    roll_no: string | null;
    student_program: string;
    student_year: number;
    email: string;
  } | null;
  club?: Club | null;
}

export interface ClubActivity {
  id: string;
  club_id: string;
  title: string;
  activity_type: ClubActivityType;
  activity_date: string;
  venue: string | null;
  participants_count: number;
  description: string | null;
  photo_urls: string[];
  created_at: string;
  club?: {
    name: string;
    club_type: ClubType;
  } | null;
}

export interface NAACReportData {
  totalClubs: number;
  totalMembers: number;
  totalActivities: number;
  totalParticipants: number;
  nssNCCActivities: number;
  nssNCCParticipants: number;
  clubTypeCounts: Record<ClubType, number>;
  activityTypeCounts: Record<ClubActivityType, number>;
}

// ── Pure Helpers ──────────────────────────────────────────────────────────────

/** Formats the user-facing club type label */
export function formatClubType(type: ClubType): string {
  return CLUB_TYPE_LABELS[type] || type;
}

/** Formats the user-facing role label */
export function formatClubMemberRole(role: ClubMemberRole): string {
  return CLUB_MEMBER_ROLE_LABELS[role] || role;
}

/** Formats the user-facing activity type label */
export function formatClubActivityType(type: ClubActivityType): string {
  return CLUB_ACTIVITY_TYPE_LABELS[type] || type;
}

/** Compiles summary statistics for NSS and NCC activities specifically */
export function calculateNSSAndNCCStats(activities: ClubActivity[]) {
  let nssEvents = 0;
  let nccEvents = 0;
  let nssParticipants = 0;
  let nccParticipants = 0;

  for (const act of activities) {
    const type = act.club?.club_type;
    if (type === "nss") {
      nssEvents++;
      nssParticipants += act.participants_count || 0;
    } else if (type === "ncc") {
      nccEvents++;
      nccParticipants += act.participants_count || 0;
    }
  }

  return { nssEvents, nccEvents, nssParticipants, nccParticipants };
}

/** Generates NAAC reports and dashboards statistics */
export function calculateNAACParticipation(
  clubs: Club[],
  members: ClubMember[],
  activities: ClubActivity[]
): NAACReportData {
  const clubTypeCounts = {
    nss: 0, ncc: 0, cultural: 0, sports: 0, literary: 0, technical: 0, environmental: 0, other: 0
  };
  const activityTypeCounts = {
    event: 0, camp: 0, competition: 0, workshop: 0, community_service: 0, seminar: 0, other: 0
  };

  clubs.forEach(c => {
    if (c.club_type in clubTypeCounts) {
      clubTypeCounts[c.club_type]++;
    }
  });

  activities.forEach(a => {
    if (a.activity_type in activityTypeCounts) {
      activityTypeCounts[a.activity_type]++;
    }
  });

  const totalParticipants = activities.reduce((sum, a) => sum + (a.participants_count || 0), 0);
  const nssNCC = calculateNSSAndNCCStats(activities);

  return {
    totalClubs: clubs.length,
    totalMembers: members.length,
    totalActivities: activities.length,
    totalParticipants,
    nssNCCActivities: nssNCC.nssEvents + nssNCC.nccEvents,
    nssNCCParticipants: nssNCC.nssParticipants + nssNCC.nccParticipants,
    clubTypeCounts,
    activityTypeCounts,
  };
}
