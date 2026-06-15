"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { parseRequirements, type Laboratory, type LabBatch, type LabExperiment, type LabSession, type LabType } from "@/lib/laboratories";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const LAB_COLS =
  "id, institution_id, department_id, name, lab_type, capacity, lab_assistant_id, description, is_active, created_at, departments!department_id(name), staff!lab_assistant_id(full_name)";
const BATCH_COLS = "id, laboratory_id, name, year_semester, created_at";
const EXPERIMENT_COLS = "id, laboratory_id, title, description, requirements, created_at";
const SESSION_COLS =
  "id, laboratory_batch_id, experiment_id, session_date, remarks, created_at, laboratory_batches(name, year_semester), laboratory_experiments(title)";

// ── Laboratories ──────────────────────────────────────────────────────────────
export async function getLaboratories(
  institutionId: string,
  filters?: { departmentId?: string; labType?: string; activeOnly?: boolean }
): Promise<Result<Laboratory[]>> {
  try {
    const supabase = createClient(await cookies());
    let q = supabase.from("laboratories").select(LAB_COLS).eq("institution_id", institutionId);
    if (filters?.departmentId) q = q.eq("department_id", filters.departmentId);
    if (filters?.labType) q = q.eq("lab_type", filters.labType);
    if (filters?.activeOnly) q = q.eq("is_active", true);
    const { data, error } = await q.order("name");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as Laboratory[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getLaboratory(labId: string): Promise<Result<Laboratory>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("laboratories").select(LAB_COLS).eq("id", labId).maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Laboratory not found." };
    return { success: true, data: data as unknown as Laboratory };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export type LabInput = {
  institution_id: string;
  name: string;
  lab_type: LabType;
  department_id?: string | null;
  capacity?: number | null;
  lab_assistant_id?: string | null;
  description?: string | null;
};

export async function addLaboratory(input: LabInput): Promise<Result<Laboratory>> {
  try {
    if (!input.name.trim()) return { success: false, error: "Laboratory name is required." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("laboratories")
      .insert({
        institution_id: input.institution_id,
        name: input.name.trim(),
        lab_type: input.lab_type,
        department_id: input.department_id || null,
        capacity: input.capacity ?? null,
        lab_assistant_id: input.lab_assistant_id || null,
        description: input.description?.trim() || null,
      })
      .select(LAB_COLS)
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institution_id}/laboratories`);
    return { success: true, data: data as unknown as Laboratory };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function setLabActive(labId: string, institutionId: string, isActive: boolean): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("laboratories").update({ is_active: isActive }).eq("id", labId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/laboratories`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Batches ───────────────────────────────────────────────────────────────────
export async function getLabBatches(labId: string): Promise<Result<LabBatch[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("laboratory_batches").select(BATCH_COLS).eq("laboratory_id", labId).order("created_at");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as LabBatch[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function addLabBatch(input: {
  laboratoryId: string; institutionId: string; name: string; year_semester: string;
}): Promise<Result<LabBatch>> {
  try {
    if (!input.name.trim()) return { success: false, error: "Batch name is required." };
    if (!input.year_semester.trim()) return { success: false, error: "Year / semester is required." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("laboratory_batches")
      .insert({ laboratory_id: input.laboratoryId, name: input.name.trim(), year_semester: input.year_semester.trim() })
      .select(BATCH_COLS)
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/laboratories/${input.laboratoryId}`);
    return { success: true, data: data as unknown as LabBatch };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Experiments ───────────────────────────────────────────────────────────────
export async function getLabExperiments(labId: string): Promise<Result<LabExperiment[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("laboratory_experiments").select(EXPERIMENT_COLS).eq("laboratory_id", labId).order("created_at");
    if (error) return { success: false, error: error.message };
    const rows = (data ?? []).map((r) => ({ ...r, requirements: parseRequirements((r as { requirements: unknown }).requirements) }));
    return { success: true, data: rows as unknown as LabExperiment[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function addLabExperiment(input: {
  laboratoryId: string; institutionId: string; title: string; description?: string | null; requirements?: string[];
}): Promise<Result<LabExperiment>> {
  try {
    if (!input.title.trim()) return { success: false, error: "Experiment title is required." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("laboratory_experiments")
      .insert({
        laboratory_id: input.laboratoryId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        requirements: input.requirements && input.requirements.length > 0 ? input.requirements : null,
      })
      .select(EXPERIMENT_COLS)
      .single();
    if (error) return { success: false, error: error.message };
    const row = { ...data, requirements: parseRequirements((data as { requirements: unknown }).requirements) };
    revalidatePath(`/institutions/${input.institutionId}/laboratories/${input.laboratoryId}`);
    return { success: true, data: row as unknown as LabExperiment };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Sessions ──────────────────────────────────────────────────────────────────
export async function getLabSessions(labId: string): Promise<Result<LabSession[]>> {
  try {
    const supabase = createClient(await cookies());
    // sessions are keyed by batch; resolve this lab's batch ids first
    const { data: batches, error: bErr } = await supabase
      .from("laboratory_batches").select("id").eq("laboratory_id", labId);
    if (bErr) return { success: false, error: bErr.message };
    const batchIds = (batches ?? []).map((b) => b.id as string);
    if (batchIds.length === 0) return { success: true, data: [] };
    const { data, error } = await supabase
      .from("laboratory_sessions").select(SESSION_COLS)
      .in("laboratory_batch_id", batchIds)
      .order("session_date", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as LabSession[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function logLabSession(input: {
  institutionId: string; laboratoryId: string; batchId: string; experimentId: string;
  sessionDate: string; remarks?: string | null;
}): Promise<Result<LabSession>> {
  try {
    if (!input.batchId) return { success: false, error: "Select a batch." };
    if (!input.experimentId) return { success: false, error: "Select an experiment." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("laboratory_sessions")
      .insert({
        laboratory_batch_id: input.batchId,
        experiment_id: input.experimentId,
        session_date: input.sessionDate,
        remarks: input.remarks?.trim() || null,
      })
      .select(SESSION_COLS)
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/laboratories/${input.laboratoryId}/sessions`);
    return { success: true, data: data as unknown as LabSession };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Attendance + marks ────────────────────────────────────────────────────────
export type RosterStudent = { id: string; name: string; roll_no: string | null };

/** Students eligible for a lab's session roster: the lab's department if set, else
 *  the whole institution. Used to build the attendance grid. */
export async function getLabRoster(institutionId: string, departmentId: string | null): Promise<Result<RosterStudent[]>> {
  try {
    const supabase = createClient(await cookies());
    let q = supabase.from("students").select("id, full_name, roll_no").eq("institution_id", institutionId);
    if (departmentId) q = q.eq("department_id", departmentId);
    const { data, error } = await q.order("roll_no").limit(300);
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: (data ?? []).map((s) => ({ id: s.id as string, name: s.full_name as string, roll_no: (s.roll_no as string) ?? null })),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export type AttendanceEntry = { studentId: string; isPresent: boolean; marks: number | null; remarks?: string | null };

export async function getSessionAttendance(sessionId: string): Promise<Result<Record<string, { is_present: boolean; marks_secured: number | null; remarks: string | null }>>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("laboratory_attendance").select("student_id, is_present, marks_secured, remarks").eq("session_id", sessionId);
    if (error) return { success: false, error: error.message };
    const byStudent: Record<string, { is_present: boolean; marks_secured: number | null; remarks: string | null }> = {};
    for (const r of data ?? []) {
      byStudent[r.student_id as string] = {
        is_present: r.is_present as boolean,
        marks_secured: (r.marks_secured as number) ?? null,
        remarks: (r.remarks as string) ?? null,
      };
    }
    return { success: true, data: byStudent };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Upsert attendance + marks for a session (one row per student). */
export async function submitLabAttendance(input: {
  institutionId: string; laboratoryId: string; sessionId: string; entries: AttendanceEntry[];
}): Promise<Result<{ count: number }>> {
  try {
    if (input.entries.length === 0) return { success: false, error: "No attendance to record." };
    const supabase = createClient(await cookies());
    const rows = input.entries.map((e) => ({
      session_id: input.sessionId,
      student_id: e.studentId,
      is_present: e.isPresent,
      marks_secured: e.marks,
      remarks: e.remarks?.trim() || null,
    }));
    const { error } = await supabase.from("laboratory_attendance").upsert(rows, { onConflict: "session_id,student_id" });
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/laboratories/${input.laboratoryId}/sessions`);
    return { success: true, data: { count: rows.length } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Staff portal ──────────────────────────────────────────────────────────────
/** Laboratories where the current user is the assigned lab assistant. */
export async function getMyAssignedLabs(): Promise<Result<Laboratory[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };
    const { data: staffRows, error: sErr } = await supabase
      .from("staff").select("id").eq("profile_id", user.id);
    if (sErr) return { success: false, error: sErr.message };
    const staffIds = (staffRows ?? []).map((s) => s.id as string);
    if (staffIds.length === 0) return { success: true, data: [] };
    const { data, error } = await supabase
      .from("laboratories").select(LAB_COLS).in("lab_assistant_id", staffIds).order("name");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as Laboratory[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Student portal ────────────────────────────────────────────────────────────
export type MyLabSession = {
  session_id: string;
  session_date: string;
  lab_name: string;
  lab_type: string;
  batch_name: string;
  experiment_title: string;
  is_present: boolean;
  marks_secured: number | null;
  remarks: string | null;
};

/** The current student's lab sessions (derived from their attendance rows), newest first. */
export async function getMyLabSessions(): Promise<Result<MyLabSession[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const { data: student } = await supabase.from("students").select("id").eq("profile_id", user.id).maybeSingle();
    if (!student) return { success: true, data: [] };

    const { data, error } = await supabase
      .from("laboratory_attendance")
      .select(
        "is_present, marks_secured, remarks, " +
        "laboratory_sessions(id, session_date, laboratory_experiments(title), " +
        "laboratory_batches(name, laboratories(name, lab_type)))"
      )
      .eq("student_id", student.id as string);
    if (error) return { success: false, error: error.message };

    const rows: MyLabSession[] = (data ?? []).map((r) => {
      const rec = r as unknown as { laboratory_sessions: unknown; is_present: boolean; marks_secured: number | null; remarks: string | null };
      const s = rec.laboratory_sessions as unknown as {
        id: string; session_date: string;
        laboratory_experiments: { title: string } | null;
        laboratory_batches: { name: string; laboratories: { name: string; lab_type: string } | null } | null;
      } | null;
      return {
        session_id: s?.id ?? "",
        session_date: s?.session_date ?? "",
        lab_name: s?.laboratory_batches?.laboratories?.name ?? "Laboratory",
        lab_type: s?.laboratory_batches?.laboratories?.lab_type ?? "other",
        batch_name: s?.laboratory_batches?.name ?? "—",
        experiment_title: s?.laboratory_experiments?.title ?? "Experiment",
        is_present: rec.is_present,
        marks_secured: rec.marks_secured ?? null,
        remarks: rec.remarks ?? null,
      };
    });
    rows.sort((a, b) => b.session_date.localeCompare(a.session_date));
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Staff/student lab assistants pickable when creating a lab (staff directory). */
export async function getLabAssistants(institutionId: string): Promise<Result<{ id: string; name: string }[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("staff").select("id, full_name").eq("institution_id", institutionId).eq("is_active", true).order("full_name");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []).map((s) => ({ id: s.id as string, name: s.full_name as string })) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
