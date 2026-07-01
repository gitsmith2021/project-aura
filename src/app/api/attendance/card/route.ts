import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSettingEnabled } from "@/lib/configServer";
import { matchScheduleForRoom, nowParts, REASON_MESSAGE, type SchedRow } from "@/lib/smartAttendance";

/**
 * PHASE 8 · P8.2 — Student card attendance (fixed in-room reader).
 *
 * A student taps their campus card on a wall reader; the reader posts here and
 * Aura records classroom attendance against the live timetable — no phones, no QR.
 * Mirrors api/attendance/nfc (staff): Bearer <AURA_NFC_WEBHOOK_SECRET>, service-role.
 * The reader identifies the ROOM (not a person), so the class is resolved from the
 * classroom + current period (P8.4 matching), never trusting a client-sent class.
 *
 * Payload: { reader_uid, card_uid }
 *   reader_uid = public.card_readers.reader_uid (the wall unit)
 *   card_uid   = the tapped student's NFC/RFID card (public.smart_cards.card_uid)
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.AURA_NFC_WEBHOOK_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!webhookSecret || !serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: "Server misconfigured for card webhook" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${webhookSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { reader_uid?: string; card_uid?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const reader_uid = typeof body.reader_uid === "string" ? body.reader_uid.trim() : "";
  const card_uid =
    typeof body.card_uid === "string" ? body.card_uid.trim().toUpperCase().replace(/[\s:]+/g, "") : "";

  if (!reader_uid || !card_uid) {
    return NextResponse.json({ error: "reader_uid and card_uid are required" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // 1 — Resolve the reader → its room + institution.
  const { data: reader, error: readerErr } = await supabase
    .from("card_readers")
    .select("id, institution_id, classroom_id, status")
    .eq("reader_uid", reader_uid)
    .maybeSingle();

  if (readerErr) {
    console.error("card reader lookup:", readerErr);
    return NextResponse.json({ error: "Reader lookup failed" }, { status: 500 });
  }
  if (!reader || reader.status !== "active") {
    return NextResponse.json({ error: "Unknown or inactive reader" }, { status: 403 });
  }
  if (!reader.classroom_id) {
    return NextResponse.json({ error: "Reader is not assigned to a classroom" }, { status: 422 });
  }

  // Heartbeat — best effort, never blocks the tap.
  await supabase.from("card_readers").update({ last_seen_at: new Date().toISOString() }).eq("id", reader.id);

  // 2 — CF-1 gate (fail-open, like the staff NFC path stays permissive on config).
  if (!(await isSettingEnabled(reader.institution_id, "smart_campus.rfid_enabled", true))) {
    return NextResponse.json({ error: "RFID attendance is disabled for this institution" }, { status: 403 });
  }

  // 3 — Resolve the room's department (may be null → matching relies on room assignment).
  const { data: classroom, error: roomErr } = await supabase
    .from("classrooms")
    .select("id, institution_id, department_id")
    .eq("id", reader.classroom_id)
    .maybeSingle();

  if (roomErr || !classroom || classroom.institution_id !== reader.institution_id) {
    return NextResponse.json({ error: "Reader's classroom is invalid" }, { status: 500 });
  }

  // 4 — Resolve the tapped card → student, enforcing status + tenant + holder type.
  const { data: card, error: cardErr } = await supabase
    .from("smart_cards")
    .select("student_id, holder_type, status, institution_id")
    .eq("card_uid", card_uid)
    .maybeSingle();

  if (cardErr) {
    console.error("card smart_cards lookup:", cardErr);
    return NextResponse.json({ error: "Card lookup failed" }, { status: 500 });
  }
  if (!card) return NextResponse.json({ error: "Unknown card" }, { status: 404 });
  if (card.status !== "active") return NextResponse.json({ error: `Card is ${card.status}` }, { status: 403 });
  if (card.holder_type !== "student" || !card.student_id) {
    return NextResponse.json({ error: "Card does not belong to a student" }, { status: 403 });
  }
  if (card.institution_id !== reader.institution_id) {
    return NextResponse.json({ error: "Card not in this institution" }, { status: 403 });
  }

  const { data: student, error: studentErr } = await supabase
    .from("students")
    .select("id, institution_id, department_id, role")
    .eq("id", card.student_id)
    .maybeSingle();

  if (studentErr || !student) return NextResponse.json({ error: "Unknown learner profile" }, { status: 404 });
  if (student.institution_id !== reader.institution_id || student.role !== "STUDENT") {
    return NextResponse.json({ error: "Learner not in institution or not a student" }, { status: 403 });
  }
  if (!student.department_id) {
    return NextResponse.json({ error: "Student has no department" }, { status: 422 });
  }

  // 5 — Match the current period for this room (P8.4: classroom → dept fallback).
  const tz = process.env.AURA_INSTITUTION_TIMEZONE ?? "UTC";
  const { dayOfWeek, time } = nowParts(new Date(), tz);

  const { data: scheduleRows, error: schedErr } = await supabase
    .from("class_schedules")
    .select("id, staff_id, classroom_id, department_id, start_time, end_time, day_of_week, status, subject_id")
    .eq("institution_id", reader.institution_id)
    .eq("day_of_week", dayOfWeek);

  if (schedErr) {
    console.error("card class_schedules lookup:", schedErr);
    return NextResponse.json({ error: "Schedule lookup failed" }, { status: 500 });
  }

  const match = matchScheduleForRoom((scheduleRows ?? []) as SchedRow[], {
    classroomId: reader.classroom_id,
    departmentId: classroom.department_id,
    day: dayOfWeek,
    time,
  });

  if (!match.ok) {
    // no_class → 404 (nothing running); ambiguous → 409 (needs room assignment).
    const status = match.reason === "ambiguous" ? 409 : 404;
    return NextResponse.json({ error: REASON_MESSAGE[match.reason], reason: match.reason }, { status });
  }

  const schedule = match.schedule;

  // 6 — Enrollment guard: the student must belong to the matched class's department.
  if (schedule.department_id && student.department_id !== schedule.department_id) {
    return NextResponse.json(
      { error: "Student is not enrolled in this class's department", reason: "wrong_department" },
      { status: 403 },
    );
  }

  // 7 — Record via the existing attendance path (idempotent on schedule+student).
  const { data: attendanceRow, error: insertErr } = await supabase
    .from("attendance")
    .upsert(
      { schedule_id: schedule.id, student_id: student.id, status: "present" },
      { onConflict: "schedule_id,student_id" },
    )
    .select()
    .single();

  if (insertErr) {
    console.error("card attendance upsert:", insertErr);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    institution_id: reader.institution_id,
    classroom_id: reader.classroom_id,
    schedule_id: schedule.id,
    student_id: student.id,
    attendance: attendanceRow,
  });
}
