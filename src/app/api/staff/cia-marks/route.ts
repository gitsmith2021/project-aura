import { NextResponse } from "next/server";
import { getStaffFromBearer, staffTokenClient } from "@/lib/staffMobileAuth";
import { isSettingEnabled } from "@/lib/configServer";
import { logAuditBatch } from "@/lib/auditLog";

// Phase 8 (Sprint 2) — CIA marks entry for the staff mobile app.
// The mobile client reads components/roster/marks directly under RLS; only the
// WRITE comes here, because two things must happen server-side and would be
// bypassed by a direct supabase-js write:
//   1. the CF-1 `faculty_portal.marks_entry` gate (same as the web action), and
//   2. the audit log (Dev Rule 13 lists cia_marks as a high-stakes table).
// The upsert itself runs under the staff member's JWT, so the existing
// "cia_marks: staff manage own teaching subjects" RLS policy is the authorization
// gate — a teacher can only write marks for subjects they actually teach.
export async function POST(req: Request) {
  const staff = await getStaffFromBearer(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    componentId?: string;
    subjectId?: string | null;
    rows?: { student_id: string; marks_scored: number }[];
  } | null;

  if (!body?.componentId || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: "componentId and rows are required." }, { status: 400 });
  }

  // CF-1: same fail-open gate as bulkSaveCIAMarks.
  if (!(await isSettingEnabled(staff.institutionId, "faculty_portal.marks_entry"))) {
    return NextResponse.json({ error: "Marks entry is disabled for this institution." }, { status: 403 });
  }

  const supabase = staffTokenClient(req);
  if (!supabase) return NextResponse.json({ error: "Auth unavailable." }, { status: 500 });

  const rows = body.rows
    .filter((r) => r && typeof r.student_id === "string" && Number.isFinite(r.marks_scored) && r.marks_scored >= 0)
    .map((r) => ({
      institution_id: staff.institutionId,
      cia_component_id: body.componentId as string,
      subject_id: body.subjectId ?? null,
      student_id: r.student_id,
      marks_scored: r.marks_scored,
      entered_by: staff.userId,
    }));

  if (rows.length === 0) return NextResponse.json({ count: 0 });

  // Snapshot before → after so the audit trail records the change.
  const { data: beforeRows } = await supabase
    .from("cia_marks")
    .select("id, student_id, marks_scored")
    .eq("cia_component_id", body.componentId)
    .in("student_id", rows.map((r) => r.student_id));
  const beforeByStudent = new Map((beforeRows ?? []).map((r) => [r.student_id as string, r]));

  const { data: saved, error } = await supabase
    .from("cia_marks")
    .upsert(rows, { onConflict: "student_id,cia_component_id" })
    .select("id, student_id, marks_scored");

  // RLS rejects marks for subjects the staff member doesn't teach.
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  await logAuditBatch(
    (saved ?? []).map((after) => {
      const before = beforeByStudent.get(after.student_id as string);
      return {
        institutionId: staff.institutionId,
        performedBy: staff.userId,
        tableName: "cia_marks",
        recordId: after.id as string,
        action: before ? ("UPDATE" as const) : ("INSERT" as const),
        beforeData: before ?? null,
        afterData: after,
        notes: "CIA marks entry (mobile)",
      };
    })
  );

  return NextResponse.json({ count: saved?.length ?? 0 });
}
