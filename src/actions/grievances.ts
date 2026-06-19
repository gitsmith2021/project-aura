"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createNotification } from "@/actions/notifications";
import { buildGrievanceStatusMessage } from "@/lib/notifications";
import {
  STATUS_LABELS, defaultDeadline,
  type Grievance, type GrievanceCategory, type GrievanceStatus,
} from "@/lib/grievances";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const GRIEVANCE_COLS =
  "id, institution_id, submitted_by, complainant_type, category, subject, description, evidence_url, status, assigned_to, resolution_notes, resolved_at, deadline, created_at, staff:assigned_to(full_name)";

// Resolve the signed-in user to a (complainant_type, institution_id). Students
// and staff can read their own row under existing RLS, so no service-role here.
async function resolveComplainant(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  email: string | null
): Promise<{ type: "student" | "staff"; institutionId: string } | null> {
  const { data: student } = await supabase
    .from("students").select("institution_id")
    .or(`profile_id.eq.${userId}${email ? `,email.eq.${email}` : ""}`)
    .maybeSingle();
  if (student?.institution_id) return { type: "student", institutionId: student.institution_id as string };

  const { data: staff } = await supabase
    .from("staff").select("institution_id")
    .or(`profile_id.eq.${userId}${email ? `,email.eq.${email}` : ""}`)
    .maybeSingle();
  if (staff?.institution_id) return { type: "staff", institutionId: staff.institution_id as string };

  return null;
}

// ── Portal: submit + track ────────────────────────────────────────────────────

/**
 * A student or staff member files a grievance. When `anonymous`, the
 * complainant's identity is NOT stored (`submitted_by` NULL, type 'anonymous'),
 * so the case can never be traced back — but it also can't be self-tracked.
 */
export async function submitGrievance(input: {
  category: GrievanceCategory;
  subject: string;
  description: string;
  anonymous: boolean;
}): Promise<Result<null>> {
  try {
    if (!input.subject.trim()) return { success: false, error: "Please add a subject." };
    if (!input.description.trim()) return { success: false, error: "Please describe your grievance." };

    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Please sign in to submit a grievance." };

    const who = await resolveComplainant(supabase, user.id, user.email ?? null);
    if (!who) return { success: false, error: "Could not resolve your institution." };

    const { error } = await supabase.from("grievances").insert({
      institution_id: who.institutionId,
      submitted_by: input.anonymous ? null : user.id,
      complainant_type: input.anonymous ? "anonymous" : who.type,
      category: input.category,
      subject: input.subject.trim(),
      description: input.description.trim(),
      status: "submitted",
    });
    if (error) return { success: false, error: error.message };

    revalidatePath("/student-portal/grievance");
    revalidatePath("/staff-portal/grievance");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Complainant tracks their own (non-anonymous) grievances. */
export async function getMyGrievances(): Promise<Result<Grievance[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Please sign in." };

    const { data, error } = await supabase
      .from("grievances")
      .select(GRIEVANCE_COLS)
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as Grievance[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Admin: queue + workflow ───────────────────────────────────────────────────

export async function getGrievances(institutionId: string): Promise<Result<Grievance[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("grievances")
      .select(GRIEVANCE_COLS)
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as Grievance[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getGrievance(id: string): Promise<Result<Grievance>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("grievances").select(GRIEVANCE_COLS).eq("id", id).maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Grievance not found." };
    return { success: true, data: data as unknown as Grievance };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Notify the named complainant of a status change (anonymous → nobody to tell). */
async function notifyComplainant(institutionId: string, submittedBy: string | null, subject: string, status: GrievanceStatus): Promise<void> {
  if (!submittedBy) return;
  const msg = buildGrievanceStatusMessage(subject, STATUS_LABELS[status]);
  await createNotification({
    institutionId, recipientId: submittedBy, ...msg,
    data: { href: "/student-portal/grievance" },
  });
}

export async function updateGrievanceStatus(input: {
  institutionId: string; grievanceId: string; status: GrievanceStatus; resolutionNotes?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());

    const { data: before } = await supabase
      .from("grievances").select("submitted_by, subject, status").eq("id", input.grievanceId).maybeSingle();
    if (!before) return { success: false, error: "Grievance not found." };

    const patch: Record<string, unknown> = { status: input.status };
    if (input.resolutionNotes !== undefined) patch.resolution_notes = input.resolutionNotes?.trim() || null;
    // Stamp/clear the resolution timestamp as the case enters/leaves a closed state.
    patch.resolved_at = (input.status === "resolved" || input.status === "closed") ? new Date().toISOString() : null;

    const { error } = await supabase.from("grievances").update(patch).eq("id", input.grievanceId);
    if (error) return { success: false, error: error.message };

    if (input.status !== (before.status as GrievanceStatus)) {
      await notifyComplainant(input.institutionId, before.submitted_by as string | null, before.subject as string, input.status);
    }

    revalidatePath(`/institutions/${input.institutionId}/grievances`);
    revalidatePath(`/institutions/${input.institutionId}/grievances/${input.grievanceId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function assignGrievance(input: {
  institutionId: string; grievanceId: string; staffId: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("grievances").update({ assigned_to: input.staffId || null }).eq("id", input.grievanceId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/grievances/${input.grievanceId}`);
    revalidatePath(`/institutions/${input.institutionId}/grievances`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function setGrievanceDeadline(input: {
  institutionId: string; grievanceId: string; deadline: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("grievances").update({ deadline: input.deadline || null }).eq("id", input.grievanceId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/grievances/${input.grievanceId}`);
    revalidatePath(`/institutions/${input.institutionId}/grievances`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Acknowledge a freshly-submitted grievance and set the default SLA deadline. */
export async function acknowledgeGrievance(input: {
  institutionId: string; grievanceId: string;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { data: before } = await supabase
      .from("grievances").select("submitted_by, subject, deadline, created_at").eq("id", input.grievanceId).maybeSingle();
    if (!before) return { success: false, error: "Grievance not found." };

    const { error } = await supabase.from("grievances").update({
      status: "acknowledged",
      deadline: (before.deadline as string | null) || defaultDeadline(before.created_at as string),
    }).eq("id", input.grievanceId);
    if (error) return { success: false, error: error.message };

    await notifyComplainant(input.institutionId, before.submitted_by as string | null, before.subject as string, "acknowledged");

    revalidatePath(`/institutions/${input.institutionId}/grievances`);
    revalidatePath(`/institutions/${input.institutionId}/grievances/${input.grievanceId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteGrievance(input: { institutionId: string; grievanceId: string }): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("grievances").delete().eq("id", input.grievanceId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/grievances`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
