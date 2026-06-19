"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { buildGradebook, isLate, type Gradebook, type GbStudent, type GbAssignment, type GbSubmission } from "@/lib/lms";

type Result<T> = { success: true; data: T } | { success: false; error: string };

async function db() {
  return createClient(await cookies());
}

async function currentStaffId(): Promise<string | null> {
  const supabase = await db();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const { data } = await supabase.from("staff").select("id").eq("email", user.email).maybeSingle();
  return (data?.id as string) ?? null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type AssignmentRow = {
  id: string; subjectId: string; subjectName: string | null; title: string; description: string | null;
  dueDate: string; maxMarks: number; allowLate: boolean; submissionCount: number; gradedCount: number; createdAt: string;
};

export type GradeRow = {
  studentId: string; studentName: string; rollNo: string | null;
  submissionId: string | null; fileUrl: string | null; notes: string | null;
  submittedAt: string | null; isLate: boolean; marksAwarded: number | null; feedback: string | null;
};

export type StudentAssignmentRow = {
  id: string; subjectName: string | null; title: string; description: string | null;
  dueDate: string; maxMarks: number; allowLate: boolean;
  submission: { state: "submitted" | "graded"; fileUrl: string | null; notes: string | null; submittedAt: string; isLate: boolean; marksAwarded: number | null; feedback: string | null } | null;
};

// ── Admin / staff: assignments ────────────────────────────────────────────────

export async function getAssignments(institutionId: string): Promise<Result<AssignmentRow[]>> {
  try {
    const supabase = await db();
    const { data, error } = await supabase
      .from("lms_assignments")
      .select("id, subject_id, title, description, due_date, max_marks, allow_late, created_at, subjects(name), lms_submissions(marks_awarded)")
      .eq("institution_id", institutionId)
      .order("due_date", { ascending: false });
    if (error) return { success: false, error: error.message };
    const rows: AssignmentRow[] = (data ?? []).map((a) => {
      const subs = (a.lms_submissions as unknown as { marks_awarded: number | null }[] | null) ?? [];
      return {
        id: a.id as string,
        subjectId: a.subject_id as string,
        subjectName: (a.subjects as unknown as { name: string } | null)?.name ?? null,
        title: a.title as string,
        description: (a.description as string | null) ?? null,
        dueDate: a.due_date as string,
        maxMarks: a.max_marks as number,
        allowLate: !!a.allow_late,
        submissionCount: subs.length,
        gradedCount: subs.filter((s) => s.marks_awarded !== null).length,
        createdAt: a.created_at as string,
      };
    });
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function createAssignment(input: {
  institutionId: string; subjectId: string; academicYearId?: string | null; title: string;
  description?: string | null; dueDate: string; maxMarks: number; allowLate: boolean;
}): Promise<Result<{ id: string }>> {
  try {
    if (!input.title.trim()) return { success: false, error: "Title is required." };
    if (!input.subjectId) return { success: false, error: "Select a subject." };
    if (!input.dueDate) return { success: false, error: "Set a due date." };
    const supabase = await db();
    const staffId = await currentStaffId();
    const { data, error } = await supabase.from("lms_assignments").insert({
      institution_id: input.institutionId,
      subject_id: input.subjectId,
      academic_year_id: input.academicYearId || null,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      due_date: input.dueDate,
      max_marks: input.maxMarks,
      allow_late: input.allowLate,
      created_by: staffId,
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/lms/assignments`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateAssignment(input: {
  institutionId: string; id: string; title: string; description?: string | null; dueDate: string; maxMarks: number; allowLate: boolean;
}): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("lms_assignments").update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      due_date: input.dueDate,
      max_marks: input.maxMarks,
      allow_late: input.allowLate,
    }).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/lms/assignments`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteAssignment(input: { institutionId: string; id: string }): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("lms_assignments").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/lms/assignments`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Grading ───────────────────────────────────────────────────────────────────

export type AssignmentDetail = { id: string; title: string; subjectName: string | null; maxMarks: number; dueDate: string; rows: GradeRow[] };

export async function getAssignmentSubmissions(assignmentId: string): Promise<Result<AssignmentDetail>> {
  try {
    const supabase = await db();
    const { data: a, error: aErr } = await supabase
      .from("lms_assignments").select("id, title, max_marks, due_date, subject_id, subjects(name, department_id)").eq("id", assignmentId).maybeSingle();
    if (aErr) return { success: false, error: aErr.message };
    if (!a) return { success: false, error: "Assignment not found." };
    const deptId = (a.subjects as unknown as { name: string; department_id: string } | null)?.department_id ?? null;

    const [{ data: students }, { data: subs }] = await Promise.all([
      deptId
        ? supabase.from("students").select("id, full_name, roll_no").eq("department_id", deptId).eq("is_active", true).order("roll_no")
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      supabase.from("lms_submissions").select("id, student_id, file_url, notes, submitted_at, is_late, marks_awarded, feedback").eq("assignment_id", assignmentId),
    ]);
    const subByStudent = new Map((subs ?? []).map((s) => [s.student_id as string, s]));

    const rows: GradeRow[] = (students ?? []).map((st) => {
      const s = subByStudent.get(st.id as string);
      return {
        studentId: st.id as string,
        studentName: st.full_name as string,
        rollNo: (st.roll_no as string | null) ?? null,
        submissionId: (s?.id as string) ?? null,
        fileUrl: (s?.file_url as string | null) ?? null,
        notes: (s?.notes as string | null) ?? null,
        submittedAt: (s?.submitted_at as string | null) ?? null,
        isLate: !!s?.is_late,
        marksAwarded: (s?.marks_awarded as number | null) ?? null,
        feedback: (s?.feedback as string | null) ?? null,
      };
    });

    return {
      success: true,
      data: {
        id: a.id as string,
        title: a.title as string,
        subjectName: (a.subjects as unknown as { name: string } | null)?.name ?? null,
        maxMarks: a.max_marks as number,
        dueDate: a.due_date as string,
        rows,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function gradeSubmission(input: {
  institutionId: string; assignmentId: string; submissionId: string; marks: number; feedback?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = await db();
    const staffId = await currentStaffId();
    const { error } = await supabase.from("lms_submissions").update({
      marks_awarded: input.marks,
      feedback: input.feedback?.trim() || null,
      graded_by: staffId,
      graded_at: new Date().toISOString(),
    }).eq("id", input.submissionId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/lms/assignments/${input.assignmentId}/submissions`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Gradebook ─────────────────────────────────────────────────────────────────

export type GradebookData = { subjectName: string | null; assignments: GbAssignment[]; gradebook: Gradebook };

export async function getGradebook(subjectId: string): Promise<Result<GradebookData>> {
  try {
    const supabase = await db();
    const { data: subject } = await supabase.from("subjects").select("name, department_id").eq("id", subjectId).maybeSingle();
    if (!subject) return { success: false, error: "Subject not found." };

    const [{ data: assignments }, { data: students }] = await Promise.all([
      supabase.from("lms_assignments").select("id, title, max_marks").eq("subject_id", subjectId).order("due_date"),
      subject.department_id
        ? supabase.from("students").select("id, full_name, roll_no").eq("department_id", subject.department_id as string).eq("is_active", true).order("roll_no")
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ]);

    const asn: GbAssignment[] = (assignments ?? []).map((a) => ({ id: a.id as string, title: a.title as string, maxMarks: a.max_marks as number }));
    const stu: GbStudent[] = (students ?? []).map((s) => ({ id: s.id as string, name: s.full_name as string, rollNo: (s.roll_no as string | null) ?? null }));

    let subs: GbSubmission[] = [];
    if (asn.length > 0) {
      const { data: rows } = await supabase
        .from("lms_submissions").select("assignment_id, student_id, marks_awarded").in("assignment_id", asn.map((a) => a.id));
      subs = (rows ?? []).map((r) => ({ assignmentId: r.assignment_id as string, studentId: r.student_id as string, marksAwarded: (r.marks_awarded as number | null) ?? null }));
    }

    return { success: true, data: { subjectName: subject.name as string, assignments: asn, gradebook: buildGradebook(stu, asn, subs) } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Student ───────────────────────────────────────────────────────────────────

export async function getStudentAssignments(): Promise<Result<StudentAssignmentRow[]>> {
  try {
    const supabase = await db();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { success: false, error: "Unauthorized." };
    const { data: student } = await supabase.from("students").select("id, department_id").eq("email", user.email).maybeSingle();
    if (!student?.department_id) return { success: true, data: [] };

    // Assignments for the student's department subjects (RLS already enforces this).
    const { data: subjects } = await supabase.from("subjects").select("id").eq("department_id", student.department_id as string);
    const subjectIds = (subjects ?? []).map((s) => s.id as string);
    if (subjectIds.length === 0) return { success: true, data: [] };

    const [{ data: assignments, error }, { data: subs }] = await Promise.all([
      supabase.from("lms_assignments").select("id, title, description, due_date, max_marks, allow_late, subjects(name)").in("subject_id", subjectIds).order("due_date", { ascending: false }),
      supabase.from("lms_submissions").select("assignment_id, file_url, notes, submitted_at, is_late, marks_awarded, feedback").eq("student_id", student.id as string),
    ]);
    if (error) return { success: false, error: error.message };
    const subByAssignment = new Map((subs ?? []).map((s) => [s.assignment_id as string, s]));

    const rows: StudentAssignmentRow[] = (assignments ?? []).map((a) => {
      const s = subByAssignment.get(a.id as string);
      return {
        id: a.id as string,
        subjectName: (a.subjects as unknown as { name: string } | null)?.name ?? null,
        title: a.title as string,
        description: (a.description as string | null) ?? null,
        dueDate: a.due_date as string,
        maxMarks: a.max_marks as number,
        allowLate: !!a.allow_late,
        submission: s
          ? {
              state: s.marks_awarded !== null && s.marks_awarded !== undefined ? "graded" : "submitted",
              fileUrl: (s.file_url as string | null) ?? null,
              notes: (s.notes as string | null) ?? null,
              submittedAt: s.submitted_at as string,
              isLate: !!s.is_late,
              marksAwarded: (s.marks_awarded as number | null) ?? null,
              feedback: (s.feedback as string | null) ?? null,
            }
          : null,
      };
    });
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function submitAssignment(input: { assignmentId: string; fileUrl?: string | null; notes?: string | null }): Promise<Result<null>> {
  try {
    if (!input.fileUrl && !input.notes?.trim()) return { success: false, error: "Attach a file or add a note." };
    const supabase = await db();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { success: false, error: "Unauthorized." };
    const { data: student } = await supabase.from("students").select("id").eq("email", user.email).maybeSingle();
    if (!student) return { success: false, error: "No student profile found for this account." };

    const { data: a } = await supabase.from("lms_assignments").select("due_date, allow_late").eq("id", input.assignmentId).maybeSingle();
    if (!a) return { success: false, error: "Assignment not found." };

    const now = new Date().toISOString();
    const late = isLate(now, a.due_date as string);
    if (late && !a.allow_late) return { success: false, error: "The deadline has passed and late submissions are not allowed." };

    const { error } = await supabase.from("lms_submissions").upsert({
      assignment_id: input.assignmentId,
      student_id: student.id as string,
      file_url: input.fileUrl || null,
      notes: input.notes?.trim() || null,
      submitted_at: now,
      is_late: late,
    }, { onConflict: "assignment_id,student_id" });
    if (error) return { success: false, error: error.message };
    revalidatePath("/student-portal/lms/assignments");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
