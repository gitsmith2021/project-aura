"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";

type Result<T> = { success: true; data: T } | { success: false; error: string };

// ── Shared types ──────────────────────────────────────────────────────────────

export type MedicalRecord = {
  id: string;
  institution_id: string;
  student_id: string;
  blood_group: string | null;
  known_allergies: string | null;
  chronic_conditions: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  insurance_policy: string | null;
  updated_at: string;
  student?: { id: string; full_name: string; roll_no: string | null; email: string };
};

export type MedicalVisit = {
  id: string;
  institution_id: string;
  patient_id: string;
  patient_type: "student" | "staff";
  visit_date: string;
  symptoms: string;
  diagnosis: string | null;
  treatment_given: string | null;
  medicines_dispensed: Array<{ name: string; dosage: string; quantity: string }> | null;
  referred_to: string | null;
  follow_up_date: string | null;
  attended_by: string | null;
  created_at: string;
  // enriched fields
  patient_name: string | null;
  roll_no: string | null;
};

export type InfirmaryPatientOption = {
  id: string;           // students.id or staff.id
  profileId: string;    // auth.users id
  name: string;
  type: "student" | "staff";
  rollNo?: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function enrichVisits(supabase: any, visits: MedicalVisit[]): Promise<MedicalVisit[]> {
  if (!visits.length) return [];
  const ids = [...new Set(visits.map((v) => v.patient_id))];
  const [{ data: studs }, { data: staffList }] = await Promise.all([
    supabase.from("students").select("profile_id, full_name, roll_no").in("profile_id", ids),
    supabase.from("staff").select("profile_id, full_name").in("profile_id", ids),
  ]);
  return visits.map((v) => ({
    ...v,
    patient_name:
      studs?.find((s: { profile_id: string; full_name: string }) => s.profile_id === v.patient_id)?.full_name ??
      staffList?.find((s: { profile_id: string; full_name: string }) => s.profile_id === v.patient_id)?.full_name ??
      null,
    roll_no:
      studs?.find((s: { profile_id: string; roll_no: string | null }) => s.profile_id === v.patient_id)?.roll_no ?? null,
  }));
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Today's visits for the infirmary dashboard. */
export async function getTodaysVisits(institutionId: string): Promise<Result<MedicalVisit[]>> {
  try {
    const supabase = createClient(await cookies());
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("medical_visits")
      .select("*")
      .eq("institution_id", institutionId)
      .gte("visit_date", `${today}T00:00:00`)
      .lte("visit_date", `${today}T23:59:59`)
      .order("visit_date", { ascending: false });

    if (error) return { success: false, error: error.message };
    const enriched = await enrichVisits(supabase, (data ?? []) as unknown as MedicalVisit[]);
    return { success: true, data: enriched };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load visits." };
  }
}

/** Paginated visit history with optional free-text search on symptoms/diagnosis. */
export async function getVisitHistory(
  institutionId: string,
  opts: { search?: string; limit?: number } = {}
): Promise<Result<MedicalVisit[]>> {
  try {
    const supabase = createClient(await cookies());
    const { search, limit = 60 } = opts;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from("medical_visits")
      .select("*")
      .eq("institution_id", institutionId)
      .order("visit_date", { ascending: false })
      .limit(limit);

    if (search?.trim()) {
      q = q.or(`symptoms.ilike.%${search.trim()}%,diagnosis.ilike.%${search.trim()}%,attended_by.ilike.%${search.trim()}%`);
    }

    const { data, error } = await q;
    if (error) return { success: false, error: error.message };
    const enriched = await enrichVisits(supabase, (data ?? []) as unknown as MedicalVisit[]);
    return { success: true, data: enriched };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load history." };
  }
}

/** Visits with a pending/overdue follow-up (for the dashboard alert list). */
export async function getPendingFollowUps(institutionId: string): Promise<Result<MedicalVisit[]>> {
  try {
    const supabase = createClient(await cookies());
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("medical_visits")
      .select("*")
      .eq("institution_id", institutionId)
      .lte("follow_up_date", today)
      .not("follow_up_date", "is", null)
      .order("follow_up_date", { ascending: true })
      .limit(20);

    if (error) return { success: false, error: error.message };
    const enriched = await enrichVisits(supabase, (data ?? []) as unknown as MedicalVisit[]);
    return { success: true, data: enriched };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load follow-ups." };
  }
}

/** All student medical profiles for the Records page. */
export async function getMedicalRecords(institutionId: string): Promise<Result<MedicalRecord[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("medical_records")
      .select("*, student:students(id, full_name, roll_no, email)")
      .eq("institution_id", institutionId)
      .order("updated_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as MedicalRecord[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load records." };
  }
}

/** Single student's medical profile. */
export async function getMedicalRecord(
  institutionId: string,
  studentId: string
): Promise<Result<MedicalRecord | null>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("medical_records")
      .select("*, student:students(id, full_name, roll_no, email)")
      .eq("institution_id", institutionId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as MedicalRecord | null) ?? null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load record." };
  }
}

/** Search students + staff for the visit-logging drawer patient picker. */
export async function searchPatientsForInfirmary(
  institutionId: string,
  query: string
): Promise<Result<InfirmaryPatientOption[]>> {
  try {
    if (!query.trim()) return { success: true, data: [] };
    const supabase = createClient(await cookies());
    const q = `%${query.trim()}%`;
    const [{ data: studs }, { data: staffList }] = await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, roll_no, profile_id")
        .eq("institution_id", institutionId)
        .or(`full_name.ilike.${q},roll_no.ilike.${q}`)
        .limit(10),
      supabase
        .from("staff")
        .select("id, full_name, profile_id")
        .eq("institution_id", institutionId)
        .ilike("full_name", q)
        .limit(5),
    ]);

    const results: InfirmaryPatientOption[] = [
      ...(studs ?? []).map((s: { id: string; full_name: string; roll_no: string | null; profile_id: string }) => ({
        id: s.id,
        profileId: s.profile_id,
        name: s.full_name,
        type: "student" as const,
        rollNo: s.roll_no,
      })),
      ...(staffList ?? []).map((s: { id: string; full_name: string; profile_id: string }) => ({
        id: s.id,
        profileId: s.profile_id,
        name: s.full_name,
        type: "staff" as const,
      })),
    ];

    return { success: true, data: results };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Search failed." };
  }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export type LogVisitPayload = {
  institutionId: string;
  patientId: string;          // auth.users id (profile_id)
  patientType: "student" | "staff";
  symptoms: string;
  diagnosis?: string;
  treatmentGiven?: string;
  medicinesDispensed?: Array<{ name: string; dosage: string; quantity: string }>;
  referredTo?: string;
  followUpDate?: string;      // ISO date string YYYY-MM-DD
  attendedBy?: string;
};

export async function logVisit(payload: LogVisitPayload): Promise<Result<{ visitId: string }>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data, error } = await supabase
      .from("medical_visits")
      .insert({
        institution_id: payload.institutionId,
        patient_id: payload.patientId,
        patient_type: payload.patientType,
        symptoms: payload.symptoms.trim(),
        diagnosis: payload.diagnosis?.trim() || null,
        treatment_given: payload.treatmentGiven?.trim() || null,
        medicines_dispensed: payload.medicinesDispensed?.length ? payload.medicinesDispensed : null,
        referred_to: payload.referredTo?.trim() || null,
        follow_up_date: payload.followUpDate || null,
        attended_by: payload.attendedBy?.trim() || null,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId: payload.institutionId,
      performedBy: user.id,
      tableName: "medical_visits",
      recordId: data.id,
      action: "INSERT",
    });

    revalidatePath(`/institutions/${payload.institutionId}/infirmary`);
    return { success: true, data: { visitId: data.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to log visit." };
  }
}

export type UpsertMedicalRecordPayload = {
  institutionId: string;
  studentId: string;
  bloodGroup?: string;
  knownAllergies?: string;
  chronicConditions?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  insurancePolicy?: string;
};

export async function upsertMedicalRecord(
  payload: UpsertMedicalRecordPayload
): Promise<Result<{ id: string }>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data, error } = await supabase
      .from("medical_records")
      .upsert(
        {
          institution_id: payload.institutionId,
          student_id: payload.studentId,
          blood_group: payload.bloodGroup || null,
          known_allergies: payload.knownAllergies?.trim() || null,
          chronic_conditions: payload.chronicConditions?.trim() || null,
          emergency_contact_name: payload.emergencyContactName?.trim() || null,
          emergency_contact_phone: payload.emergencyContactPhone?.trim() || null,
          insurance_policy: payload.insurancePolicy?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id" }
      )
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId: payload.institutionId,
      performedBy: user.id,
      tableName: "medical_records",
      recordId: data.id,
      action: "UPDATE",
    });

    revalidatePath(`/institutions/${payload.institutionId}/infirmary/records`);
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save record." };
  }
}

// ── Student Portal ────────────────────────────────────────────────────────────

/** Student's own medical profile — no institutionId needed; RLS enforces ownership. */
export async function getMyMedicalRecord(): Promise<Result<MedicalRecord | null>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!student) return { success: true, data: null };

    const { data, error } = await supabase
      .from("medical_records")
      .select("*")
      .eq("student_id", student.id)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as MedicalRecord | null) ?? null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load record." };
  }
}

/** Student's own visit history — RLS: patient_id = auth.uid(). */
export async function getMyVisitHistory(): Promise<Result<MedicalVisit[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data, error } = await supabase
      .from("medical_visits")
      .select("*")
      .eq("patient_id", user.id)
      .order("visit_date", { ascending: false })
      .limit(20);

    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: (data ?? []).map((v) => ({
        ...v,
        patient_name: null,
        roll_no: null,
      })) as MedicalVisit[],
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load history." };
  }
}
