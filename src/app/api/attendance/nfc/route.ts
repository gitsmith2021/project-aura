import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Staff mobile NFC webhook.
 *
 * Authorization: Bearer <AURA_NFC_WEBHOOK_SECRET>
 *
 * Payload A (two fields): { device_uid, subject_id }
 *   subject_id = scanned learner profile UUID (profiles.id, STUDENT).
 *
 * Payload B (explicit course): { device_uid, subject_id, student_id }
 *   subject_id = public.subjects.id, student_id = learner profile UUID.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.AURA_NFC_WEBHOOK_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!webhookSecret || !serviceKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "Server misconfigured for NFC webhook" },
      { status: 503 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${webhookSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { device_uid?: string; subject_id?: string; student_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const device_uid = typeof body.device_uid === "string" ? body.device_uid.trim() : "";
  const subject_id = typeof body.subject_id === "string" ? body.subject_id.trim() : "";
  const explicit_student_id =
    typeof body.student_id === "string" ? body.student_id.trim() : "";

  if (!device_uid || !subject_id) {
    return NextResponse.json(
      { error: "device_uid and subject_id are required" },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id, tenant_id, profile_id, is_active")
    .eq("device_uid", device_uid)
    .maybeSingle();

  if (deviceError) {
    console.error("NFC devices lookup:", deviceError);
    return NextResponse.json({ error: "Device lookup failed" }, { status: 500 });
  }

  if (!device || !device.is_active) {
    return NextResponse.json({ error: "Unknown or inactive device" }, { status: 403 });
  }

  const { data: staffProfile, error: staffErr } = await supabase
    .from("profiles")
    .select("id, tenant_id, role")
    .eq("id", device.profile_id)
    .maybeSingle();

  if (staffErr || !staffProfile) {
    return NextResponse.json({ error: "Invalid staff profile on device" }, { status: 403 });
  }

  if (staffProfile.tenant_id !== device.tenant_id || staffProfile.role !== "STAFF") {
    return NextResponse.json({ error: "Device profile is not authorized staff for tenant" }, { status: 403 });
  }

  let student_id: string;
  let courseSubjectId: string | null = null;

  if (explicit_student_id) {
    courseSubjectId = subject_id;
    student_id = explicit_student_id;
  } else {
    student_id = subject_id;
  }

  const { data: student, error: studentErr } = await supabase
    .from("profiles")
    .select("id, tenant_id, department_id, role")
    .eq("id", student_id)
    .maybeSingle();

  if (studentErr || !student) {
    return NextResponse.json({ error: "Unknown learner profile" }, { status: 404 });
  }

  if (student.tenant_id !== device.tenant_id || student.role !== "STUDENT") {
    return NextResponse.json({ error: "Learner not in tenant or not a student" }, { status: 403 });
  }

  if (!student.department_id) {
    return NextResponse.json({ error: "Student has no department" }, { status: 422 });
  }

  if (courseSubjectId) {
    const { data: subjectRow, error: subjectErr } = await supabase
      .from("subjects")
      .select("id, department_id")
      .eq("id", courseSubjectId)
      .maybeSingle();

    if (subjectErr || !subjectRow) {
      return NextResponse.json({ error: "Unknown subject" }, { status: 404 });
    }

    const { data: subjectDept, error: subjectDeptErr } = await supabase
      .from("departments")
      .select("id, tenant_id")
      .eq("id", subjectRow.department_id)
      .maybeSingle();

    if (subjectDeptErr || !subjectDept || subjectDept.tenant_id !== device.tenant_id) {
      return NextResponse.json({ error: "Subject does not belong to this tenant" }, { status: 403 });
    }

    if (student.department_id !== subjectRow.department_id) {
      return NextResponse.json(
        { error: "Student is not in this subject's department" },
        { status: 403 }
      );
    }
  }

  const tz = process.env.AURA_INSTITUTION_TIMEZONE ?? "UTC";
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const dayOfWeek = get("weekday");
  let hour = get("hour");
  let minute = get("minute");
  let second = get("second");

  if (hour.length === 1) hour = `0${hour}`;
  if (minute.length === 1) minute = `0${minute}`;
  if (second.length === 1) second = `0${second}`;
  const currentTime = `${hour}:${minute}:${second}`;

  let slotQuery = supabase
    .from("class_schedules")
    .select("id, start_time, end_time, subject_id")
    .eq("staff_id", device.profile_id)
    .eq("department_id", student.department_id)
    .eq("day_of_week", dayOfWeek)
    .lte("start_time", currentTime)
    .gt("end_time", currentTime);

  if (courseSubjectId) {
    slotQuery = slotQuery.eq("subject_id", courseSubjectId);
  }

  const { data: slots, error: slotErr } = await slotQuery;

  if (slotErr) {
    console.error("NFC class_schedules lookup:", slotErr);
    return NextResponse.json({ error: "Schedule lookup failed" }, { status: 500 });
  }

  if (!slots?.length) {
    return NextResponse.json(
      { error: "No active class for this staff member and department at this time" },
      { status: 404 }
    );
  }

  if (slots.length > 1) {
    return NextResponse.json(
      { error: "Multiple active classes match; send student_id + subject_id (course) to disambiguate" },
      { status: 409 }
    );
  }

  const scheduleId = slots[0].id;

  const { data: attendanceRow, error: insertErr } = await supabase
    .from("attendance")
    .upsert(
      {
        schedule_id: scheduleId,
        student_id,
        status: "present",
      },
      { onConflict: "schedule_id,student_id" }
    )
    .select()
    .single();

  if (insertErr) {
    console.error("NFC attendance upsert:", insertErr);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    tenant_id: device.tenant_id,
    staff_profile_id: device.profile_id,
    schedule_id: scheduleId,
    student_id,
    attendance: attendanceRow,
  });
}
