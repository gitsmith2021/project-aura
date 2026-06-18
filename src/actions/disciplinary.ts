"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type {
  DisciplinaryIncident, DisciplinaryAction, IncidentType, IncidentStatus, ActionType,
} from "@/lib/disciplinary";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const INCIDENT_COLS = "id, institution_id, reported_by, student_id, incident_type, incident_date, location, description, is_anonymous, status, committee_remarks, action_taken, resolved_at, created_at, students(full_name, roll_no)";
const ACTION_COLS = "id, incident_id, action_type, effective_date, duration_days, fine_amount, remarks, issued_by, document_url, created_at, staff(full_name)";

async function currentStaffId(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: byProfile } = await supabase.from("staff").select("id").eq("profile_id", user.id).maybeSingle();
  if (byProfile) return byProfile.id as string;
  if (user.email) {
    const { data: byEmail } = await supabase.from("staff").select("id").eq("email", user.email).maybeSingle();
    if (byEmail) return byEmail.id as string;
  }
  return null;
}

// ── Admin: incidents ─────────────────────────────────────────────────────────

export async function getIncidents(institutionId: string): Promise<Result<DisciplinaryIncident[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("disciplinary_incidents")
      .select(`${INCIDENT_COLS}, disciplinary_actions(id)`)
      .eq("institution_id", institutionId)
      .order("incident_date", { ascending: false });
    if (error) return { success: false, error: error.message };
    const rows = (data ?? []).map((r) => ({
      ...r,
      action_count: Array.isArray(r.disciplinary_actions) ? r.disciplinary_actions.length : 0,
      disciplinary_actions: undefined,
    }));
    return { success: true, data: rows as unknown as DisciplinaryIncident[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getIncident(id: string): Promise<Result<DisciplinaryIncident>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("disciplinary_incidents").select(INCIDENT_COLS).eq("id", id).maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Incident not found." };
    return { success: true, data: data as unknown as DisciplinaryIncident };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Admin / staff files an incident (named reporter). */
export async function reportIncident(input: {
  institutionId: string; incidentType: IncidentType; incidentDate: string; description: string;
  studentId?: string | null; location?: string | null;
}): Promise<Result<{ id: string }>> {
  try {
    if (!input.description.trim()) return { success: false, error: "A description is required." };
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("disciplinary_incidents").insert({
      institution_id: input.institutionId,
      reported_by: user?.id ?? null,
      student_id: input.studentId || null,
      incident_type: input.incidentType,
      incident_date: input.incidentDate,
      location: input.location?.trim() || null,
      description: input.description.trim(),
      is_anonymous: false,
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/disciplinary`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateIncidentStatus(input: {
  institutionId: string; incidentId: string; status: IncidentStatus;
  committeeRemarks?: string | null; actionTaken?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const patch: Record<string, unknown> = { status: input.status };
    if (input.committeeRemarks !== undefined) patch.committee_remarks = input.committeeRemarks?.trim() || null;
    if (input.actionTaken !== undefined) patch.action_taken = input.actionTaken?.trim() || null;
    patch.resolved_at = input.status === "resolved" ? new Date().toISOString() : null;
    const { error } = await supabase.from("disciplinary_incidents").update(patch).eq("id", input.incidentId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/disciplinary`);
    revalidatePath(`/institutions/${input.institutionId}/disciplinary/${input.incidentId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Admin: committee actions ─────────────────────────────────────────────────

export async function getActions(incidentId: string): Promise<Result<DisciplinaryAction[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("disciplinary_actions")
      .select(ACTION_COLS)
      .eq("incident_id", incidentId)
      .order("effective_date", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as DisciplinaryAction[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function recordAction(input: {
  institutionId: string; incidentId: string; actionType: ActionType; effectiveDate: string;
  durationDays?: number | null; fineAmount?: number | null; remarks?: string | null;
}): Promise<Result<{ id: string }>> {
  try {
    const supabase = createClient(await cookies());
    const issuedBy = await currentStaffId(supabase);
    const { data, error } = await supabase.from("disciplinary_actions").insert({
      incident_id: input.incidentId,
      action_type: input.actionType,
      effective_date: input.effectiveDate,
      duration_days: input.durationDays ?? null,
      fine_amount: input.fineAmount ?? null,
      remarks: input.remarks?.trim() || null,
      issued_by: issuedBy,
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/disciplinary/${input.incidentId}`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteAction(input: { institutionId: string; incidentId: string; id: string }): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("disciplinary_actions").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/disciplinary/${input.incidentId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Student: anonymous reporting ─────────────────────────────────────────────

/**
 * A student files a report (anti-ragging / misconduct). When `anonymous`, the
 * reporter's identity is NOT stored. The insert deliberately does not read the
 * row back — students have no SELECT access to incidents (confidentiality).
 */
export async function submitReport(input: {
  incidentType: IncidentType; incidentDate: string; description: string;
  location?: string | null; anonymous: boolean;
}): Promise<Result<null>> {
  try {
    if (!input.description.trim()) return { success: false, error: "Please describe the incident." };
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Please sign in to submit a report." };

    const { data: student } = await supabase.from("students").select("institution_id").eq("email", user.email ?? "").maybeSingle();
    const institutionId = student?.institution_id as string | undefined;
    if (!institutionId) return { success: false, error: "Could not resolve your institution." };

    const { error } = await supabase.from("disciplinary_incidents").insert({
      institution_id: institutionId,
      reported_by: input.anonymous ? null : user.id,
      student_id: null,
      incident_type: input.incidentType,
      incident_date: input.incidentDate,
      location: input.location?.trim() || null,
      description: input.description.trim(),
      is_anonymous: input.anonymous,
      status: "reported",
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
