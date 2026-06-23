"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { logAudit } from "@/lib/auditLog";

// Phase 9B — Admin-only reset of the showcase demo tenant. This is a destructive
// operation, so it is guarded on every axis:
//   • SUPER_ADMIN validated from the DB (never trusting a cookie/claim).
//   • Explicit demo allowlist: it resolves ONLY the `aura-demo` institution and
//     refuses to touch anything whose slug isn't exactly that.
//   • Scoped strictly to the resolved demo institution id.
// It wipes the demo tenant's data (restore the full showcase with `npm run
// seed:demo` / `reset:demo`, which a server function can't run at scale).

const DEMO_SLUG = "aura-demo";

type Result<T = undefined> = T extends undefined
  ? { success: true } | { success: false; error: string }
  : { success: true; data: T } | { success: false; error: string };

export async function resetDemoInstitution(): Promise<Result<{ institutionId: string; cleared: true }>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized." };

    // ── Guard 1: SUPER_ADMIN, validated against the DB (not the aura-role cookie) ──
    const { data: superRow } = await supabase
      .from("institution_members")
      .select("id")
      .eq("profile_id", user.id)
      .eq("role", "SUPER_ADMIN")
      .limit(1)
      .maybeSingle();
    if (!superRow) return { success: false, error: "Only a SUPER_ADMIN may reset the demo tenant." };

    const admin = createAdminClient();

    // ── Guard 2: explicit demo allowlist — resolve ONLY the aura-demo tenant ──────
    const { data: inst } = await admin.from("institutions").select("id, slug").eq("slug", DEMO_SLUG).maybeSingle();
    if (!inst) return { success: false, error: `Demo institution "${DEMO_SLUG}" not found. Run \`npm run seed:demo\` first.` };
    // ── Guard 3: refuse to proceed against anything that isn't the demo tenant ────
    if (inst.slug !== DEMO_SLUG) return { success: false, error: "Refusing to reset a non-demo tenant." };

    const I = inst.id;

    // FK-safe teardown, scoped strictly to the demo institution id.
    const idsIn = async (table: string, col: string) => {
      const { data } = await admin.from(table).select("id").eq(col, I);
      return (data ?? []).map((r) => r.id as string);
    };
    const schedIds = await idsIn("class_schedules", "institution_id");
    if (schedIds.length) await admin.from("attendance").delete().in("schedule_id", schedIds);
    const driveIds = await idsIn("placement_drives", "institution_id");
    if (driveIds.length) await admin.from("placement_registrations").delete().in("drive_id", driveIds);
    const budgetIds = await idsIn("department_budgets", "institution_id");
    if (budgetIds.length) await admin.from("budget_line_items").delete().in("budget_id", budgetIds);
    const meetingIds = await idsIn("iqac_meetings", "institution_id");
    if (meetingIds.length) await admin.from("iqac_action_items").delete().in("meeting_id", meetingIds);
    const parentIds = await idsIn("parents", "institution_id");
    if (parentIds.length) await admin.from("parent_student_links").delete().in("parent_id", parentIds);

    const byInst = [
      "fee_payments", "fee_demands", "fee_concessions",
      "salary_disbursements", "salary_structures", "expenses", "department_budgets",
      "cia_marks", "cia_results", "cia_components", "co_po_map", "course_outcomes", "program_outcomes",
      "class_schedules", "teaching_assignments", "subjects",
      "placement_drives", "companies", "scholarship_applications", "scholarship_schemes",
      "publications", "research_projects", "alumni_announcements", "alumni",
      "iqac_meetings", "exam_schedules", "staff_appraisals", "knowledge_resources",
      "admissions", "admission_enquiries", "notifications", "notices", "data_consent_logs",
      "parents", "students", "staff", "institution_members",
    ];
    for (const t of byInst) await admin.from(t).delete().eq("institution_id", I);
    await admin.from("profiles").delete().eq("tenant_id", I);
    await admin.from("departments").delete().eq("institution_id", I);
    await admin.from("academic_years").delete().eq("institution_id", I);

    await logAudit({
      institutionId: I, performedBy: user.id, tableName: "institutions", recordId: I,
      action: "DELETE", notes: "Demo tenant data reset via /admin (Phase 9B)",
    });

    return { success: true, data: { institutionId: I, cleared: true } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
