"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { logAudit } from "@/lib/auditLog";
import { employeeIdFromSeq, type ApplicationStatus, type EmploymentType, type JobStatus, type JobPosting, type JobApplication } from "@/lib/recruitment";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const POSTING_COLS =
  "id, institution_id, title, department_id, employment_type, experience_years, qualifications, description, deadline, vacancies, status, created_by, created_at, updated_at, departments!department_id(name)";

const APP_COLS =
  "id, institution_id, job_posting_id, applicant_name, applicant_email, applicant_phone, current_employer, experience_years, qualifications, cv_url, status, interview_date, interview_notes, offer_date, offer_details, admin_notes, converted_staff_id, applied_at, updated_at";

// ── Job Postings ──────────────────────────────────────────────────────────────

export async function getJobPostings(institutionId: string): Promise<Result<JobPosting[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("job_postings")
      .select(`${POSTING_COLS}, job_applications(id)`)
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    const postings = (data ?? []).map((p) => ({
      ...p,
      application_count: Array.isArray(p.job_applications) ? p.job_applications.length : 0,
      job_applications: undefined,
      departments: p.departments ?? null,
    }));
    return { success: true, data: postings as unknown as JobPosting[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getJobPosting(jobId: string): Promise<Result<JobPosting>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("job_postings")
      .select(`${POSTING_COLS}, job_applications(id)`)
      .eq("id", jobId)
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Job posting not found." };
    const posting = {
      ...data,
      application_count: Array.isArray(data.job_applications) ? data.job_applications.length : 0,
      job_applications: undefined,
      departments: data.departments ?? null,
    };
    return { success: true, data: posting as unknown as JobPosting };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function createJobPosting(input: {
  institutionId: string;
  title: string;
  departmentId?: string | null;
  employmentType: EmploymentType;
  experienceYears?: number | null;
  qualifications?: string | null;
  description?: string | null;
  deadline?: string | null;
  vacancies: number;
}): Promise<Result<{ id: string }>> {
  try {
    if (!input.title.trim()) return { success: false, error: "Job title is required." };
    if (input.vacancies < 1) return { success: false, error: "At least one vacancy is required." };
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };
    const { data, error } = await supabase
      .from("job_postings")
      .insert({
        institution_id: input.institutionId,
        title: input.title.trim(),
        department_id: input.departmentId || null,
        employment_type: input.employmentType,
        experience_years: input.experienceYears ?? null,
        qualifications: input.qualifications?.trim() || null,
        description: input.description?.trim() || null,
        deadline: input.deadline || null,
        vacancies: input.vacancies,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/recruitment`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateJobPosting(input: {
  institutionId: string;
  jobId: string;
  title?: string;
  departmentId?: string | null;
  employmentType?: EmploymentType;
  experienceYears?: number | null;
  qualifications?: string | null;
  description?: string | null;
  deadline?: string | null;
  vacancies?: number;
  status?: JobStatus;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.departmentId !== undefined) patch.department_id = input.departmentId || null;
    if (input.employmentType !== undefined) patch.employment_type = input.employmentType;
    if (input.experienceYears !== undefined) patch.experience_years = input.experienceYears;
    if (input.qualifications !== undefined) patch.qualifications = input.qualifications?.trim() || null;
    if (input.description !== undefined) patch.description = input.description?.trim() || null;
    if (input.deadline !== undefined) patch.deadline = input.deadline || null;
    if (input.vacancies !== undefined) patch.vacancies = input.vacancies;
    if (input.status !== undefined) patch.status = input.status;
    const { error } = await supabase.from("job_postings").update(patch).eq("id", input.jobId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/recruitment`);
    revalidatePath(`/institutions/${input.institutionId}/recruitment/${input.jobId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Job Applications ──────────────────────────────────────────────────────────

export async function getJobApplications(jobId: string): Promise<Result<JobApplication[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("job_applications")
      .select(APP_COLS)
      .eq("job_posting_id", jobId)
      .order("applied_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as JobApplication[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getJobApplication(applicationId: string): Promise<Result<JobApplication>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("job_applications")
      .select(`${APP_COLS}, job_postings!job_posting_id(title, employment_type, department_id, departments!department_id(name))`)
      .eq("id", applicationId)
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Application not found." };
    return { success: true, data: data as unknown as JobApplication };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function createJobApplication(input: {
  institutionId: string;
  jobPostingId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string | null;
  currentEmployer?: string | null;
  experienceYears?: number | null;
  qualifications?: string | null;
  cvUrl?: string | null;
  adminNotes?: string | null;
}): Promise<Result<{ id: string }>> {
  try {
    if (!input.applicantName.trim()) return { success: false, error: "Applicant name is required." };
    if (!input.applicantEmail.trim()) return { success: false, error: "Applicant email is required." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("job_applications")
      .insert({
        institution_id: input.institutionId,
        job_posting_id: input.jobPostingId,
        applicant_name: input.applicantName.trim(),
        applicant_email: input.applicantEmail.trim().toLowerCase(),
        applicant_phone: input.applicantPhone?.trim() || null,
        current_employer: input.currentEmployer?.trim() || null,
        experience_years: input.experienceYears ?? null,
        qualifications: input.qualifications?.trim() || null,
        cv_url: input.cvUrl?.trim() || null,
        admin_notes: input.adminNotes?.trim() || null,
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/recruitment/${input.jobPostingId}`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateApplicationStatus(input: {
  institutionId: string;
  jobId: string;
  applicationId: string;
  status: ApplicationStatus;
  notes?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const patch: Record<string, unknown> = { status: input.status, updated_at: new Date().toISOString() };
    if (input.notes !== undefined) patch.admin_notes = input.notes?.trim() || null;
    const { error } = await supabase.from("job_applications").update(patch).eq("id", input.applicationId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/recruitment/${input.jobId}`);
    revalidatePath(`/institutions/${input.institutionId}/recruitment/${input.jobId}/${input.applicationId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function scheduleInterview(input: {
  institutionId: string;
  jobId: string;
  applicationId: string;
  interviewDate: string;
  interviewNotes?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase
      .from("job_applications")
      .update({
        status: "interview",
        interview_date: input.interviewDate,
        interview_notes: input.interviewNotes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.applicationId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/recruitment/${input.jobId}`);
    revalidatePath(`/institutions/${input.institutionId}/recruitment/${input.jobId}/${input.applicationId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function makeOffer(input: {
  institutionId: string;
  jobId: string;
  applicationId: string;
  offerDate: string;
  offerDetails?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase
      .from("job_applications")
      .update({
        status: "offer",
        offer_date: input.offerDate,
        offer_details: input.offerDetails?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.applicationId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/recruitment/${input.jobId}`);
    revalidatePath(`/institutions/${input.institutionId}/recruitment/${input.jobId}/${input.applicationId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/**
 * Hire an applicant: creates an auth account + profile + staff record,
 * marks the application `joined`, and links the new staff id.
 * Mirrors the admissions enrollStudent flow.
 */
export async function hireApplicant(input: {
  institutionId: string;
  jobId: string;
  applicationId: string;
  designation: string;
  joiningDate: string;
  employeeId?: string | null;
  departmentId?: string | null;
}): Promise<Result<{ email: string; password: string; staffId: string }>> {
  try {
    if (!input.designation.trim()) return { success: false, error: "Designation is required." };
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const { data: app, error: appErr } = await supabase
      .from("job_applications")
      .select("*")
      .eq("id", input.applicationId)
      .maybeSingle();
    if (appErr) return { success: false, error: appErr.message };
    if (!app) return { success: false, error: "Application not found." };
    if (app.status === "joined") return { success: false, error: "This applicant has already been hired." };
    if (app.status !== "offer") return { success: false, error: "Only applicants with an offer can be hired." };

    const admin = createAdminClient();
    const email = (app.applicant_email as string).trim().toLowerCase();

    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (list?.users?.some((u) => u.email === email)) {
      return { success: false, error: `An account already exists for ${email}.` };
    }

    const password = `Aura@${Math.floor(1000 + Math.random() * 9000)}`;
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: app.applicant_name },
    });
    if (cErr || !created?.user) return { success: false, error: cErr?.message ?? "Could not create the login." };
    const uid = created.user.id;

    // Derive employee_id: seq from existing staff count
    const { count: staffCount } = await admin
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("institution_id", input.institutionId);
    const empId = input.employeeId?.trim() || employeeIdFromSeq((staffCount ?? 0) + 1);

    // profile (STAFF role)
    const { error: pErr } = await admin.from("profiles").insert({
      id: uid,
      full_name: app.applicant_name,
      email,
      role: "STAFF",
      tenant_id: input.institutionId,
      department_id: input.departmentId ?? null,
    });
    if (pErr) {
      await admin.auth.admin.deleteUser(uid);
      return { success: false, error: `Profile creation failed: ${pErr.message}` };
    }

    // staff record
    const { data: staffRow, error: sErr } = await admin
      .from("staff")
      .insert({
        institution_id: input.institutionId,
        full_name: app.applicant_name,
        email,
        phone: app.applicant_phone ?? null,
        employee_id: empId,
        designation: input.designation.trim(),
        employment_type: (app.employment_type as string | null) ?? "full_time",
        qualification: app.qualifications ?? null,
        joining_date: input.joiningDate,
        department_id: input.departmentId ?? null,
        profile_id: uid,
      })
      .select("id")
      .single();
    if (sErr) {
      await admin.auth.admin.deleteUser(uid);
      return { success: false, error: `Staff record failed: ${sErr.message}` };
    }

    const staffId = staffRow.id as string;

    // mark application joined + link staff id
    await supabase
      .from("job_applications")
      .update({ status: "joined", converted_staff_id: staffId, updated_at: new Date().toISOString() })
      .eq("id", input.applicationId);

    await logAudit({
      institutionId: input.institutionId,
      performedBy: user.id,
      tableName: "staff",
      recordId: staffId,
      action: "INSERT",
      afterData: { from_application: input.applicationId, employee_id: empId, email },
      notes: "Staff hired from recruitment pipeline",
    });

    revalidatePath(`/institutions/${input.institutionId}/recruitment`);
    revalidatePath(`/institutions/${input.institutionId}/recruitment/${input.jobId}`);
    return { success: true, data: { email, password, staffId } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
