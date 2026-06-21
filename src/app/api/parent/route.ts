import { NextResponse } from "next/server";
import { getParentFromBearer, parentOwnsStudent } from "@/lib/parentMobileAuth";
import { createAdminClient } from "@/utils/supabase/admin";

// Phase 8F — read API for the parent mobile app. One endpoint, selected by
// ?resource=children|attendance|results|fees (+ ?studentId= for child data).
// Authenticated by the parent's Supabase JWT; child data is link-verified, then
// fetched with the service role (parents have no RLS path — Dev Rule 16).
export async function GET(req: Request) {
  const parent = await getParentFromBearer(req);
  if (!parent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const resource = searchParams.get("resource") ?? "children";
  const admin = createAdminClient();

  if (resource === "children") {
    const { data, error } = await admin
      .from("parent_student_links")
      .select("relationship, is_primary, students(id, full_name, roll_no, student_program, student_year, departments(name))")
      .eq("parent_id", parent.parentId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const children = (data ?? []).map((l) => {
      const s = l.students as unknown as {
        id: string; full_name: string; roll_no: string | null;
        student_program: string | null; student_year: number | null;
        departments: { name: string } | null;
      };
      return {
        studentId: s.id, name: s.full_name, rollNo: s.roll_no ?? null,
        program: s.student_program ?? null, year: s.student_year ?? null,
        department: s.departments?.name ?? null,
        relationship: (l.relationship as string) ?? "parent", isPrimary: !!l.is_primary,
      };
    });
    return NextResponse.json({ children });
  }

  // All remaining resources are child-scoped and link-verified.
  const studentId = searchParams.get("studentId") ?? "";
  if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  if (!(await parentOwnsStudent(parent.parentId, studentId))) {
    return NextResponse.json({ error: "Not authorised for this student." }, { status: 403 });
  }

  if (resource === "attendance") {
    const { data, error } = await admin
      .from("attendance")
      .select("status, class_schedules(subject_name)")
      .eq("student_id", studentId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const rows = (data ?? []).map((a) => ({
      subject: (a.class_schedules as unknown as { subject_name: string | null } | null)?.subject_name ?? null,
      status: (a.status as string | null) ?? null,
    }));
    return NextResponse.json({ rows });
  }

  if (resource === "results") {
    const { data, error } = await admin
      .from("cia_results")
      .select("semester, final_percentage, status, created_at")
      .eq("student_id", studentId)
      .eq("status", "published")
      .order("semester", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rows: data ?? [] });
  }

  if (resource === "fees") {
    const { data, error } = await admin
      .from("fee_demands")
      .select("id, title, amount_due, concession_amount, net_due, due_date, status")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rows: data ?? [] });
  }

  return NextResponse.json({ error: "Unknown resource" }, { status: 400 });
}
