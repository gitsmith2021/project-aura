"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { SSR_CRITERIA, type SSRCriterion, type SSREvidenceSource } from "@/lib/ssrRegistry";

// ─────────────────────────────────────────────────────────────────────────────
// Phase 7F-sub — NAAC SSR Builder: evidence aggregation & completeness.
//
// Counts evidence rows per registry source with head-only COUNT queries (no
// rows transferred, no PostgREST row caps). Uses the caller's cookie client —
// RLS already scopes every table to the caller's institutions, so this needs
// no service role and is safe for INST_ADMIN / HOD users.
//
// Completeness definition (shown verbatim in the UI):
//   criterion completeness = live sources with ≥1 evidence row
//                          ÷ ALL mapped sources (pending modules included).
// Pending modules count against readiness on purpose — NAAC will ask for
// that evidence whether or not Aura has shipped the module yet.
// ─────────────────────────────────────────────────────────────────────────────

export type SSREvidenceCount = SSREvidenceSource & {
  /** null for pending sources (nothing to count yet) or when the count failed. */
  count: number | null;
  /** Set when a live source's count query failed — surfaced in the UI. */
  countError?: string;
};

export type SSRCriterionReport = Omit<SSRCriterion, "sources"> & {
  sources: SSREvidenceCount[];
  liveWithData: number;
  liveEmpty: number;
  pendingModules: number;
  /** 0–100, per the definition above. */
  completeness: number;
};

export type SSRReport = {
  criteria: SSRCriterionReport[];
  /** 0–100 across all criteria (same definition, all sources pooled). */
  overallCompleteness: number;
  generatedAt: string;
};

export async function aggregateSSRData(institutionId: string): Promise<
  | { success: true; data: SSRReport }
  | { success: false; error: string }
> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Guard: only members of this institution get a report (RLS would return
    // zeros rather than erroring, which would read as "0% ready" — misleading).
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };
    const { data: membership } = await supabase
      .from("institution_members")
      .select("id")
      .eq("profile_id", user.id)
      .or(`institution_id.eq.${institutionId},role.eq.SUPER_ADMIN`)
      .limit(1)
      .maybeSingle();
    if (!membership) return { success: false, error: "You are not a member of this institution." };

    // One broken source must never sink the whole readiness report — a count
    // failure is reported on that row (count null + countError) and the rest
    // of the criteria still render.
    const countSource = async (
      source: SSREvidenceSource
    ): Promise<{ count: number | null; countError?: string }> => {
      if (source.status !== "live" || !source.table || !source.column) return { count: null };
      try {
        if (source.column === "join:attendance") {
          const { count, error } = await supabase
            .from("attendance")
            .select("id, class_schedules!inner(departments!inner(institution_id))", { count: "exact", head: true })
            .eq("class_schedules.departments.institution_id", institutionId);
          if (error) return { count: null, countError: error.message };
          return { count: count ?? 0 };
        }
        const { count, error } = await supabase
          .from(source.table)
          .select("*", { count: "exact", head: true })
          .eq(source.column, institutionId);
        if (error) return { count: null, countError: error.message };
        return { count: count ?? 0 };
      } catch (e) {
        return { count: null, countError: e instanceof Error ? e.message : String(e) };
      }
    };

    const criteria: SSRCriterionReport[] = await Promise.all(
      SSR_CRITERIA.map(async (criterion) => {
        const sources: SSREvidenceCount[] = await Promise.all(
          criterion.sources.map(async (source) => ({ ...source, ...(await countSource(source)) }))
        );
        const liveWithData = sources.filter((s) => s.status === "live" && (s.count ?? 0) > 0).length;
        const liveEmpty = sources.filter((s) => s.status === "live" && !s.countError && (s.count ?? 0) === 0).length;
        const pendingModules = sources.filter((s) => s.status === "pending").length;
        return {
          number: criterion.number,
          title: criterion.title,
          description: criterion.description,
          sources,
          liveWithData,
          liveEmpty,
          pendingModules,
          completeness: sources.length > 0 ? Math.round((liveWithData / sources.length) * 100) : 0,
        };
      })
    );

    const allSources = criteria.reduce((sum, c) => sum + c.sources.length, 0);
    const allWithData = criteria.reduce((sum, c) => sum + c.liveWithData, 0);

    return {
      success: true,
      data: {
        criteria,
        overallCompleteness: allSources > 0 ? Math.round((allWithData / allSources) * 100) : 0,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export data: AISHE annual return & NIRF extract (roadmap 7F field mapping).
// Both return plain row data; the client renders it into a multi-sheet
// workbook via src/lib/excelXml.ts. Pending-module fields are reported as
// "Module pending (Phase X)" rather than zeros — an AISHE return must never
// silently claim 0 library volumes because the library module isn't built.
// ─────────────────────────────────────────────────────────────────────────────

type LabeledCount = { label: string; count: number };

export type AISHEData = {
  institutionName: string;
  students: {
    total: number;
    byGender: LabeledCount[];
    byCategory: LabeledCount[];
    pwd: number;
    byProgramme: LabeledCount[];
    byYear: LabeledCount[];
    notRecorded: { gender: number; category: number };
  };
  staff: {
    teachingTotal: number;
    byGender: LabeledCount[];
    byQualification: LabeledCount[];
    genderNotRecorded: number;
  };
  finance: {
    incomeFees: number;
    expenditureSalary: number;
    expenditureOther: number;
  };
  pendingFields: { field: string; phase: string }[];
  generatedAt: string;
};

const tally = (values: (string | null | undefined)[], fallback: string): LabeledCount[] => {
  const map = new Map<string, number>();
  for (const v of values) {
    const key = v && v.trim() !== "" ? v : fallback;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
};

export async function getAISHEData(institutionId: string): Promise<
  | { success: true; data: AISHEData }
  | { success: false; error: string }
> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const [instRes, studentRes, staffRes, feeRes, salaryRes, expenseRes] = await Promise.all([
      supabase.from("institutions").select("name").eq("id", institutionId).single(),
      supabase
        .from("students")
        .select("gender, category, is_pwd, programme, student_year")
        .eq("institution_id", institutionId)
        .range(0, 49_999),
      supabase
        .from("staff")
        .select("gender, qualification")
        .eq("institution_id", institutionId)
        .range(0, 49_999),
      supabase
        .from("fee_payments")
        .select("amount_paid")
        .eq("institution_id", institutionId)
        .eq("payment_status", "completed")
        .range(0, 99_999),
      supabase
        .from("salary_disbursements")
        .select("amount_disbursed")
        .eq("institution_id", institutionId)
        .eq("status", "processed")
        .range(0, 99_999),
      supabase
        .from("expenses")
        .select("amount")
        .eq("institution_id", institutionId)
        .range(0, 99_999),
    ]);

    const firstError = instRes.error ?? studentRes.error ?? staffRes.error ?? feeRes.error ?? salaryRes.error ?? expenseRes.error;
    if (firstError) return { success: false, error: firstError.message };

    const students = studentRes.data ?? [];
    const staff = staffRes.data ?? [];

    return {
      success: true,
      data: {
        institutionName: instRes.data?.name ?? "",
        students: {
          total: students.length,
          byGender: tally(students.map((s) => s.gender), "Not recorded"),
          byCategory: tally(students.map((s) => s.category), "Not recorded"),
          pwd: students.filter((s) => s.is_pwd === true).length,
          byProgramme: tally(students.map((s) => s.programme), "Not recorded"),
          byYear: tally(students.map((s) => (s.student_year != null ? `Year ${s.student_year}` : null)), "Not recorded"),
          notRecorded: {
            gender: students.filter((s) => !s.gender).length,
            category: students.filter((s) => !s.category).length,
          },
        },
        staff: {
          teachingTotal: staff.length,
          byGender: tally(staff.map((s) => s.gender), "Not recorded"),
          byQualification: tally(staff.map((s) => s.qualification), "Not recorded"),
          genderNotRecorded: staff.filter((s) => !s.gender).length,
        },
        finance: {
          incomeFees: (feeRes.data ?? []).reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0),
          expenditureSalary: (salaryRes.data ?? []).reduce((sum, r) => sum + (Number(r.amount_disbursed) || 0), 0),
          expenditureOther: (expenseRes.data ?? []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
        },
        pendingFields: [
          { field: "Non-teaching staff (by gender)", phase: "Phase 5C — Non-Teaching Staff & Payroll" },
          { field: "Number of classrooms / labs", phase: "Phase 4D/4E — Labs, Assets & Inventory" },
          { field: "Library volumes", phase: "Phase 4A — Library Management System" },
          { field: "Hostel intake & occupancy", phase: "Phase 4C — Hostel Management" },
        ],
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export type NIRFData = {
  institutionName: string;
  teachingLearning: {
    students: number;
    teachingStaff: number;
    /** students per teacher, 1dp; null when no staff. */
    facultyStudentRatio: number | null;
  };
  graduationOutcome: {
    promotionEvents: number;
    examResults: number;
    arrears: number;
  };
  outreach: {
    internships: number;
    guestLectures: number;
    /** female share of students, 0–100; null when gender unrecorded. */
    womenEnrollmentPct: number | null;
  };
  pendingParameters: { parameter: string; phase: string }[];
  generatedAt: string;
};

export async function getNIRFData(institutionId: string): Promise<
  | { success: true; data: NIRFData }
  | { success: false; error: string }
> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const count = async (table: string, column: string, extra?: (q: any) => any) => {
      let q = supabase.from(table).select("*", { count: "exact", head: true }).eq(column, institutionId);
      if (extra) q = extra(q);
      const { count: n, error } = await q;
      if (error) throw new Error(`${table}: ${error.message}`);
      return n ?? 0;
    };

    const [instRes, studentsTotal, genderRows, staffTotal, promotions, results, arrears, internships, lectures] =
      await Promise.all([
        supabase.from("institutions").select("name").eq("id", institutionId).single(),
        count("students", "institution_id"),
        supabase.from("students").select("gender").eq("institution_id", institutionId).range(0, 49_999),
        count("staff", "institution_id"),
        count("promotion_logs", "institution_id"),
        count("exam_results", "institution_id"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        count("exam_results", "institution_id", (q: any) => q.eq("is_arrear", true)),
        count("internships", "institution_id"),
        count("guest_lectures", "institution_id"),
      ]);

    if (instRes.error) return { success: false, error: instRes.error.message };
    if (genderRows.error) return { success: false, error: genderRows.error.message };

    const genders = (genderRows.data ?? []).map((r) => r.gender).filter((g): g is string => !!g);
    const women = genders.filter((g) => g === "female").length;

    return {
      success: true,
      data: {
        institutionName: instRes.data?.name ?? "",
        teachingLearning: {
          students: studentsTotal,
          teachingStaff: staffTotal,
          facultyStudentRatio: staffTotal > 0 ? Math.round((studentsTotal / staffTotal) * 10) / 10 : null,
        },
        graduationOutcome: {
          promotionEvents: promotions,
          examResults: results,
          arrears,
        },
        outreach: {
          internships,
          guestLectures: lectures,
          womenEnrollmentPct: genders.length > 0 ? Math.round((women / genders.length) * 1000) / 10 : null,
        },
        pendingParameters: [
          { parameter: "Research & Professional Practice (RP)", phase: "Phase 5I — Research & Publications" },
          { parameter: "Placement & Higher Studies (GO-Placement)", phase: "Phase 5F — Placement Cell" },
          { parameter: "Perception (PR)", phase: "External survey — outside Aura scope" },
        ],
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
