"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
// Dev Rule 16: the exam-player flow must never expose answer keys
// (online_exam_questions.correct_keys) to the student client, and grading must
// be tamper-proof. Students therefore have no RLS read on questions/answers;
// every student-side read/write below is gated by a verified session-ownership
// check and then performed with the service-role client server-side.
import { createAdminClient } from "@/utils/supabase/admin";
import {
  gradeSubmission, totalMarksOf, examWindowState, remainingSeconds, VIOLATION_LIMIT,
  type QuestionType, type ExamStatus, type GradableQuestion,
} from "@/lib/onlineExams";

type Result<T> = { success: true; data: T } | { success: false; error: string };

async function authed() {
  return createClient(await cookies());
}

async function currentStudent(): Promise<{ id: string; institution_id: string; department_id: string | null } | null> {
  const supabase = await authed();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const { data } = await supabase.from("students").select("id, institution_id, department_id").eq("email", user.email).maybeSingle();
  return data ? { id: data.id as string, institution_id: data.institution_id as string, department_id: (data.department_id as string | null) ?? null } : null;
}

// ── Admin: exams ──────────────────────────────────────────────────────────────

export type ExamRow = {
  id: string; title: string; subjectName: string | null; status: ExamStatus;
  durationMinutes: number; totalMarks: number; passMarks: number;
  scheduledStart: string | null; scheduledEnd: string | null;
  departmentId: string | null; departmentName: string | null;
  questionCount: number; submissionCount: number;
};

export async function getOnlineExams(institutionId: string): Promise<Result<ExamRow[]>> {
  try {
    const supabase = await authed();
    const { data, error } = await supabase
      .from("online_exams")
      .select("id, title, subject_name, status, duration_minutes, total_marks, pass_marks, scheduled_start, scheduled_end, department_id, departments(name), online_exam_questions(count), online_exam_sessions(count)")
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    const rows: ExamRow[] = (data ?? []).map((e) => ({
      id: e.id as string,
      title: e.title as string,
      subjectName: (e.subject_name as string | null) ?? null,
      status: e.status as ExamStatus,
      durationMinutes: e.duration_minutes as number,
      totalMarks: e.total_marks as number,
      passMarks: e.pass_marks as number,
      scheduledStart: (e.scheduled_start as string | null) ?? null,
      scheduledEnd: (e.scheduled_end as string | null) ?? null,
      departmentId: (e.department_id as string | null) ?? null,
      departmentName: (e.departments as unknown as { name: string } | null)?.name ?? null,
      questionCount: (e.online_exam_questions as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
      submissionCount: (e.online_exam_sessions as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
    }));
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function createExam(input: {
  institutionId: string; title: string; subjectName?: string | null; description?: string | null;
  departmentId?: string | null; durationMinutes: number; passMarks: number;
  scheduledStart?: string | null; scheduledEnd?: string | null; shuffleQuestions: boolean;
}): Promise<Result<{ id: string }>> {
  try {
    if (!input.title.trim()) return { success: false, error: "Exam title is required." };
    const supabase = await authed();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("online_exams").insert({
      institution_id: input.institutionId,
      title: input.title.trim(),
      subject_name: input.subjectName?.trim() || null,
      description: input.description?.trim() || null,
      department_id: input.departmentId || null,
      duration_minutes: input.durationMinutes,
      pass_marks: input.passMarks,
      scheduled_start: input.scheduledStart || null,
      scheduled_end: input.scheduledEnd || null,
      shuffle_questions: input.shuffleQuestions,
      created_by: user?.id ?? null,
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/online-exams`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateExam(input: {
  institutionId: string; id: string; title: string; subjectName?: string | null; description?: string | null;
  departmentId?: string | null; durationMinutes: number; passMarks: number;
  scheduledStart?: string | null; scheduledEnd?: string | null; shuffleQuestions: boolean;
}): Promise<Result<null>> {
  try {
    const supabase = await authed();
    const { error } = await supabase.from("online_exams").update({
      title: input.title.trim(),
      subject_name: input.subjectName?.trim() || null,
      description: input.description?.trim() || null,
      department_id: input.departmentId || null,
      duration_minutes: input.durationMinutes,
      pass_marks: input.passMarks,
      scheduled_start: input.scheduledStart || null,
      scheduled_end: input.scheduledEnd || null,
      shuffle_questions: input.shuffleQuestions,
    }).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/online-exams`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function setExamStatus(input: { institutionId: string; id: string; status: ExamStatus }): Promise<Result<null>> {
  try {
    const supabase = await authed();
    if (input.status === "published") {
      // recompute total marks from the question bank before publishing
      const { data: qs } = await supabase.from("online_exam_questions").select("marks").eq("exam_id", input.id);
      const total = totalMarksOf((qs ?? []) as { marks: number }[]);
      if (total <= 0) return { success: false, error: "Add at least one question before publishing." };
      const { error } = await supabase.from("online_exams").update({ status: "published", total_marks: total }).eq("id", input.id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from("online_exams").update({ status: input.status }).eq("id", input.id);
      if (error) return { success: false, error: error.message };
    }
    revalidatePath(`/institutions/${input.institutionId}/online-exams`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteExam(input: { institutionId: string; id: string }): Promise<Result<null>> {
  try {
    const supabase = await authed();
    const { error } = await supabase.from("online_exams").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/online-exams`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Admin: questions (full, with answer keys — admin RLS) ─────────────────────

export type QuestionOption = { key: string; text: string };
export type AdminQuestion = {
  id: string; questionText: string; questionType: QuestionType;
  options: QuestionOption[]; correctKeys: string[]; marks: number; position: number;
};

export async function getExamQuestions(examId: string): Promise<Result<AdminQuestion[]>> {
  try {
    const supabase = await authed();
    const { data, error } = await supabase
      .from("online_exam_questions")
      .select("id, question_text, question_type, options, correct_keys, marks, position")
      .eq("exam_id", examId)
      .order("position", { ascending: true });
    if (error) return { success: false, error: error.message };
    const rows: AdminQuestion[] = (data ?? []).map((q) => ({
      id: q.id as string,
      questionText: q.question_text as string,
      questionType: q.question_type as QuestionType,
      options: (q.options as QuestionOption[]) ?? [],
      correctKeys: (q.correct_keys as string[]) ?? [],
      marks: q.marks as number,
      position: q.position as number,
    }));
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function saveQuestion(input: {
  institutionId: string; examId: string; id?: string | null;
  questionText: string; questionType: QuestionType; options: QuestionOption[]; correctKeys: string[]; marks: number; position: number;
}): Promise<Result<null>> {
  try {
    if (!input.questionText.trim()) return { success: false, error: "Question text is required." };
    if (input.questionType !== "short" && input.options.length < 2) return { success: false, error: "Add at least two options." };
    if (input.correctKeys.length === 0) return { success: false, error: "Mark the correct answer." };
    const supabase = await authed();
    const payload = {
      exam_id: input.examId,
      question_text: input.questionText.trim(),
      question_type: input.questionType,
      options: input.questionType === "short" ? [] : input.options,
      correct_keys: input.correctKeys,
      marks: input.marks,
      position: input.position,
    };
    const { error } = input.id
      ? await supabase.from("online_exam_questions").update(payload).eq("id", input.id)
      : await supabase.from("online_exam_questions").insert(payload);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/online-exams/${input.examId}/questions`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteQuestion(input: { institutionId: string; examId: string; id: string }): Promise<Result<null>> {
  try {
    const supabase = await authed();
    const { error } = await supabase.from("online_exam_questions").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/online-exams/${input.examId}/questions`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Admin: results ────────────────────────────────────────────────────────────

export type ResultRow = {
  sessionId: string; studentName: string; rollNo: string | null;
  status: string; score: number | null; totalMarks: number; violationCount: number; flagged: boolean; submittedAt: string | null;
};

export async function getExamResults(examId: string): Promise<Result<ResultRow[]>> {
  try {
    const supabase = await authed();
    const { data, error } = await supabase
      .from("online_exam_sessions")
      .select("id, status, score, total_marks, violation_count, flagged, submitted_at, students(full_name, roll_no)")
      .eq("exam_id", examId)
      .order("score", { ascending: false, nullsFirst: false });
    if (error) return { success: false, error: error.message };
    const rows: ResultRow[] = (data ?? []).map((s) => {
      const stu = s.students as unknown as { full_name: string; roll_no: string | null } | null;
      return {
        sessionId: s.id as string,
        studentName: stu?.full_name ?? "—",
        rollNo: stu?.roll_no ?? null,
        status: s.status as string,
        score: (s.score as number | null) ?? null,
        totalMarks: s.total_marks as number,
        violationCount: s.violation_count as number,
        flagged: !!s.flagged,
        submittedAt: (s.submitted_at as string | null) ?? null,
      };
    });
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Student: list eligible exams + own session status ─────────────────────────

export type StudentExamRow = {
  id: string; title: string; subjectName: string | null; durationMinutes: number;
  totalMarks: number; passMarks: number; scheduledStart: string | null; scheduledEnd: string | null;
  status: ExamStatus; questionCount: number;
  sessionStatus: "none" | "in_progress" | "submitted" | "auto_submitted";
  score: number | null;
};

export async function getStudentOnlineExams(): Promise<Result<StudentExamRow[]>> {
  try {
    const student = await currentStudent();
    if (!student) return { success: false, error: "No student profile found for this account." };
    const supabase = await authed();
    const { data, error } = await supabase
      .from("online_exams")
      .select("id, title, subject_name, status, duration_minutes, total_marks, pass_marks, scheduled_start, scheduled_end, online_exam_questions(count), online_exam_sessions(status, score, student_id)")
      .order("scheduled_start", { ascending: true, nullsFirst: false });
    if (error) return { success: false, error: error.message };
    const rows: StudentExamRow[] = (data ?? []).map((e) => {
      const sessions = (e.online_exam_sessions as unknown as { status: string; score: number | null; student_id: string }[] | null) ?? [];
      const mine = sessions.find((s) => s.student_id === student.id);
      return {
        id: e.id as string,
        title: e.title as string,
        subjectName: (e.subject_name as string | null) ?? null,
        durationMinutes: e.duration_minutes as number,
        totalMarks: e.total_marks as number,
        passMarks: e.pass_marks as number,
        scheduledStart: (e.scheduled_start as string | null) ?? null,
        scheduledEnd: (e.scheduled_end as string | null) ?? null,
        status: e.status as ExamStatus,
        questionCount: (e.online_exam_questions as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
        sessionStatus: (mine?.status as StudentExamRow["sessionStatus"]) ?? "none",
        score: mine?.score ?? null,
      };
    });
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Student: take exam ────────────────────────────────────────────────────────

export type PlayerQuestion = {
  id: string; questionText: string; questionType: QuestionType; options: QuestionOption[]; marks: number;
};
export type StartExamData = {
  sessionId: string; title: string; durationMinutes: number; remainingSeconds: number; questions: PlayerQuestion[];
};

export async function startExam(examId: string): Promise<Result<StartExamData>> {
  try {
    const student = await currentStudent();
    if (!student) return { success: false, error: "No student profile found for this account." };
    const admin = createAdminClient();

    const { data: exam } = await admin
      .from("online_exams")
      .select("id, institution_id, department_id, title, status, duration_minutes, scheduled_start, scheduled_end, shuffle_questions")
      .eq("id", examId).maybeSingle();
    if (!exam) return { success: false, error: "Exam not found." };

    // eligibility
    if (exam.institution_id !== student.institution_id) return { success: false, error: "Not authorised for this exam." };
    if (exam.department_id && exam.department_id !== student.department_id) return { success: false, error: "This exam is for another department." };
    if (examWindowState(exam as never) !== "open") return { success: false, error: "This exam is not open right now." };

    // existing session?
    const { data: existing } = await admin
      .from("online_exam_sessions").select("id, status, started_at").eq("exam_id", examId).eq("student_id", student.id).maybeSingle();
    if (existing && existing.status !== "in_progress") return { success: false, error: "You have already attempted this exam." };

    let sessionId = existing?.id as string | undefined;
    let startedAt = existing?.started_at as string | undefined;
    if (!sessionId) {
      const { data: qsForTotal } = await admin.from("online_exam_questions").select("marks").eq("exam_id", examId);
      const total = totalMarksOf((qsForTotal ?? []) as { marks: number }[]);
      const { data: created, error: cErr } = await admin
        .from("online_exam_sessions").insert({ exam_id: examId, student_id: student.id, total_marks: total }).select("id, started_at").single();
      if (cErr || !created) return { success: false, error: cErr?.message ?? "Could not start the exam." };
      sessionId = created.id as string;
      startedAt = created.started_at as string;
    }

    // questions WITHOUT answer keys
    const { data: qs } = await admin
      .from("online_exam_questions").select("id, question_text, question_type, options, marks, position").eq("exam_id", examId).order("position");
    let questions: PlayerQuestion[] = (qs ?? []).map((q) => ({
      id: q.id as string,
      questionText: q.question_text as string,
      questionType: q.question_type as QuestionType,
      options: (q.options as QuestionOption[]) ?? [],
      marks: q.marks as number,
    }));
    if (exam.shuffle_questions) questions = [...questions].sort(() => Math.random() - 0.5);

    return {
      success: true,
      data: {
        sessionId: sessionId!,
        title: exam.title as string,
        durationMinutes: exam.duration_minutes as number,
        remainingSeconds: remainingSeconds(startedAt!, exam.duration_minutes as number, (exam.scheduled_end as string | null) ?? null),
        questions,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function submitExam(input: {
  sessionId: string; responses: Record<string, string[]>; autoSubmitted?: boolean;
}): Promise<Result<{ score: number; totalMarks: number }>> {
  try {
    const student = await currentStudent();
    if (!student) return { success: false, error: "Unauthorized." };
    const admin = createAdminClient();

    const { data: session } = await admin
      .from("online_exam_sessions").select("id, exam_id, student_id, status, score, total_marks, violation_count").eq("id", input.sessionId).maybeSingle();
    if (!session) return { success: false, error: "Session not found." };
    if (session.student_id !== student.id) return { success: false, error: "Not your session." };
    if (session.status !== "in_progress") {
      return { success: true, data: { score: (session.score as number) ?? 0, totalMarks: session.total_marks as number } };
    }

    const { data: qs } = await admin
      .from("online_exam_questions").select("id, question_type, correct_keys, marks").eq("exam_id", session.exam_id as string);
    const questions: GradableQuestion[] = (qs ?? []).map((q) => ({
      id: q.id as string,
      question_type: q.question_type as QuestionType,
      correct_keys: (q.correct_keys as string[]) ?? [],
      marks: q.marks as number,
    }));

    const grade = gradeSubmission(questions, input.responses);

    // persist answers (replace any existing)
    await admin.from("online_exam_answers").delete().eq("session_id", input.sessionId);
    if (grade.perQuestion.length > 0) {
      await admin.from("online_exam_answers").insert(grade.perQuestion.map((p) => ({
        session_id: input.sessionId,
        question_id: p.questionId,
        response: input.responses[p.questionId] ?? [],
        is_correct: p.isCorrect,
        awarded_marks: p.awarded,
      })));
    }

    const flagged = !!input.autoSubmitted || (session.violation_count as number) >= VIOLATION_LIMIT;
    const { error } = await admin.from("online_exam_sessions").update({
      status: input.autoSubmitted ? "auto_submitted" : "submitted",
      score: grade.score,
      total_marks: grade.totalMarks,
      submitted_at: new Date().toISOString(),
      flagged,
    }).eq("id", input.sessionId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/student-portal/exams/online");
    return { success: true, data: { score: grade.score, totalMarks: grade.totalMarks } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function logViolation(input: {
  sessionId: string; type: "tab_switch" | "fullscreen_exit" | "copy_paste";
}): Promise<Result<{ count: number; limitReached: boolean }>> {
  try {
    const student = await currentStudent();
    if (!student) return { success: false, error: "Unauthorized." };
    const admin = createAdminClient();

    const { data: session } = await admin
      .from("online_exam_sessions").select("id, exam_id, student_id, status, violation_count").eq("id", input.sessionId).maybeSingle();
    if (!session || session.student_id !== student.id) return { success: false, error: "Not your session." };
    if (session.status !== "in_progress") return { success: true, data: { count: session?.violation_count as number ?? 0, limitReached: false } };

    await admin.from("online_exam_violations").insert({
      session_id: input.sessionId, exam_id: session.exam_id, student_id: student.id, type: input.type,
    });
    const count = (session.violation_count as number) + 1;
    const limitReached = count >= VIOLATION_LIMIT;
    await admin.from("online_exam_sessions").update({ violation_count: count, flagged: limitReached || undefined }).eq("id", input.sessionId);
    return { success: true, data: { count, limitReached } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Student: review a submitted attempt ───────────────────────────────────────

export type ReviewQuestion = {
  questionText: string; questionType: QuestionType; options: QuestionOption[];
  response: string[]; correctKeys: string[]; isCorrect: boolean; awarded: number; marks: number;
};
export type ExamReview = {
  title: string; score: number; totalMarks: number; passMarks: number; passed: boolean;
  status: string; flagged: boolean; questions: ReviewQuestion[];
};

export async function getStudentExamReview(examId: string): Promise<Result<ExamReview | null>> {
  try {
    const student = await currentStudent();
    if (!student) return { success: false, error: "Unauthorized." };
    const admin = createAdminClient();

    const { data: session } = await admin
      .from("online_exam_sessions").select("id, status, score, total_marks, flagged").eq("exam_id", examId).eq("student_id", student.id).maybeSingle();
    if (!session || session.status === "in_progress") return { success: true, data: null };

    const { data: exam } = await admin.from("online_exams").select("title, pass_marks").eq("id", examId).maybeSingle();
    const { data: qs } = await admin
      .from("online_exam_questions").select("id, question_text, question_type, options, correct_keys, marks, position").eq("exam_id", examId).order("position");
    const { data: ans } = await admin
      .from("online_exam_answers").select("question_id, response, is_correct, awarded_marks").eq("session_id", session.id as string);
    const ansByQ = new Map((ans ?? []).map((a) => [a.question_id as string, a]));

    const questions: ReviewQuestion[] = (qs ?? []).map((q) => {
      const a = ansByQ.get(q.id as string);
      return {
        questionText: q.question_text as string,
        questionType: q.question_type as QuestionType,
        options: (q.options as QuestionOption[]) ?? [],
        response: (a?.response as string[]) ?? [],
        correctKeys: (q.correct_keys as string[]) ?? [],
        isCorrect: !!a?.is_correct,
        awarded: (a?.awarded_marks as number) ?? 0,
        marks: q.marks as number,
      };
    });

    const score = (session.score as number) ?? 0;
    const passMarks = (exam?.pass_marks as number) ?? 0;
    return {
      success: true,
      data: {
        title: (exam?.title as string) ?? "Exam",
        score,
        totalMarks: session.total_marks as number,
        passMarks,
        passed: score >= passMarks,
        status: session.status as string,
        flagged: !!session.flagged,
        questions,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
