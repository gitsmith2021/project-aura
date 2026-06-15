"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";
import { concessionFor, demandStatus, type FeeDemand, type DemandStoredStatus, type DemandTally } from "@/lib/feeDemands";
import { demandTally } from "@/lib/feeDemands";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const DEMAND_COLS =
  "id, institution_id, student_id, fee_structure_id, academic_year_id, title, amount_due, concession_amount, net_due, due_date, status, source, source_ref, created_at, students(full_name, roll_no)";

/** Completed-payment rollups for an institution: by student|structure (for
 *  structure-based demands) and by demand_id (for ad-hoc demands). */
async function paidRollups(
  supabase: Awaited<ReturnType<typeof createClient>>,
  institutionId: string
): Promise<{ byStructure: Map<string, number>; byDemand: Map<string, number> }> {
  const { data } = await supabase
    .from("fee_payments")
    .select("student_id, fee_structure_id, demand_id, amount_paid")
    .eq("institution_id", institutionId)
    .eq("payment_status", "completed");
  const byStructure = new Map<string, number>();
  const byDemand = new Map<string, number>();
  for (const p of data ?? []) {
    const amt = Number(p.amount_paid);
    if (p.fee_structure_id) {
      const k = `${p.student_id}|${p.fee_structure_id}`;
      byStructure.set(k, (byStructure.get(k) ?? 0) + amt);
    }
    if (p.demand_id) byDemand.set(p.demand_id as string, (byDemand.get(p.demand_id as string) ?? 0) + amt);
  }
  return { byStructure, byDemand };
}

/** A structure-based demand draws from byStructure; an ad-hoc demand from byDemand. */
function paidFor(d: { id: string; student_id: string; fee_structure_id: string | null }, r: { byStructure: Map<string, number>; byDemand: Map<string, number> }): number {
  return d.fee_structure_id ? (r.byStructure.get(`${d.student_id}|${d.fee_structure_id}`) ?? 0) : (r.byDemand.get(d.id) ?? 0);
}

function attachPaid(rows: FeeDemand[], r: { byStructure: Map<string, number>; byDemand: Map<string, number> }): FeeDemand[] {
  return rows.map((d) => ({ ...d, amount_paid: paidFor(d, r) }));
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
    const rollups = await paidRollups(supabase, institutionId);
    let rows = attachPaid((data ?? []) as unknown as FeeDemand[], rollups);
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
      .from("fee_demands").select("id, net_due, status, due_date, student_id, fee_structure_id").eq("institution_id", institutionId);
    if (error) return { success: false, error: error.message };
    const rollups = await paidRollups(supabase, institutionId);
    const rows = (data ?? []).map((d) => ({
      net_due: Number(d.net_due), status: d.status as DemandStoredStatus, due_date: d.due_date as string,
      amount_paid: paidFor({ id: d.id as string, student_id: d.student_id as string, fee_structure_id: (d.fee_structure_id as string) ?? null }, rollups),
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

/**
 * Create an ad-hoc (non-structure) demand — used to post library fines, mess
 * bills, etc. into the central ledger. Idempotent on (source, source_ref): a
 * second post of the same originating record is a no-op.
 */
export async function createAdHocDemand(input: {
  institutionId: string;
  studentId: string;
  title: string;
  amount: number;
  dueDate: string;
  source: "library_fine" | "mess" | "other";
  sourceRef?: string | null;
}): Promise<Result<{ created: boolean }>> {
  try {
    if (input.amount <= 0) return { success: false, error: "Amount must be greater than zero." };
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("fee_demands")
      .upsert({
        institution_id: input.institutionId,
        student_id: input.studentId,
        fee_structure_id: null,
        title: input.title,
        amount_due: input.amount,
        concession_amount: 0,
        due_date: input.dueDate,
        status: "pending",
        source: input.source,
        source_ref: input.sourceRef ?? null,
        created_by: user?.id ?? null,
      }, { onConflict: "source,source_ref", ignoreDuplicates: true })
      .select("id");
    if (error) return { success: false, error: error.message };
    return { success: true, data: { created: (data?.length ?? 0) > 0 } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Record a completed payment against any demand (e.g. an ad-hoc fine paid at the
 *  office). Inserts a fee_payments row tagged with demand_id so the rollup picks it up. */
export async function recordDemandPayment(input: {
  institutionId: string; demandId: string; amount: number; mode: string; notes?: string | null;
}): Promise<Result<null>> {
  try {
    if (input.amount <= 0) return { success: false, error: "Amount must be greater than zero." };
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const { data: demand, error: dErr } = await supabase
      .from("fee_demands").select("student_id, fee_structure_id").eq("id", input.demandId).maybeSingle();
    if (dErr) return { success: false, error: dErr.message };
    if (!demand) return { success: false, error: "Demand not found." };

    const receipt = `RCP-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`;
    const { error } = await supabase.from("fee_payments").insert({
      institution_id: input.institutionId,
      student_id: demand.student_id,
      fee_structure_id: demand.fee_structure_id,
      demand_id: input.demandId,
      amount_paid: input.amount,
      payment_mode: input.mode,
      payment_status: "completed",
      receipt_number: receipt,
      paid_at: new Date().toISOString(),
      recorded_by: user.id,
      notes: input.notes?.trim() || null,
    });
    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId: input.institutionId, performedBy: user.id, tableName: "fee_payments",
      recordId: input.demandId, action: "INSERT",
      afterData: { demand_id: input.demandId, amount_paid: input.amount, payment_mode: input.mode, receipt },
      notes: "Payment recorded against fee demand",
    });

    revalidatePath(`/institutions/${input.institutionId}/finance/demands`);
    return { success: true, data: null };
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

    // paid for this student — by structure and by demand_id
    const { data: pays } = await supabase
      .from("fee_payments").select("fee_structure_id, demand_id, amount_paid").eq("student_id", student.id as string).eq("payment_status", "completed");
    const byStructure = new Map<string, number>();
    const byDemand = new Map<string, number>();
    for (const p of pays ?? []) {
      const amt = Number(p.amount_paid);
      if (p.fee_structure_id) byStructure.set(p.fee_structure_id as string, (byStructure.get(p.fee_structure_id as string) ?? 0) + amt);
      if (p.demand_id) byDemand.set(p.demand_id as string, (byDemand.get(p.demand_id as string) ?? 0) + amt);
    }
    return {
      success: true,
      data: rows.map((d) => ({ ...d, amount_paid: d.fee_structure_id ? (byStructure.get(d.fee_structure_id) ?? 0) : (byDemand.get(d.id) ?? 0) })),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
