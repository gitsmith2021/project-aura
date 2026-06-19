"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
// Dev Rule 16: the eligible-student COUNT used for the response-rate metric is a
// non-identifying aggregate. Faculty viewing their own report have no RLS path
// to the students table, so the count (head-only, no rows) is taken with the
// service-role client. No student data is ever returned.
import { createAdminClient } from "@/utils/supabase/admin";
import {
  overallRatingOf, aggregateResponses, responseRate, wordFrequencies,
  type FeedbackQuestion, type AnswerMap, type FeedbackAggregate,
} from "@/lib/feedback";

type Result<T> = { success: true; data: T } | { success: false; error: string };

async function db() {
  return createClient(await cookies());
}

// ── Admin: forms ──────────────────────────────────────────────────────────────

export type AdminFormRow = {
  id: string; title: string; subjectName: string | null; staffName: string | null;
  departmentName: string | null; isActive: boolean; questionCount: number; responseCount: number;
  opensAt: string | null; closesAt: string | null;
};

export async function getFeedbackForms(institutionId: string): Promise<Result<AdminFormRow[]>> {
  try {
    const supabase = await db();
    const { data, error } = await supabase
      .from("feedback_forms")
      .select("id, title, subject_name, is_active, questions, opens_at, closes_at, staff(full_name), departments(name), feedback_responses(count)")
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    const rows: AdminFormRow[] = (data ?? []).map((f) => ({
      id: f.id as string,
      title: f.title as string,
      subjectName: (f.subject_name as string | null) ?? null,
      staffName: (f.staff as unknown as { full_name: string } | null)?.full_name ?? null,
      departmentName: (f.departments as unknown as { name: string } | null)?.name ?? null,
      isActive: !!f.is_active,
      questionCount: Array.isArray(f.questions) ? f.questions.length : 0,
      responseCount: (f.feedback_responses as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
      opensAt: (f.opens_at as string | null) ?? null,
      closesAt: (f.closes_at as string | null) ?? null,
    }));
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function saveFeedbackForm(input: {
  institutionId: string; id?: string | null; title: string; description?: string | null;
  departmentId?: string | null; staffId?: string | null; subjectName?: string | null;
  // Only required on create; omit on a details-only edit to leave questions untouched.
  questions?: FeedbackQuestion[]; opensAt?: string | null; closesAt?: string | null;
}): Promise<Result<{ id: string }>> {
  try {
    if (!input.title.trim()) return { success: false, error: "Form title is required." };
    const supabase = await db();
    const { data: { user } } = await supabase.auth.getUser();
    const base = {
      institution_id: input.institutionId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      department_id: input.departmentId || null,
      staff_id: input.staffId || null,
      subject_name: input.subjectName?.trim() || null,
      opens_at: input.opensAt || null,
      closes_at: input.closesAt || null,
    };
    if (input.id) {
      // Details-only edit: never overwrite the question set unless explicitly provided.
      const payload = input.questions && input.questions.length > 0 ? { ...base, questions: input.questions } : base;
      const { error } = await supabase.from("feedback_forms").update(payload).eq("id", input.id);
      if (error) return { success: false, error: error.message };
      revalidatePath(`/institutions/${input.institutionId}/feedback`);
      return { success: true, data: { id: input.id } };
    }
    if (!input.questions || input.questions.length === 0) return { success: false, error: "Add at least one question." };
    const { data, error } = await supabase.from("feedback_forms").insert({ ...base, questions: input.questions, created_by: user?.id ?? null }).select("id").single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/feedback`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function setFormActive(input: { institutionId: string; id: string; isActive: boolean }): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("feedback_forms").update({ is_active: input.isActive }).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/feedback`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteFeedbackForm(input: { institutionId: string; id: string }): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("feedback_forms").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/feedback`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Report (admin or the rated staff) ─────────────────────────────────────────

export type FeedbackReport = {
  title: string; subjectName: string | null; staffName: string | null;
  aggregate: FeedbackAggregate; responseRate: number; eligibleCount: number;
  wordCloud: { word: string; count: number }[];
};

export async function getFeedbackReport(formId: string): Promise<Result<FeedbackReport>> {
  try {
    const supabase = await db();
    const { data: form, error: fErr } = await supabase
      .from("feedback_forms")
      .select("title, subject_name, questions, institution_id, department_id, staff(full_name)")
      .eq("id", formId).maybeSingle();
    if (fErr) return { success: false, error: fErr.message };
    if (!form) return { success: false, error: "Form not found or not accessible." };

    const { data: resp, error: rErr } = await supabase
      .from("feedback_responses").select("answers").eq("form_id", formId);
    if (rErr) return { success: false, error: rErr.message };

    const questions = (form.questions as FeedbackQuestion[]) ?? [];
    const responses = (resp ?? []).map((r) => (r.answers as AnswerMap) ?? {});
    const aggregate = aggregateResponses(questions, responses);
    const allText = aggregate.comments.flatMap((c) => c.answers);

    // eligible student count (service-role; head-only count, no rows) → see Dev Rule 16 note above
    const admin = createAdminClient();
    let q = admin.from("students").select("id", { count: "exact", head: true })
      .eq("institution_id", form.institution_id as string).eq("is_active", true);
    if (form.department_id) q = q.eq("department_id", form.department_id as string);
    const { count: eligibleCount } = await q;

    return {
      success: true,
      data: {
        title: form.title as string,
        subjectName: (form.subject_name as string | null) ?? null,
        staffName: (form.staff as unknown as { full_name: string } | null)?.full_name ?? null,
        aggregate,
        eligibleCount: eligibleCount ?? 0,
        responseRate: responseRate(aggregate.responseCount, eligibleCount ?? 0),
        wordCloud: wordFrequencies(allText, 30),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Student ───────────────────────────────────────────────────────────────────

export type StudentFormRow = {
  id: string; title: string; description: string | null; subjectName: string | null;
  staffName: string | null; questionCount: number; submitted: boolean;
};

export async function getStudentFeedbackForms(): Promise<Result<StudentFormRow[]>> {
  try {
    const supabase = await db();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { success: false, error: "Unauthorized." };

    const [{ data: forms, error }, { data: subs }] = await Promise.all([
      supabase.from("feedback_forms").select("id, title, description, subject_name, questions, staff(full_name)").eq("is_active", true),
      supabase.from("feedback_submissions").select("form_id"),
    ]);
    if (error) return { success: false, error: error.message };
    const submittedSet = new Set((subs ?? []).map((s) => s.form_id as string));
    const rows: StudentFormRow[] = (forms ?? []).map((f) => ({
      id: f.id as string,
      title: f.title as string,
      description: (f.description as string | null) ?? null,
      subjectName: (f.subject_name as string | null) ?? null,
      staffName: (f.staff as unknown as { full_name: string } | null)?.full_name ?? null,
      questionCount: Array.isArray(f.questions) ? f.questions.length : 0,
      submitted: submittedSet.has(f.id as string),
    }));
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export type StudentFormDetail = { id: string; title: string; description: string | null; subjectName: string | null; staffName: string | null; questions: FeedbackQuestion[]; submitted: boolean };

export async function getStudentFeedbackForm(formId: string): Promise<Result<StudentFormDetail>> {
  try {
    const supabase = await db();
    const { data: form, error } = await supabase
      .from("feedback_forms").select("id, title, description, subject_name, questions, staff(full_name)").eq("id", formId).eq("is_active", true).maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!form) return { success: false, error: "Form not found or no longer active." };
    const { data: sub } = await supabase.from("feedback_submissions").select("id").eq("form_id", formId).maybeSingle();
    return {
      success: true,
      data: {
        id: form.id as string,
        title: form.title as string,
        description: (form.description as string | null) ?? null,
        subjectName: (form.subject_name as string | null) ?? null,
        staffName: (form.staff as unknown as { full_name: string } | null)?.full_name ?? null,
        questions: (form.questions as FeedbackQuestion[]) ?? [],
        submitted: !!sub,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function submitFeedback(input: { formId: string; answers: AnswerMap }): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { success: false, error: "Unauthorized." };
    const { data: student } = await supabase.from("students").select("id, institution_id").eq("email", user.email).maybeSingle();
    if (!student) return { success: false, error: "No student profile found for this account." };

    const { data: form } = await supabase
      .from("feedback_forms").select("id, institution_id, questions, is_active").eq("id", input.formId).maybeSingle();
    if (!form || !form.is_active) return { success: false, error: "This feedback form is not open." };

    // Participation ledger first — its unique(form_id, student_id) prevents a second submission.
    const { error: subErr } = await supabase.from("feedback_submissions").insert({ form_id: input.formId, student_id: student.id });
    if (subErr) {
      if (subErr.code === "23505") return { success: false, error: "You have already submitted this feedback." };
      return { success: false, error: subErr.message };
    }

    const questions = (form.questions as FeedbackQuestion[]) ?? [];
    const overall = overallRatingOf(questions, input.answers);
    const { error: respErr } = await supabase.from("feedback_responses").insert({
      form_id: input.formId, institution_id: form.institution_id as string, answers: input.answers, overall_rating: overall,
    });
    if (respErr) return { success: false, error: respErr.message };

    revalidatePath("/student-portal/feedback");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Staff: own aggregated ratings ─────────────────────────────────────────────

export type StaffFeedbackRow = { id: string; title: string; subjectName: string | null; responseCount: number; overallAverage: number | null };

export async function getStaffFeedbackOverview(): Promise<Result<StaffFeedbackRow[]>> {
  try {
    const supabase = await db();
    const { data: forms, error } = await supabase
      .from("feedback_forms").select("id, title, subject_name, questions").order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    const formList = forms ?? [];
    if (formList.length === 0) return { success: true, data: [] };

    const { data: resp } = await supabase
      .from("feedback_responses").select("form_id, answers").in("form_id", formList.map((f) => f.id as string));
    const byForm = new Map<string, AnswerMap[]>();
    for (const r of resp ?? []) {
      const fid = r.form_id as string;
      if (!byForm.has(fid)) byForm.set(fid, []);
      byForm.get(fid)!.push((r.answers as AnswerMap) ?? {});
    }

    const rows: StaffFeedbackRow[] = formList.map((f) => {
      const agg = aggregateResponses((f.questions as FeedbackQuestion[]) ?? [], byForm.get(f.id as string) ?? []);
      return {
        id: f.id as string,
        title: f.title as string,
        subjectName: (f.subject_name as string | null) ?? null,
        responseCount: agg.responseCount,
        overallAverage: agg.overallAverage,
      };
    });
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
