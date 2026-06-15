"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";
import type {
  Club,
  ClubMember,
  ClubActivity,
  ClubType,
  ClubMemberRole,
  ClubActivityType,
  NAACReportData,
} from "@/lib/clubs";
import { calculateNAACParticipation } from "@/lib/clubs";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const CLUB_SELECT = "id, institution_id, name, club_type, faculty_coordinator, student_secretary_id, description, is_active, created_at, coordinator:staff(id, title, full_name, email), secretary:students(id, full_name, roll_no)";
const MEMBER_SELECT = "id, club_id, student_id, role, joined_at, created_at, student:students(id, full_name, roll_no, student_program, student_year, email)";
const ACTIVITY_SELECT = "id, club_id, title, activity_type, activity_date, venue, participants_count, description, photo_urls, created_at, club:clubs(name, club_type)";

/** Resolve the current authenticated user's ID. */
async function getAuthUserId(supabase: any): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ── Clubs Directory ────────────────────────────────────────────────────────────

export async function getClubs(institutionId: string): Promise<Result<Club[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data: clubs, error } = await supabase
      .from("clubs")
      .select(CLUB_SELECT)
      .eq("institution_id", institutionId)
      .order("name", { ascending: true });

    if (error) return { success: false, error: error.message };
    if (!clubs) return { success: true, data: [] };

    // Fetch counts in parallel to avoid heavy SQL joins
    const { data: memberCounts } = await supabase.from("club_members").select("club_id");
    const { data: activityCounts } = await supabase.from("club_activities").select("club_id");

    const mapped = clubs.map((c: any) => {
      const mCount = memberCounts?.filter((m) => m.club_id === c.id).length ?? 0;
      const aCount = activityCounts?.filter((a) => a.club_id === c.id).length ?? 0;
      return {
        ...c,
        members_count: mCount,
        activities_count: aCount,
      } as Club;
    });

    return { success: true, data: mapped };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load clubs." };
  }
}

export async function getClub(clubId: string): Promise<Result<Club>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("clubs")
      .select(CLUB_SELECT)
      .eq("id", clubId)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Club not found." };

    const { count: mCount } = await supabase.from("club_members").select("id", { count: "exact", head: true }).eq("club_id", clubId);
    const { count: aCount } = await supabase.from("club_activities").select("id", { count: "exact", head: true }).eq("club_id", clubId);

    return {
      success: true,
      data: {
        ...data,
        members_count: mCount ?? 0,
        activities_count: aCount ?? 0,
      } as unknown as Club,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load club." };
  }
}

export type CreateClubInput = {
  institution_id: string;
  name: string;
  club_type: ClubType;
  faculty_coordinator: string | null;
  student_secretary_id: string | null;
  description: string | null;
  is_active: boolean;
};

export async function addClub(input: CreateClubInput): Promise<Result<Club>> {
  try {
    if (!input.name.trim()) return { success: false, error: "Club name is required." };
    const supabase = createClient(await cookies());
    const authId = await getAuthUserId(supabase);

    const { data, error } = await supabase
      .from("clubs")
      .insert({
        institution_id: input.institution_id,
        name: input.name.trim(),
        club_type: input.club_type,
        faculty_coordinator: input.faculty_coordinator || null,
        student_secretary_id: input.student_secretary_id || null,
        description: input.description?.trim() || null,
        is_active: input.is_active,
      })
      .select(CLUB_SELECT)
      .single();

    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId: input.institution_id,
      performedBy: authId,
      tableName: "clubs",
      recordId: data.id,
      action: "INSERT",
      afterData: data,
      notes: `Created club ${input.name}`,
    });

    revalidatePath(`/institutions/${input.institution_id}/clubs`);
    return { success: true, data: data as unknown as Club };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create club." };
  }
}

export async function updateClub(
  clubId: string,
  input: Partial<CreateClubInput>
): Promise<Result<Club>> {
  try {
    const supabase = createClient(await cookies());
    const authId = await getAuthUserId(supabase);

    // Fetch before data for audit
    const { data: before } = await supabase.from("clubs").select("*").eq("id", clubId).maybeSingle();

    const { data, error } = await supabase
      .from("clubs")
      .update({
        name: input.name?.trim(),
        club_type: input.club_type,
        faculty_coordinator: input.faculty_coordinator,
        student_secretary_id: input.student_secretary_id,
        description: input.description?.trim(),
        is_active: input.is_active,
      })
      .eq("id", clubId)
      .select(CLUB_SELECT)
      .single();

    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId: data.institution_id,
      performedBy: authId,
      tableName: "clubs",
      recordId: clubId,
      action: "UPDATE",
      beforeData: before,
      afterData: data,
      notes: `Updated club details for ${data.name}`,
    });

    revalidatePath(`/institutions/${data.institution_id}/clubs`);
    revalidatePath(`/institutions/${data.institution_id}/clubs/${clubId}`);
    return { success: true, data: data as unknown as Club };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update club." };
  }
}

// ── Club Members ───────────────────────────────────────────────────────────────

export async function getClubMembers(clubId: string): Promise<Result<ClubMember[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("club_members")
      .select(MEMBER_SELECT)
      .eq("club_id", clubId)
      .order("joined_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as ClubMember[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load members." };
  }
}

export async function addClubMember(
  clubId: string,
  studentId: string,
  role: ClubMemberRole,
  institutionId: string
): Promise<Result<ClubMember>> {
  try {
    const supabase = createClient(await cookies());
    const authId = await getAuthUserId(supabase);

    const { data, error } = await supabase
      .from("club_members")
      .insert({ club_id: clubId, student_id: studentId, role })
      .select(MEMBER_SELECT)
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "This student is already a member of this club." };
      }
      return { success: false, error: error.message };
    }

    await logAudit({
      institutionId,
      performedBy: authId,
      tableName: "club_members",
      recordId: data.id,
      action: "INSERT",
      afterData: data,
      notes: `Added student ${studentId} to club ${clubId} as ${role}`,
    });

    revalidatePath(`/institutions/${institutionId}/clubs/${clubId}`);
    return { success: true, data: data as unknown as ClubMember };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to add member." };
  }
}

export async function removeClubMember(
  memberId: string,
  clubId: string,
  institutionId: string
): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const authId = await getAuthUserId(supabase);

    // Fetch before data for audit
    const { data: before } = await supabase.from("club_members").select("*").eq("id", memberId).maybeSingle();

    const { error } = await supabase.from("club_members").delete().eq("id", memberId);
    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId,
      performedBy: authId,
      tableName: "club_members",
      recordId: memberId,
      action: "DELETE",
      beforeData: before,
      notes: `Removed member ${memberId} from club ${clubId}`,
    });

    revalidatePath(`/institutions/${institutionId}/clubs/${clubId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to remove member." };
  }
}

// ── Club Activities ────────────────────────────────────────────────────────────

export async function getClubActivities(clubId: string): Promise<Result<ClubActivity[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("club_activities")
      .select(ACTIVITY_SELECT)
      .eq("club_id", clubId)
      .order("activity_date", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as ClubActivity[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load activities." };
  }
}

export type LogActivityInput = {
  title: string;
  activity_type: ClubActivityType;
  activity_date: string;
  venue: string | null;
  participants_count: number;
  description: string | null;
  photo_urls: string[];
};

export async function logClubActivity(
  clubId: string,
  input: LogActivityInput,
  institutionId: string
): Promise<Result<ClubActivity>> {
  try {
    if (!input.title.trim()) return { success: false, error: "Activity title is required." };
    if (!input.activity_date) return { success: false, error: "Activity date is required." };
    const supabase = createClient(await cookies());
    const authId = await getAuthUserId(supabase);

    const { data, error } = await supabase
      .from("club_activities")
      .insert({
        club_id: clubId,
        title: input.title.trim(),
        activity_type: input.activity_type,
        activity_date: input.activity_date,
        venue: input.venue?.trim() || null,
        participants_count: input.participants_count,
        description: input.description?.trim() || null,
        photo_urls: input.photo_urls,
      })
      .select(ACTIVITY_SELECT)
      .single();

    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId,
      performedBy: authId,
      tableName: "club_activities",
      recordId: data.id,
      action: "INSERT",
      afterData: data,
      notes: `Logged activity "${input.title}" for club ${clubId}`,
    });

    revalidatePath(`/institutions/${institutionId}/clubs/${clubId}`);
    return { success: true, data: data as unknown as ClubActivity };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to log activity." };
  }
}

export async function deleteClubActivity(
  activityId: string,
  clubId: string,
  institutionId: string
): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const authId = await getAuthUserId(supabase);

    // Fetch before data for audit
    const { data: before } = await supabase.from("club_activities").select("*").eq("id", activityId).maybeSingle();

    const { error } = await supabase.from("club_activities").delete().eq("id", activityId);
    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId,
      performedBy: authId,
      tableName: "club_activities",
      recordId: activityId,
      action: "DELETE",
      beforeData: before,
      notes: `Deleted activity ${activityId} from club ${clubId}`,
    });

    revalidatePath(`/institutions/${institutionId}/clubs/${clubId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete activity." };
  }
}

// ── NAAC Extracurricular Reports ───────────────────────────────────────────────

export async function getNAACReport(institutionId: string): Promise<Result<NAACReportData>> {
  try {
    const supabase = createClient(await cookies());

    const { data: clubs, error: clubsErr } = await supabase
      .from("clubs")
      .select("*")
      .eq("institution_id", institutionId);

    if (clubsErr) return { success: false, error: clubsErr.message };
    if (!clubs || clubs.length === 0) {
      return {
        success: true,
        data: calculateNAACParticipation([], [], []),
      };
    }

    const clubIds = clubs.map((c) => c.id);

    const { data: members, error: membersErr } = await supabase
      .from("club_members")
      .select("*")
      .in("club_id", clubIds);

    if (membersErr) return { success: false, error: membersErr.message };

    const { data: activities, error: actsErr } = await supabase
      .from("club_activities")
      .select("*, club:clubs(name, club_type)")
      .in("club_id", clubIds);

    if (actsErr) return { success: false, error: actsErr.message };

    const report = calculateNAACParticipation(clubs, members ?? [], activities ?? []);
    return { success: true, data: report };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to compile report." };
  }
}

// ── Portal Services (Student and Staff Specific) ───────────────────────────────

export async function getMyClubMemberships(): Promise<Result<ClubMember[]>> {
  try {
    const supabase = createClient(await cookies());
    const authId = await getAuthUserId(supabase);
    if (!authId) return { success: false, error: "Unauthorized." };

    const { data: student } = await supabase.from("students").select("id").eq("profile_id", authId).maybeSingle();
    if (!student) return { success: true, data: [] };

    const { data, error } = await supabase
      .from("club_members")
      .select(`
        id, club_id, student_id, role, joined_at, created_at,
        club:clubs(id, name, club_type, description, is_active, coordinator:staff(full_name))
      `)
      .eq("student_id", student.id);

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as any as ClubMember[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load memberships." };
  }
}

export async function getAssignedCoordinatorClubs(): Promise<Result<Club[]>> {
  try {
    const supabase = createClient(await cookies());
    const authId = await getAuthUserId(supabase);
    if (!authId) return { success: false, error: "Unauthorized." };

    const { data: staff } = await supabase.from("staff").select("id").eq("profile_id", authId).maybeSingle();
    if (!staff) return { success: true, data: [] };

    const { data: clubs, error } = await supabase
      .from("clubs")
      .select(CLUB_SELECT)
      .eq("faculty_coordinator", staff.id)
      .order("name", { ascending: true });

    if (error) return { success: false, error: error.message };
    if (!clubs) return { success: true, data: [] };

    const { data: memberCounts } = await supabase.from("club_members").select("club_id");
    const { data: activityCounts } = await supabase.from("club_activities").select("club_id");

    const mapped = clubs.map((c: any) => {
      const mCount = memberCounts?.filter((m) => m.club_id === c.id).length ?? 0;
      const aCount = activityCounts?.filter((a) => a.club_id === c.id).length ?? 0;
      return {
        ...c,
        members_count: mCount,
        activities_count: aCount,
      } as Club;
    });

    return { success: true, data: mapped };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load assigned clubs." };
  }
}

export async function getCoordinatorOptions(
  institutionId: string
): Promise<Result<{ id: string; full_name: string }[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("staff")
      .select("id, full_name")
      .eq("institution_id", institutionId)
      .eq("is_active", true)
      .order("full_name");
    if (error) return { success: false, error: error.message };
    return { success: true, data: data ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load coordinators." };
  }
}

export async function getSecretaryOptions(
  institutionId: string
): Promise<Result<{ id: string; full_name: string; roll_no: string | null }[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, roll_no")
      .eq("institution_id", institutionId)
      .order("full_name");
    if (error) return { success: false, error: error.message };
    return { success: true, data: data ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load student options." };
  }
}

