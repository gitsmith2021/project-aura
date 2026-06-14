"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createNotification, createNotificationsBulk } from "@/actions/notifications";
import {
  buildLeaveRequestedMessage, buildLeaveReviewedMessage, buildPaymentReceivedMessage,
  buildSalaryDisbursedMessage, buildSchedulePublishedMessage,
} from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { paymentReceiptEmail, leaveStatusEmail, salaryDisbursedEmail } from "@/lib/emailTemplates";

// Phase 3B — notification triggers. Each is fire-and-forget: a failure here must
// never break the primary action that called it (same contract as logAudit), so
// every function swallows its own errors. Recipient resolution uses the
// service-role admin client (Dev Rule 16) because the caller's session often
// can't read the recipients (e.g. a staff member applying for leave can't read
// the institution's admin list; the Razorpay webhook has no session at all).

/** New leave request → notify institution admins (INST_ADMIN, PRINCIPAL). */
export async function notifyLeaveRequested(p: {
  institutionId: string; staffId: string; leaveType: string; fromDate: string; toDate: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const [{ data: staff }, { data: admins }] = await Promise.all([
      admin.from("staff").select("full_name").eq("id", p.staffId).maybeSingle(),
      admin.from("institution_members").select("profile_id")
        .eq("institution_id", p.institutionId).in("role", ["INST_ADMIN", "PRINCIPAL"]),
    ]);
    const recipients = (admins ?? []).map((a) => a.profile_id as string).filter(Boolean);
    if (recipients.length === 0) return;
    const msg = buildLeaveRequestedMessage(staff?.full_name ?? "A staff member", p.leaveType, p.fromDate, p.toDate);
    await createNotificationsBulk(p.institutionId, recipients, msg);
  } catch (err) {
    console.error("[notify] leaveRequested failed:", err);
  }
}

/** Leave approved/rejected → notify the staff member. */
export async function notifyLeaveReviewed(p: {
  institutionId: string; staffId: string; status: "approved" | "rejected";
  leaveType: string; fromDate: string; toDate: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: staff } = await admin.from("staff").select("profile_id, email, full_name").eq("id", p.staffId).maybeSingle();
    if (!staff) return;
    const msg = buildLeaveReviewedMessage(p.status, p.leaveType, p.fromDate, p.toDate);
    if (staff.profile_id) {
      await createNotification({
        institutionId: p.institutionId, recipientId: staff.profile_id as string,
        ...msg, data: { href: "/staff-portal/leave" },
      });
    }
    if (staff.email) {
      const mail = leaveStatusEmail({
        name: (staff.full_name as string) ?? "there",
        status: p.status, leaveType: p.leaveType, fromDate: p.fromDate, toDate: p.toDate,
      });
      await sendEmail({ to: staff.email as string, ...mail });
    }
  } catch (err) {
    console.error("[notify] leaveReviewed failed:", err);
  }
}

/** Fee payment completed → notify the student (if they have a portal login). */
export async function notifyPaymentReceived(p: {
  institutionId: string; studentId: string; amount: number; receiptNumber?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: student } = await admin
      .from("students")
      .select("profile_id, email, full_name, institutions!institution_id(name)")
      .eq("id", p.studentId)
      .maybeSingle();
    if (!student) return;
    const msg = buildPaymentReceivedMessage(p.amount, p.receiptNumber);
    if (student.profile_id) {
      await createNotification({
        institutionId: p.institutionId, recipientId: student.profile_id as string,
        ...msg, data: { href: "/student-portal/fees" },
      });
    }
    if (student.email) {
      const instName = (student.institutions as { name?: string } | null)?.name ?? null;
      const mail = paymentReceiptEmail({
        name: (student.full_name as string) ?? "there",
        amount: p.amount, receiptNumber: p.receiptNumber, institutionName: instName,
      });
      await sendEmail({ to: student.email as string, ...mail });
    }
  } catch (err) {
    console.error("[notify] paymentReceived failed:", err);
  }
}

/** Single salary disbursement processed → notify the staff member. */
export async function notifySalaryDisbursed(p: {
  institutionId: string; staffId: string; month?: string | null; amount?: number | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: staff } = await admin.from("staff").select("profile_id, email, full_name").eq("id", p.staffId).maybeSingle();
    if (!staff) return;
    const msg = buildSalaryDisbursedMessage(p.month, p.amount);
    if (staff.profile_id) {
      await createNotification({
        institutionId: p.institutionId, recipientId: staff.profile_id as string,
        ...msg, data: { href: "/staff-portal/salary" },
      });
    }
    if (staff.email) {
      const mail = salaryDisbursedEmail({
        name: (staff.full_name as string) ?? "there", month: p.month, amount: p.amount,
      });
      await sendEmail({ to: staff.email as string, ...mail });
    }
  } catch (err) {
    console.error("[notify] salaryDisbursed failed:", err);
  }
}

/** Bulk payroll run → notify every staff member whose disbursement processed. */
export async function notifySalaryDisbursedBulk(p: {
  institutionId: string; staffIds: string[];
}): Promise<void> {
  try {
    const ids = Array.from(new Set(p.staffIds.filter(Boolean)));
    if (ids.length === 0) return;
    const admin = createAdminClient();
    const { data: staff } = await admin.from("staff").select("profile_id").in("id", ids);
    const recipients = (staff ?? []).map((s) => s.profile_id as string).filter(Boolean);
    if (recipients.length === 0) return;
    const msg = buildSalaryDisbursedMessage();
    await createNotificationsBulk(p.institutionId, recipients, { ...msg, data: { href: "/staff-portal/salary" } });
  } catch (err) {
    console.error("[notify] salaryDisbursedBulk failed:", err);
  }
}

/** Urgent notice (emergency/exam) → ping the target audience's bell. */
export async function notifyNoticePosted(p: {
  institutionId: string; departmentId?: string | null;
  audience: string; noticeType: string; title: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const wantStaff = p.audience === "all" || p.audience === "staff";
    const wantStudents = p.audience === "all" || p.audience === "students" || p.audience === "hostel";

    const recipientIds: string[] = [];
    if (wantStaff) {
      let q = admin.from("staff").select("profile_id")
        .eq("institution_id", p.institutionId).eq("is_active", true);
      if (p.departmentId) q = q.eq("department_id", p.departmentId);
      const { data } = await q;
      recipientIds.push(...(data ?? []).map((r) => r.profile_id as string).filter(Boolean));
    }
    if (wantStudents) {
      let q = admin.from("students").select("profile_id").eq("institution_id", p.institutionId);
      if (p.departmentId) q = q.eq("department_id", p.departmentId);
      const { data } = await q;
      recipientIds.push(...(data ?? []).map((r) => r.profile_id as string).filter(Boolean));
    }
    const recipients = Array.from(new Set(recipientIds));
    if (recipients.length === 0) return;

    const isEmergency = p.noticeType === "emergency";
    await createNotificationsBulk(p.institutionId, recipients, {
      type: "notice",
      title: isEmergency ? `🚨 ${p.title}` : p.title,
      body: isEmergency ? "Emergency notice — please read it on the notice board." : "A new notice has been posted.",
    });
  } catch (err) {
    console.error("[notify] noticePosted failed:", err);
  }
}

/** Timetable published → notify all staff + students in the department. */
export async function notifySchedulePublished(p: {
  institutionId: string; departmentId: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const [{ data: dept }, { data: staff }, { data: students }] = await Promise.all([
      admin.from("departments").select("name").eq("id", p.departmentId).maybeSingle(),
      admin.from("staff").select("profile_id")
        .eq("institution_id", p.institutionId).eq("department_id", p.departmentId).eq("is_active", true),
      admin.from("students").select("profile_id")
        .eq("institution_id", p.institutionId).eq("department_id", p.departmentId),
    ]);
    const recipients = [...(staff ?? []), ...(students ?? [])]
      .map((r) => r.profile_id as string).filter(Boolean);
    if (recipients.length === 0) return;
    const msg = buildSchedulePublishedMessage(dept?.name as string | undefined);
    await createNotificationsBulk(p.institutionId, recipients, msg);
  } catch (err) {
    console.error("[notify] schedulePublished failed:", err);
  }
}
