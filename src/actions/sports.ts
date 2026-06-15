"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";
import type { AchievementLevel, TeamCategory } from "@/lib/sports";

type Result<T> = { success: true; data: T } | { success: false; error: string };

// ── Shared types ──────────────────────────────────────────────────────────────

export type SportsFacility = {
  id: string;
  institution_id: string;
  name: string;
  sport_type: string;
  capacity: number | null;
  is_active: boolean;
  created_at: string;
};

export type SportsTeam = {
  id: string;
  institution_id: string;
  sport_name: string;
  team_category: TeamCategory;
  coach_id: string | null;
  academic_year_id: string | null;
  created_at: string;
  coach?: { id: string; full_name: string; title: string | null } | null;
  academic_year?: { id: string; label: string } | null;
  member_count: number;
};

export type TeamMember = {
  id: string;
  team_id: string;
  student_id: string;
  position: string | null;
  joined_at: string;
  student?: { id: string; full_name: string; roll_no: string | null };
};

export type SportsAchievement = {
  id: string;
  institution_id: string;
  team_id: string | null;
  student_id: string | null;
  event_name: string;
  level: AchievementLevel;
  position: string;
  event_date: string;
  certificate_url: string | null;
  created_at: string;
  team?: { id: string; sport_name: string; team_category: TeamCategory } | null;
  student?: { id: string; full_name: string; roll_no: string | null } | null;
};

export type StudentOption = {
  id: string;
  full_name: string;
  roll_no: string | null;
  profile_id: string;
};

// ── Queries — Facilities ──────────────────────────────────────────────────────

export async function getFacilities(institutionId: string): Promise<Result<SportsFacility[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("sports_facilities")
      .select("*")
      .eq("institution_id", institutionId)
      .order("name");

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as SportsFacility[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load facilities." };
  }
}

// ── Queries — Teams ───────────────────────────────────────────────────────────

export async function getTeams(institutionId: string): Promise<Result<SportsTeam[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("sports_teams")
      .select("*, coach:staff(id, full_name, title), academic_year:academic_years(id, label)")
      .eq("institution_id", institutionId)
      .order("sport_name");

    if (error) return { success: false, error: error.message };

    const teams = data ?? [];
    const { data: members } = await supabase
      .from("sports_team_members")
      .select("team_id")
      .in("team_id", teams.map((t: { id: string }) => t.id));

    return {
      success: true,
      data: teams.map((t: Record<string, unknown>) => ({
        ...t,
        member_count: members?.filter((m: { team_id: string }) => m.team_id === t.id).length ?? 0,
      })) as SportsTeam[],
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load teams." };
  }
}

export async function getTeamMembers(teamId: string): Promise<Result<TeamMember[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("sports_team_members")
      .select("*, student:students(id, full_name, roll_no)")
      .eq("team_id", teamId)
      .order("joined_at");

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as TeamMember[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load roster." };
  }
}

// ── Queries — Achievements ────────────────────────────────────────────────────

export async function getAchievements(
  institutionId: string,
  opts: { level?: AchievementLevel; limit?: number } = {}
): Promise<Result<SportsAchievement[]>> {
  try {
    const supabase = createClient(await cookies());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from("sports_achievements")
      .select("*, team:sports_teams(id, sport_name, team_category), student:students(id, full_name, roll_no)")
      .eq("institution_id", institutionId)
      .order("event_date", { ascending: false });

    if (opts.level) q = q.eq("level", opts.level);
    if (opts.limit) q = q.limit(opts.limit);

    const { data, error } = await q;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as SportsAchievement[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load achievements." };
  }
}

/** NAAC/NIRF export — all achievements with full details. */
export async function getSportsReport(institutionId: string): Promise<Result<SportsAchievement[]>> {
  return getAchievements(institutionId);
}

// ── Queries — Form helpers ────────────────────────────────────────────────────

export async function getCoachOptions(
  institutionId: string
): Promise<Result<Array<{ id: string; full_name: string; title: string | null }>>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("staff")
      .select("id, full_name, title")
      .eq("institution_id", institutionId)
      .order("full_name");

    if (error) return { success: false, error: error.message };
    return { success: true, data: data ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load coaches." };
  }
}

export async function getAcademicYearOptions(
  institutionId: string
): Promise<Result<Array<{ id: string; label: string }>>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("academic_years")
      .select("id, label")
      .eq("institution_id", institutionId)
      .order("start_date", { ascending: false })
      .limit(5);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load academic years." };
  }
}

export async function searchStudentsForSports(
  institutionId: string,
  query: string
): Promise<Result<StudentOption[]>> {
  try {
    if (!query.trim()) return { success: true, data: [] };
    const supabase = createClient(await cookies());
    const q = `%${query.trim()}%`;
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, roll_no, profile_id")
      .eq("institution_id", institutionId)
      .or(`full_name.ilike.${q},roll_no.ilike.${q}`)
      .limit(10);

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as StudentOption[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Search failed." };
  }
}

// ── Mutations — Facilities ────────────────────────────────────────────────────

export async function addFacility(payload: {
  institutionId: string;
  name: string;
  sportType: string;
  capacity?: number;
}): Promise<Result<{ id: string }>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data, error } = await supabase
      .from("sports_facilities")
      .insert({
        institution_id: payload.institutionId,
        name: payload.name.trim(),
        sport_type: payload.sportType.trim(),
        capacity: payload.capacity || null,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${payload.institutionId}/sports`);
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to add facility." };
  }
}

export async function setFacilityActive(
  id: string,
  isActive: boolean,
  institutionId: string
): Promise<Result<void>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase
      .from("sports_facilities")
      .update({ is_active: isActive })
      .eq("id", id)
      .eq("institution_id", institutionId);

    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/sports`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update facility." };
  }
}

// ── Mutations — Teams ─────────────────────────────────────────────────────────

export async function addTeam(payload: {
  institutionId: string;
  sportName: string;
  teamCategory: TeamCategory;
  coachId?: string;
  academicYearId?: string;
}): Promise<Result<{ id: string }>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data, error } = await supabase
      .from("sports_teams")
      .insert({
        institution_id: payload.institutionId,
        sport_name: payload.sportName.trim(),
        team_category: payload.teamCategory,
        coach_id: payload.coachId || null,
        academic_year_id: payload.academicYearId || null,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId: payload.institutionId,
      performedBy: user.id,
      tableName: "sports_teams",
      recordId: data.id,
      action: "INSERT",
    });

    revalidatePath(`/institutions/${payload.institutionId}/sports`);
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to add team." };
  }
}

export async function addTeamMember(payload: {
  teamId: string;
  studentId: string;
  position?: string;
  institutionId: string;
}): Promise<Result<{ id: string }>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("sports_team_members")
      .insert({
        team_id: payload.teamId,
        student_id: payload.studentId,
        position: payload.position?.trim() || null,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${payload.institutionId}/sports`);
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to add team member." };
  }
}

export async function removeTeamMember(id: string, institutionId: string): Promise<Result<void>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("sports_team_members").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/sports`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to remove member." };
  }
}

// ── Mutations — Achievements ──────────────────────────────────────────────────

export async function logAchievement(payload: {
  institutionId: string;
  eventName: string;
  level: AchievementLevel;
  position: string;
  eventDate: string;
  teamId?: string;
  studentId?: string;
  certificateUrl?: string;
}): Promise<Result<{ id: string }>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data, error } = await supabase
      .from("sports_achievements")
      .insert({
        institution_id: payload.institutionId,
        event_name: payload.eventName.trim(),
        level: payload.level,
        position: payload.position.trim(),
        event_date: payload.eventDate,
        team_id: payload.teamId || null,
        student_id: payload.studentId || null,
        certificate_url: payload.certificateUrl?.trim() || null,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId: payload.institutionId,
      performedBy: user.id,
      tableName: "sports_achievements",
      recordId: data.id,
      action: "INSERT",
    });

    revalidatePath(`/institutions/${payload.institutionId}/sports`);
    revalidatePath(`/institutions/${payload.institutionId}/sports/achievements`);
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to log achievement." };
  }
}

// ── Student Portal ────────────────────────────────────────────────────────────

/** Student's own team memberships. */
export async function getMyTeams(): Promise<Result<Array<{
  teamId: string;
  sportName: string;
  teamCategory: TeamCategory;
  position: string | null;
  coachName: string | null;
}>>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!student) return { success: true, data: [] };

    const { data, error } = await supabase
      .from("sports_team_members")
      .select("position, team:sports_teams(id, sport_name, team_category, coach:staff(full_name))")
      .eq("student_id", student.id);

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: (data ?? []).map((m: Record<string, unknown>) => {
        const team = m.team as Record<string, unknown> | null;
        const coach = team?.coach as Record<string, unknown> | null;
        return {
          teamId: (team?.id as string) ?? "",
          sportName: (team?.sport_name as string) ?? "",
          teamCategory: (team?.team_category as TeamCategory) ?? "mixed",
          position: m.position as string | null,
          coachName: (coach?.full_name as string) ?? null,
        };
      }),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load teams." };
  }
}

/** Student's own achievements. */
export async function getMyAchievements(): Promise<Result<SportsAchievement[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!student) return { success: true, data: [] };

    const { data, error } = await supabase
      .from("sports_achievements")
      .select("*, team:sports_teams(id, sport_name, team_category)")
      .eq("student_id", student.id)
      .order("event_date", { ascending: false });

    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: (data ?? []).map((a) => ({ ...a, student: null })) as SportsAchievement[],
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load achievements." };
  }
}
