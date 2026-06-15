"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";
import { concessionFor, demandStatus, type FeeDemand, type DemandStoredStatus, type DemandTally } from "@/lib/feeDemands";
import { demandTally } from "@/lib/feeDemands";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const DEMAND_COLS =
  "id, institution_id, student_id, fee_structure_id, academic_year_id, title, amount_due, concession_amount, net_due, due_date, status, created_at, students(full_name, roll_no)";

/** Map of "studentId|structureId" → total completed amount_paid for an institution. */
async function paidMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  institutionId: string
): Promise<Map<string, number>> {
  const { data } = await supabase
    .from("fee_payments")
    .select("student_id, fee_structure_id, amount_paid")
    .eq("institution_id", institutionId)
    .eq("payment_status", "completed");
  const m = new Map<string, number>();
  for (const p of data ?? []) {
    if (!p.fee_structure_id) continue;
    const k = `${p.student_id}|${p.fee_structure_id}`;
    m.set(k, (m.get(k) ?? 0) + Number(p.amount_paid));
  }
  return m;
}

function attachPaid(rows: FeeDemand[], paid: Map<string, number>): FeeDemand[] {
  return rows.map((d) => ({ ...d, amount_paid: paid.get(`${d.student_id}|${d.fee_structure_id}`) ?? 0 }));
}

export async function getDemands(
  institutionId: string,
  filters?: { liveStatus?: string; departmentId?: string }
): Promise<Result<FeeDemand[]>> {
  try {
    const supabase = createClient(await cookies());
    let q = supabase.from("fee_demands").select(DEMAND_COLS).eq("institution_id", institutionId);
    if (filters?.departmentId) {
      // demands don't carry department; filter via the structure
      const { data: structs } = await supabase.from("fee_structures").select("id").eq("department_id", filters.departmentId);
      const ids = (structs ?? []).map((s) => s.id as string);
      if (ids.length === 0) return { success: true, data: [] };
      q = q.in("fee_structure_id", ids);
    }
    const { data, error } = await q.order("due_date", { ascending: true });
    if (error) return { success: false, error: error.message };
    const paid = await paidMap(supabase, institutionId);
    let rows = attachPaid((data ?? []) as unknown as FeeDemand[], paid);
    if (filters?.liveStatus) {
      rows = rows.filter((d) => demandStatus(d, d.amount_paid ?? 0) === filters.liveStatus);
    }
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getDemandStats(institutionId: string): Promise<Result<DemandTally>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("fee_demands").select("net_due, status, due_date, student_id, fee_structure_id").eq("institution_id", institutionId);
    if (error) return { success: false, error: error.message };
    const paid = await paidMap(supabase, institutionId);
    const rows = (data ?? []).map((d) => ({
      net_due: Number(d.net_due), status: d.status as DemandStoredStatus, due_date: d.due_date as string,
      amount_paid: paid.get(`${d.student_id}|${d.fee_structure_id}`) ?? 0,
    }));
    return { success: true, data: demandTally(rows) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export type GenerationTargets = {
  structures: { id: string; name: string; fee_type: string; amount: number; department_id: string | null; academic_year_id: string | null; academic_year: string | null }[];
  departments: { id: string; name: string }[];
};

export async function getGenerationTargets(institutionId: string): Promise<Result<GenerationTargets>> {
  try {
    const supabase = createClient(await cookies());
    const [structRes, deptRes] = await Promise.all([
      supabase.from("fee_structures").select("id, name, fee_type, amount, department_id, academic_year_id, academic_years(label)").eq("institution_id", institutionId).eq("is_active", true).order("name"),
      supabase.from("departments").select("id, name").eq("institution_id", institutionId).order("name"),
    ]);
    return {
      success: true,
      data: {
        structures: (structRes.data ?? []).map((s) => ({
          id: s.id as string, name: s.name as string, fee_type: s.fee_type as string, amount: Number(s.amount),
          department_id: (s.department_id as string) ?? null, academic_year_id: (s.academic_year_id as string) ?? null,
          academic_year: (s.academic_years as unknown as { label: string } | null)?.label ?? null,
        })),
        departments: (deptRes.data ?? []).map((d) => ({ id: d.id as string, name: d.name as string })),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function generateDemands(input: {
  institutionId: string;
  feeStructureId: string;
  dueDate: string;
  departmentId?: string | null;  // override; defaults to the structure's department
  studentYear?: number | null;
  applyConcessions?: boolean;
}): Promise<Result<{ created: number; skipped: number }>> {
  try {
    if (!input.feeStructureId) return { success: false, error: "Select a fee structure." };
    if (!input.dueDate) return { success: false, error: "Set a due date." };
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const { data: structure, error: sErr } = await supabase
      .from("fee_structures").select("id, name, fee_type, amount, department_id, academic_year_id").eq("id", input.feeStructureId).maybeSingle();
    if (sErr) return { success: false, error: sErr.message };
    if (!structure) return { success: false, error: "Fee structure not found." };

    const targetDept = input.departmentId ?? (structure.department_id as string | null);

    // target students
    let sq = supabase.from("students").select("id").eq("institution_id", input.institutionId);
    if (targetDept) sq = sq.eq("department_id", targetDept);
    if (input.studentYear) sq = sq.eq("student_year", input.studentYear);
    const { data: students, error: stErr } = await sq;
    if (stErr) return { success: false, error: stErr.message };
    const studentIds = (students ?? []).map((s) => s.id as string);
    if (studentIds.length === 0) return { success: false, error: "No students match that target." };

    // existing demands for this structure (skip them)
    const { data: existing } = await supabase.from("fee_demands").select("student_id").eq("fee_structure_id", input.feeStructureId);
    const have = new Set((existing ?? []).map((e) => e.student_id as string));

    // concessions by student (approved, matching this fee)
    const concByStudent = new Map<string, { fixed: number; pct: number }>();
    if (input.applyConcessions) {
      const { data: conc } = await supabase
        .from("fee_concessions")
        .select("student_id, amount, percentage, applicable_to, status, academic_year_id")
        .in("student_id", studentIds)
        .eq("status", "approved");
      for (const c of conc ?? []) {
        const applicable = c.applicable_to == null || c.applicable_to === "all" || c.applicable_to === structure.fee_type;
        const yearOk = c.academic_year_id == null || c.academic_year_id === structure.academic_year_id;
        if (!applicable || !yearOk) continue;
        const cur = concByStudent.get(c.student_id as string) ?? { fixed: 0, pct: 0 };
        cur.fixed += Number(c.amount ?? 0);
        cur.pct += Number(c.percentage ?? 0);
        concByStudent.set(c.student_id as string, cur);
      }
    }

    const amount = Number(structure.amount);
    const rows = studentIds
      .filter((sid) => !have.has(sid))
      .map((sid) => {
        const c = concByStudent.get(sid);
        const concession = c ? concessionFor(amount, c.fixed, c.pct) : 0;
        return {
          institution_id: input.institutionId,
          student_id: sid,
          fee_structure_id: input.feeStructureId,
          academic_year_id: (structure.academic_year_id as string) ?? null,
          title: structure.name as string,
          amount_due: amount,
          concession_amount: concession,
          due_date: input.dueDate,
          status: "pending",
          created_by: user.id,
        };
      });

    const skipped = studentIds.length - rows.length;
    if (rows.length === 0) return { success: true, data: { created: 0, skipped } };

    const { error: insErr, count } = await supabase.from("fee_demands").insert(rows, { count: "exact" });
    if (insErr) return { success: false, error: insErr.message };

    await logAudit({
      institutionId: input.institutionId, performedBy: user.id, tableName: "fee_demands",
      recordId: input.feeStructureId, action: "INSERT",
      afterData: { fee_structure: structure.name, created: count ?? rows.length, due_date: input.dueDate },
      notes: "Fee demands generated",
    });

    revalidatePath(`/institutions/${input.institutionId}/finance/demands`);
    return { success: true, data: { created: count ?? rows.length, skipped } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function setDemandStatus(
  institutionId: string, demandId: string, status: "waived" | "cancelled" | "pending"
): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("fee_demands").update({ status }).eq("id", demandId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/finance/demands`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Student portal ────────────────────────────────────────────────────────────
export async function getMyDemands(): Promise<Result<FeeDemand[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };
    const { data: student } = await supabase.from("students").select("id").eq("profile_id", user.id).maybeSingle();
    if (!student) return { success: true, data: [] };

    const { data, error } = await supabase
      .from("fee_demands").select(DEMAND_COLS).eq("student_id", student.id as string).order("due_date");
    if (error) return { success: false, error: error.message };
    const rows = (data ?? []) as unknown as FeeDemand[];

    // paid per structure for this student
    const { data: pays } = await supabase
      .from("fee_payments").select("fee_structure_id, amount_paid").eq("student_id", student.id as string).eq("payment_status", "completed");
    const paid = new Map<string, number>();
    for (const p of pays ?? []) {
      if (!p.fee_structure_id) continue;
      paid.set(p.fee_structure_id as string, (paid.get(p.fee_structure_id as string) ?? 0) + Number(p.amount_paid));
    }
    return { success: true, data: rows.map((d) => ({ ...d, amount_paid: paid.get(d.fee_structure_id) ?? 0 })) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
