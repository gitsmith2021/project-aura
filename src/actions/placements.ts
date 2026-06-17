"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createNotification } from "@/actions/notifications";
import {
  checkEligibility, placementStats, deptWiseBreakdown, STAGE_LABELS,
  type Company, type PlacementDrive, type PlacementRegistration, type EligibilityCriteria,
  type StageStatus, type DriveStatus, type PlacementStats, type DeptPlacement, type PlacementStatRow,
} from "@/lib/placements";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const COMPANY_COLS = "id, institution_id, name, industry, website, hr_contact_name, hr_contact_email, hr_contact_phone, created_at";
const DRIVE_COLS = "id, institution_id, company_id, academic_year_id, drive_date, job_role, ctc_offered, eligibility_criteria, process_stages, is_exclusive, status, created_at, companies(name, industry)";
const REG_COLS = "id, drive_id, student_id, stage_status, offer_ctc, notes, registered_at, placed_at, students(full_name, roll_no, department_id)";

async function currentStudent(supabase: ReturnType<typeof createClient>): Promise<{ id: string; department_id: string | null } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: byProfile } = await supabase.from("students").select("id, department_id").eq("profile_id", user.id).maybeSingle();
  if (byProfile) return { id: byProfile.id as string, department_id: (byProfile.department_id as string | null) ?? null };
  if (user.email) {
    const { data: byEmail } = await supabase.from("students").select("id, department_id").eq("email", user.email).maybeSingle();
    if (byEmail) return { id: byEmail.id as string, department_id: (byEmail.department_id as string | null) ?? null };
  }
  return null;
}

// ── Companies ──────────────────────────────────────────────────────────────

export async function getCompanies(institutionId: string): Promise<Result<Company[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("companies").select(COMPANY_COLS).eq("institution_id", institutionId).order("name");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as Company[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function createCompany(input: {
  institutionId: string; name: string; industry?: string | null; website?: string | null;
  hrContactName?: string | null; hrContactEmail?: string | null; hrContactPhone?: string | null;
}): Promise<Result<{ id: string }>> {
  try {
    if (!input.name.trim()) return { success: false, error: "Company name is required." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("companies").insert({
      institution_id: input.institutionId,
      name: input.name.trim(),
      industry: input.industry?.trim() || null,
      website: input.website?.trim() || null,
      hr_contact_name: input.hrContactName?.trim() || null,
      hr_contact_email: input.hrContactEmail?.trim() || null,
      hr_contact_phone: input.hrContactPhone?.trim() || null,
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/placements/companies`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateCompany(input: {
  institutionId: string; id: string; name?: string; industry?: string | null; website?: string | null;
  hrContactName?: string | null; hrContactEmail?: string | null; hrContactPhone?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.industry !== undefined) patch.industry = input.industry?.trim() || null;
    if (input.website !== undefined) patch.website = input.website?.trim() || null;
    if (input.hrContactName !== undefined) patch.hr_contact_name = input.hrContactName?.trim() || null;
    if (input.hrContactEmail !== undefined) patch.hr_contact_email = input.hrContactEmail?.trim() || null;
    if (input.hrContactPhone !== undefined) patch.hr_contact_phone = input.hrContactPhone?.trim() || null;
    const { error } = await supabase.from("companies").update(patch).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/placements/companies`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteCompany(input: { institutionId: string; id: string }): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("companies").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/placements/companies`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Drives ────────────────────────────────────────────────────────────────────

export async function getDrives(institutionId: string): Promise<Result<PlacementDrive[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("placement_drives")
      .select(`${DRIVE_COLS}, placement_registrations(id)`)
      .eq("institution_id", institutionId)
      .order("drive_date", { ascending: false });
    if (error) return { success: false, error: error.message };
    const drives = (data ?? []).map((d) => ({
      ...d,
      registration_count: Array.isArray(d.placement_registrations) ? d.placement_registrations.length : 0,
      placement_registrations: undefined,
    }));
    return { success: true, data: drives as unknown as PlacementDrive[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getDrive(driveId: string): Promise<Result<PlacementDrive>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("placement_drives").select(DRIVE_COLS).eq("id", driveId).maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Drive not found." };
    return { success: true, data: data as unknown as PlacementDrive };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function createDrive(input: {
  institutionId: string; companyId: string; jobRole: string; driveDate: string;
  ctcOffered?: number | null; academicYearId?: string | null;
  eligibility?: EligibilityCriteria | null; processStages?: string[] | null; isExclusive?: boolean;
}): Promise<Result<{ id: string }>> {
  try {
    if (!input.companyId) return { success: false, error: "Select a company." };
    if (!input.jobRole.trim()) return { success: false, error: "Job role is required." };
    if (!input.driveDate) return { success: false, error: "Drive date is required." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("placement_drives").insert({
      institution_id: input.institutionId,
      company_id: input.companyId,
      job_role: input.jobRole.trim(),
      drive_date: input.driveDate,
      ctc_offered: input.ctcOffered ?? null,
      academic_year_id: input.academicYearId || null,
      eligibility_criteria: input.eligibility ?? null,
      process_stages: input.processStages ?? null,
      is_exclusive: input.isExclusive ?? true,
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/placements`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateDriveStatus(input: { institutionId: string; driveId: string; status: DriveStatus }): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("placement_drives").update({ status: input.status }).eq("id", input.driveId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/placements`);
    revalidatePath(`/institutions/${input.institutionId}/placements/drives/${input.driveId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Registrations (admin) ──────────────────────────────────────────────────

export async function getDriveRegistrations(driveId: string): Promise<Result<PlacementRegistration[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("placement_registrations")
      .select(REG_COLS)
      .eq("drive_id", driveId)
      .order("registered_at", { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as PlacementRegistration[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateStageStatus(input: {
  institutionId: string; driveId: string; registrationId: string;
  stageStatus: StageStatus; offerCTC?: number | null; notes?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const patch: Record<string, unknown> = { stage_status: input.stageStatus };
    if (input.offerCTC !== undefined) patch.offer_ctc = input.offerCTC;
    if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
    patch.placed_at = input.stageStatus === "placed" ? new Date().toISOString() : null;

    const { data: reg, error } = await supabase
      .from("placement_registrations")
      .update(patch)
      .eq("id", input.registrationId)
      .select("student_id, drive_id")
      .single();
    if (error) return { success: false, error: error.message };

    // Notify the student of their stage change (fire-and-forget).
    try {
      const { data: student } = await supabase.from("students").select("profile_id").eq("id", reg.student_id).maybeSingle();
      const { data: drive } = await supabase.from("placement_drives").select("job_role, companies(name)").eq("id", reg.drive_id).maybeSingle();
      const profileId = student?.profile_id as string | null;
      if (profileId) {
        const company = (drive?.companies as unknown as { name: string } | null)?.name ?? "the company";
        await createNotification({
          institutionId: input.institutionId,
          recipientId: profileId,
          type: "placement",
          title: `Placement update: ${STAGE_LABELS[input.stageStatus]}`,
          body: `Your application to ${company} (${drive?.job_role ?? "role"}) is now "${STAGE_LABELS[input.stageStatus]}".`,
          data: { href: "/student-portal/placements" },
        });
      }
    } catch { /* notification failure must not break the update */ }

    revalidatePath(`/institutions/${input.institutionId}/placements/drives/${input.driveId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Statistics ───────────────────────────────────────────────────────────────

export async function getPlacementStats(institutionId: string): Promise<Result<{ stats: PlacementStats; deptwise: DeptPlacement[] }>> {
  try {
    const supabase = createClient(await cookies());
    // Registrations for drives in this institution.
    const { data: drives } = await supabase.from("placement_drives").select("id").eq("institution_id", institutionId);
    const driveIds = (drives ?? []).map((d) => d.id as string);
    if (driveIds.length === 0) {
      return { success: true, data: { stats: placementStats([]), deptwise: [] } };
    }
    const { data: regs, error } = await supabase
      .from("placement_registrations")
      .select("student_id, stage_status, offer_ctc, students(department_id)")
      .in("drive_id", driveIds);
    if (error) return { success: false, error: error.message };

    const { data: depts } = await supabase.from("departments").select("id, name").eq("institution_id", institutionId);
    const deptMap = new Map((depts ?? []).map((d) => [d.id as string, d.name as string]));

    const rows: PlacementStatRow[] = (regs ?? []).map((r) => {
      const deptId = (r.students as unknown as { department_id: string | null } | null)?.department_id ?? null;
      return {
        studentId: r.student_id as string,
        stageStatus: r.stage_status as StageStatus,
        offerCTC: (r.offer_ctc as number | null) ?? null,
        department: deptId ? (deptMap.get(deptId) ?? null) : null,
      };
    });

    return { success: true, data: { stats: placementStats(rows), deptwise: deptWiseBreakdown(rows) } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Student-facing ─────────────────────────────────────────────────────────

export type StudentDriveView = PlacementDrive & {
  myStage: StageStatus | null;
  eligible: boolean;
  reasons: string[];
};

export async function getDrivesForStudent(institutionId: string): Promise<Result<StudentDriveView[]>> {
  try {
    const supabase = createClient(await cookies());
    const student = await currentStudent(supabase);

    const { data, error } = await supabase
      .from("placement_drives")
      .select(DRIVE_COLS)
      .eq("institution_id", institutionId)
      .in("status", ["scheduled", "ongoing", "completed"])
      .order("drive_date", { ascending: false });
    if (error) return { success: false, error: error.message };

    let myRegs: { drive_id: string; stage_status: StageStatus }[] = [];
    if (student) {
      const { data: regs } = await supabase
        .from("placement_registrations")
        .select("drive_id, stage_status")
        .eq("student_id", student.id);
      myRegs = (regs ?? []) as { drive_id: string; stage_status: StageStatus }[];
    }
    const regMap = new Map(myRegs.map((r) => [r.drive_id, r.stage_status]));

    const views: StudentDriveView[] = (data ?? []).map((d) => {
      const drive = d as unknown as PlacementDrive;
      const elig = checkEligibility(drive.eligibility_criteria, { departmentId: student?.department_id ?? null });
      return { ...drive, myStage: regMap.get(drive.id) ?? null, eligible: elig.eligible, reasons: elig.reasons };
    });
    return { success: true, data: views };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function registerForDrive(input: { driveId: string }): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const student = await currentStudent(supabase);
    if (!student) return { success: false, error: "Only students can register for drives." };

    const { data: drive } = await supabase
      .from("placement_drives")
      .select("id, institution_id, is_exclusive, eligibility_criteria, status")
      .eq("id", input.driveId)
      .maybeSingle();
    if (!drive) return { success: false, error: "Drive not found." };
    if (drive.status === "cancelled" || drive.status === "completed") {
      return { success: false, error: "Registration for this drive is closed." };
    }

    // Eligibility (department enforced; CGPA/backlogs advisory).
    const elig = checkEligibility(drive.eligibility_criteria as EligibilityCriteria | null, { departmentId: student.department_id });
    if (!elig.eligible) return { success: false, error: elig.reasons.join("; ") };

    // Exclusivity: a student already placed cannot register for an exclusive drive.
    if (drive.is_exclusive) {
      const { data: placedRows } = await supabase
        .from("placement_registrations")
        .select("id")
        .eq("student_id", student.id)
        .eq("stage_status", "placed")
        .limit(1);
      if (placedRows && placedRows.length > 0) {
        return { success: false, error: "You are already placed and cannot register for an exclusive drive." };
      }
    }

    const { error } = await supabase.from("placement_registrations").insert({
      drive_id: input.driveId,
      student_id: student.id,
      stage_status: "registered",
    });
    if (error) {
      if (error.code === "23505") return { success: false, error: "You have already registered for this drive." };
      return { success: false, error: error.message };
    }
    revalidatePath("/student-portal/placements");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
