"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/auditLog";

export type ConcessionType =
  | "staff_ward"
  | "management_quota"
  | "merit"
  | "hardship"
  | "sports_quota"
  | "other";

export interface FeeConcession {
  id: string;
  institution_id: string;
  student_id: string;
  academic_year_id: string | null;
  concession_type: ConcessionType;
  amount: number | null;
  percentage: number | null;
  applicable_to: string | null;
  reason: string;
  approved_by: string | null;
  status: "pending" | "approved" | "rejected";
  approved_at: string | null;
  created_at: string;
}

export async function grantConcession(payload: {
  institution_id: string;
  student_id: string;
  academic_year_id: string;
  concession_type: ConcessionType;
  amount: number | null;
  percentage: number | null;
  applicable_to: string | null;
  reason: string;
}) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Validate inputs
    if (payload.amount !== null && payload.percentage !== null) {
      return { success: false as const, error: "Cannot specify both amount and percentage." };
    }
    if (payload.amount === null && payload.percentage === null) {
      return { success: false as const, error: "Must specify either amount or percentage." };
    }

    const { data, error } = await supabase
      .from("fee_concessions")
      .insert([
        {
          institution_id: payload.institution_id,
          student_id: payload.student_id,
          academic_year_id: payload.academic_year_id,
          concession_type: payload.concession_type,
          amount: payload.amount,
          percentage: payload.percentage,
          applicable_to: payload.applicable_to,
          reason: payload.reason,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    const { data: { user } } = await supabase.auth.getUser();
    await logAudit({
      institutionId: payload.institution_id,
      performedBy: user?.id ?? null,
      tableName: "fee_concessions",
      recordId: (data as FeeConcession).id,
      action: "INSERT",
      afterData: {
        student_id: payload.student_id,
        concession_type: payload.concession_type,
        amount: payload.amount,
        percentage: payload.percentage,
        status: "pending",
      },
      notes: `Concession granted: ${payload.reason}`,
    });

    revalidatePath(`/institutions/${payload.institution_id}/finance/concessions`);
    return { success: true as const, data: data as FeeConcession };
  } catch (err) {
    return { success: false as const, error: (err instanceof Error ? err.message : "") || "Failed to grant concession" };
  }
}

export async function approveConcession(id: string, institutionId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: before } = await supabase
      .from("fee_concessions")
      .select("status, approved_by, amount, percentage, student_id")
      .eq("id", id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("fee_concessions")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await logAudit({
      institutionId,
      performedBy: user.id,
      tableName: "fee_concessions",
      recordId: id,
      action: "UPDATE",
      beforeData: before ?? null,
      afterData: { status: "approved", approved_by: user.id },
      notes: "Concession approved",
    });

    revalidatePath(`/institutions/${institutionId}/finance/concessions`);
    return { success: true as const, data: data as FeeConcession };
  } catch (err) {
    return { success: false as const, error: (err instanceof Error ? err.message : "") || "Failed to approve concession" };
  }
}

export async function rejectConcession(id: string, institutionId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: before } = await supabase
      .from("fee_concessions")
      .select("status, approved_by, amount, percentage, student_id")
      .eq("id", id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("fee_concessions")
      .update({
        status: "rejected",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await logAudit({
      institutionId,
      performedBy: user.id,
      tableName: "fee_concessions",
      recordId: id,
      action: "UPDATE",
      beforeData: before ?? null,
      afterData: { status: "rejected", approved_by: user.id },
      notes: "Concession rejected",
    });

    revalidatePath(`/institutions/${institutionId}/finance/concessions`);
    return { success: true as const, data: data as FeeConcession };
  } catch (err) {
    return { success: false as const, error: (err instanceof Error ? err.message : "") || "Failed to reject concession" };
  }
}

export async function getConcessionsByStudent(studentId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("fee_concessions")
      .select(`
        *,
        academic_year:academic_years(label)
      `)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true as const, data };
  } catch (err) {
    return { success: false as const, error: (err instanceof Error ? err.message : "") || "Failed to fetch concessions for student" };
  }
}

export async function getConcessionsByInstitution(institutionId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("fee_concessions")
      .select(`
        *,
        student:students(id, full_name, roll_no),
        academic_year:academic_years(label)
      `)
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true as const, data };
  } catch (err) {
    return { success: false as const, error: (err instanceof Error ? err.message : "") || "Failed to fetch concessions" };
  }
}
