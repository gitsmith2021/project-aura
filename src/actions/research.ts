"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { ResearchProject, Publication, ProjectStatus, PubType } from "@/lib/research";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const PROJECT_COLS = "id, institution_id, title, principal_investigator, co_investigators, funding_agency, funding_amount, funding_spent, start_date, end_date, status, department_id, created_at, staff:principal_investigator(full_name), departments:department_id(name)";
const PUB_COLS = "id, institution_id, staff_id, title, pub_type, journal_name, publisher, pub_year, doi, scopus_indexed, ugc_listed, impact_factor, authors, document_url, created_at, staff:staff_id(full_name, designation)";

async function currentStaff(supabase: ReturnType<typeof createClient>): Promise<{ id: string; institution_id: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: byProfile } = await supabase.from("staff").select("id, institution_id").eq("profile_id", user.id).maybeSingle();
  if (byProfile) return { id: byProfile.id as string, institution_id: byProfile.institution_id as string };
  if (user.email) {
    const { data: byEmail } = await supabase.from("staff").select("id, institution_id").eq("email", user.email).maybeSingle();
    if (byEmail) return { id: byEmail.id as string, institution_id: byEmail.institution_id as string };
  }
  return null;
}

// ── Projects (admin) ─────────────────────────────────────────────────────────

export async function getProjects(institutionId: string): Promise<Result<ResearchProject[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("research_projects")
      .select(PROJECT_COLS)
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as ResearchProject[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function createProject(input: {
  institutionId: string; title: string; principalInvestigator?: string | null; coInvestigators?: string[] | null;
  fundingAgency?: string | null; fundingAmount?: number | null; fundingSpent?: number | null;
  startDate?: string | null; endDate?: string | null; status?: ProjectStatus; departmentId?: string | null;
}): Promise<Result<{ id: string }>> {
  try {
    if (!input.title.trim()) return { success: false, error: "Project title is required." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("research_projects").insert({
      institution_id: input.institutionId,
      title: input.title.trim(),
      principal_investigator: input.principalInvestigator || null,
      co_investigators: input.coInvestigators ?? null,
      funding_agency: input.fundingAgency?.trim() || null,
      funding_amount: input.fundingAmount ?? null,
      funding_spent: input.fundingSpent ?? null,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      status: input.status ?? "ongoing",
      department_id: input.departmentId || null,
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/research/projects`);
    revalidatePath(`/institutions/${input.institutionId}/research`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateProject(input: {
  institutionId: string; id: string; title?: string; principalInvestigator?: string | null; coInvestigators?: string[] | null;
  fundingAgency?: string | null; fundingAmount?: number | null; fundingSpent?: number | null;
  startDate?: string | null; endDate?: string | null; status?: ProjectStatus; departmentId?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.principalInvestigator !== undefined) patch.principal_investigator = input.principalInvestigator || null;
    if (input.coInvestigators !== undefined) patch.co_investigators = input.coInvestigators;
    if (input.fundingAgency !== undefined) patch.funding_agency = input.fundingAgency?.trim() || null;
    if (input.fundingAmount !== undefined) patch.funding_amount = input.fundingAmount;
    if (input.fundingSpent !== undefined) patch.funding_spent = input.fundingSpent;
    if (input.startDate !== undefined) patch.start_date = input.startDate || null;
    if (input.endDate !== undefined) patch.end_date = input.endDate || null;
    if (input.status !== undefined) patch.status = input.status;
    if (input.departmentId !== undefined) patch.department_id = input.departmentId || null;
    const { error } = await supabase.from("research_projects").update(patch).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/research/projects`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteProject(input: { institutionId: string; id: string }): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("research_projects").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/research/projects`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Publications (admin) ─────────────────────────────────────────────────────

export async function getPublications(institutionId: string): Promise<Result<Publication[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("publications")
      .select(PUB_COLS)
      .eq("institution_id", institutionId)
      .order("pub_year", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as Publication[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

type PubInput = {
  staffId: string; title: string; pubType: PubType; pubYear: number;
  journalName?: string | null; publisher?: string | null; doi?: string | null;
  scopusIndexed?: boolean; ugcListed?: boolean; impactFactor?: number | null;
  authors?: string[] | null; documentUrl?: string | null;
};

function pubRow(institutionId: string, input: PubInput) {
  return {
    institution_id: institutionId,
    staff_id: input.staffId,
    title: input.title.trim(),
    pub_type: input.pubType,
    pub_year: input.pubYear,
    journal_name: input.journalName?.trim() || null,
    publisher: input.publisher?.trim() || null,
    doi: input.doi?.trim() || null,
    scopus_indexed: input.scopusIndexed ?? false,
    ugc_listed: input.ugcListed ?? false,
    impact_factor: input.impactFactor ?? null,
    authors: input.authors ?? null,
    document_url: input.documentUrl?.trim() || null,
  };
}

export async function createPublication(input: { institutionId: string } & PubInput): Promise<Result<{ id: string }>> {
  try {
    if (!input.title.trim()) return { success: false, error: "Publication title is required." };
    if (!input.staffId) return { success: false, error: "Select the faculty author." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("publications").insert(pubRow(input.institutionId, input)).select("id").single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/research/publications`);
    revalidatePath(`/institutions/${input.institutionId}/research`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deletePublication(input: { institutionId: string; id: string }): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("publications").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/research/publications`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Staff self-service ───────────────────────────────────────────────────────

export async function getMyPublications(): Promise<Result<Publication[]>> {
  try {
    const supabase = createClient(await cookies());
    const staff = await currentStaff(supabase);
    if (!staff) return { success: true, data: [] };
    const { data, error } = await supabase
      .from("publications")
      .select(PUB_COLS)
      .eq("staff_id", staff.id)
      .order("pub_year", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as Publication[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/**
 * Staff logs their own publication. If they have an open appraisal (5E), a
 * matching `paper_published` activity is auto-created so they don't enter it twice.
 */
export async function addMyPublication(input: PubInput): Promise<Result<{ id: string }>> {
  try {
    if (!input.title.trim()) return { success: false, error: "Publication title is required." };
    const supabase = createClient(await cookies());
    const staff = await currentStaff(supabase);
    if (!staff) return { success: false, error: "Only staff can log publications." };

    const { data, error } = await supabase
      .from("publications")
      .insert(pubRow(staff.institution_id, { ...input, staffId: staff.id }))
      .select("id").single();
    if (error) return { success: false, error: error.message };

    // Auto-link to an editable appraisal (avoids duplicate evidence entry).
    try {
      const { data: appraisal } = await supabase
        .from("staff_appraisals")
        .select("id")
        .eq("staff_id", staff.id)
        .in("status", ["pending", "submitted"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (appraisal?.id) {
        await supabase.from("staff_appraisal_activities").insert({
          appraisal_id: appraisal.id,
          activity_type: "paper_published",
          title: input.title.trim(),
          description: input.journalName?.trim() || input.publisher?.trim() || null,
          date_of_activity: `${input.pubYear}-01-01`,
          document_url: input.documentUrl?.trim() || null,
        });
      }
    } catch { /* appraisal link is best-effort */ }

    revalidatePath("/staff-portal/research");
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteMyPublication(input: { id: string }): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("publications").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/staff-portal/research");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
