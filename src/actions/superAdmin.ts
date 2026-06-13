"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

// ─────────────────────────────────────────────────────────────────────────────
// Phase 7A/7B — Super Admin cross-institution analytics.
//
// RLS scopes every table to the caller's institutions, so a platform-wide
// dashboard cannot be built on the cookie client. After verifying the caller
// holds a SUPER_ADMIN membership row (cookie client, RLS-checked), the
// aggregate queries below use createAdminClient() — service role, RLS bypass.
// This bypass is justified (Dev Rule 16): the data is read-only, aggregated
// across all institutions by design, and reachable only behind the
// SUPER_ADMIN gate enforced here AND in middleware AND in the /admin layout.
// ─────────────────────────────────────────────────────────────────────────────

export type PlatformTotals = {
  institutions: number;
  students: number;
  staff: number;
  /** Lifetime completed fee collections, INR. */
  revenue: number;
  /** Completed collections in the current calendar month (IST). */
  collectionsThisMonth: number;
  /** Completed collections in the previous calendar month (IST). */
  collectionsLastMonth: number;
  /** Distinct class sessions with attendance marked today (IST). */
  activeSessionsToday: number;
};

export type MonthPoint = {
  /** e.g. "Jul 25" — chart axis label */
  month: string;
  value: number;
};

export type InstitutionRow = {
  id: string;
  name: string;
  slug: string;
  collegeType: string | null;
  status: string;
  students: number;
  staff: number;
  revenue: number;
  /** ISO timestamp of the latest completed fee payment, null if none yet. */
  lastActivity: string | null;
  createdAt: string;
};

export type PlatformOverview = {
  totals: PlatformTotals;
  /** New institutions onboarded per month, last 12 months. */
  institutionGrowth: MonthPoint[];
  /** Completed fee collections per month, last 12 months. */
  revenueByMonth: MonthPoint[];
  institutions: InstitutionRow[];
};

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Midnight today in IST, as a UTC ISO string (platform operates on Asia/Kolkata). */
function istTodayStartISO(): string {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MS).toISOString();
}

/** First day of the IST month `offset` months before the current one, as UTC ISO. */
function istMonthStartISO(offset = 0): string {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  const d = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() - offset, 1));
  return new Date(d.getTime() - IST_OFFSET_MS).toISOString();
}

/** Bucket key ("2026-06") and axis label ("Jun 26") for a timestamp, in IST. */
function istMonthKey(iso: string): string {
  const ist = new Date(new Date(iso).getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The last `n` IST month buckets, oldest first: [{key:"2025-07", month:"Jul 25"}, …] */
function lastMonths(n: number): { key: string; month: string }[] {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  const out: { key: string; month: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    out.push({ key, month: `${MONTH_LABELS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}` });
  }
  return out;
}

/** Resolves to the caller's user id when they hold a SUPER_ADMIN membership, else null. */
async function requireSuperAdmin(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS lets members read their own membership rows, so the cookie client is
  // sufficient for this check — no service role needed yet.
  const { data: row } = await supabase
    .from("institution_members")
    .select("id")
    .eq("profile_id", user.id)
    .eq("role", "SUPER_ADMIN")
    .limit(1)
    .maybeSingle();

  return row ? user.id : null;
}

/**
 * Everything the /admin overview needs in one round trip.
 * Aggregation happens in TS over narrow column selects — at current platform
 * scale (thousands of rows) this is cheaper and simpler than shipping a
 * Postgres RPC, and keeps this step migration-free. Revisit via Arch A3 when
 * row counts demand it.
 */
export async function getPlatformOverview(): Promise<
  | { success: true; data: PlatformOverview }
  | { success: false; error: string }
> {
  const userId = await requireSuperAdmin();
  if (!userId) return { success: false, error: "Super admin access required." };

  // Service role: cross-institution read-only aggregates (see header comment).
  const admin = createAdminClient();
  const todayStart = istTodayStartISO();
  const thisMonthStart = istMonthStartISO(0);
  const lastMonthStart = istMonthStartISO(1);
  const yearAgoStart = istMonthStartISO(11);

  // .range() lifts PostgREST's silent 1000-row default cap. Generous ceilings
  // for now; Arch A3 moves these to SQL-side aggregation when scale demands.
  const [instRes, studentRes, staffRes, paymentRes, attendanceRes] = await Promise.all([
    admin.from("institutions").select("id, name, slug, college_type, status, created_at").range(0, 9_999),
    admin.from("students").select("institution_id").range(0, 99_999),
    admin.from("staff").select("institution_id").range(0, 99_999),
    // fee_payments still carries the legacy tenant_id column name
    admin
      .from("fee_payments")
      .select("tenant_id, amount_paid, paid_at, created_at")
      .eq("payment_status", "completed")
      .range(0, 99_999),
    admin.from("attendance").select("schedule_id").gte("created_at", todayStart).range(0, 99_999),
  ]);

  const firstError =
    instRes.error ?? studentRes.error ?? staffRes.error ?? paymentRes.error ?? attendanceRes.error;
  if (firstError) return { success: false, error: firstError.message };

  const institutions = instRes.data ?? [];
  const students = studentRes.data ?? [];
  const staff = staffRes.data ?? [];
  const payments = paymentRes.data ?? [];

  // ── Per-institution rollups ────────────────────────────────────────────────
  const studentCount = new Map<string, number>();
  for (const s of students) {
    if (s.institution_id) studentCount.set(s.institution_id, (studentCount.get(s.institution_id) ?? 0) + 1);
  }
  const staffCount = new Map<string, number>();
  for (const s of staff) {
    if (s.institution_id) staffCount.set(s.institution_id, (staffCount.get(s.institution_id) ?? 0) + 1);
  }

  const revenueByInst = new Map<string, number>();
  const lastPaymentByInst = new Map<string, string>();
  let revenue = 0;
  let collectionsThisMonth = 0;
  let collectionsLastMonth = 0;
  const revenueBuckets = new Map<string, number>();

  for (const p of payments) {
    const amount = Number(p.amount_paid) || 0;
    const when = p.paid_at ?? p.created_at;
    revenue += amount;
    if (p.tenant_id) {
      revenueByInst.set(p.tenant_id, (revenueByInst.get(p.tenant_id) ?? 0) + amount);
      const prev = lastPaymentByInst.get(p.tenant_id);
      if (!prev || when > prev) lastPaymentByInst.set(p.tenant_id, when);
    }
    if (when >= thisMonthStart) collectionsThisMonth += amount;
    else if (when >= lastMonthStart) collectionsLastMonth += amount;
    if (when >= yearAgoStart) {
      const key = istMonthKey(when);
      revenueBuckets.set(key, (revenueBuckets.get(key) ?? 0) + amount);
    }
  }

  // Distinct class sessions with attendance marked today
  const activeSessionsToday = new Set((attendanceRes.data ?? []).map((a) => a.schedule_id)).size;

  // ── Monthly series (last 12 months, zero-filled) ───────────────────────────
  const months = lastMonths(12);
  const instBuckets = new Map<string, number>();
  for (const inst of institutions) {
    const key = istMonthKey(inst.created_at);
    instBuckets.set(key, (instBuckets.get(key) ?? 0) + 1);
  }
  const institutionGrowth = months.map(({ key, month }) => ({ month, value: instBuckets.get(key) ?? 0 }));
  const revenueByMonth = months.map(({ key, month }) => ({ month, value: revenueBuckets.get(key) ?? 0 }));

  const institutionRows: InstitutionRow[] = institutions
    .map((inst) => ({
      id: inst.id,
      name: inst.name,
      slug: inst.slug,
      collegeType: inst.college_type,
      status: inst.status,
      students: studentCount.get(inst.id) ?? 0,
      staff: staffCount.get(inst.id) ?? 0,
      revenue: revenueByInst.get(inst.id) ?? 0,
      lastActivity: lastPaymentByInst.get(inst.id) ?? null,
      createdAt: inst.created_at,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.students - a.students);

  return {
    success: true,
    data: {
      totals: {
        institutions: institutions.length,
        students: students.length,
        staff: staff.length,
        revenue,
        collectionsThisMonth,
        collectionsLastMonth,
        activeSessionsToday,
      },
      institutionGrowth,
      revenueByMonth,
      institutions: institutionRows,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 7C — Per-institution drill down
// ─────────────────────────────────────────────────────────────────────────────

export type DeptBreakdownRow = {
  id: string;
  name: string;
  color: string | null;
  fundingType: string | null;
  students: number;
  staff: number;
};

export type AttendancePoint = {
  month: string;
  /** Attendance rate 0–100 (present + late count as attended), null = no marks that month. */
  rate: number | null;
};

export type RatioPoint = {
  month: string;
  revenue: number;
  payroll: number;
};

export type InstitutionAnalytics = {
  institution: {
    id: string;
    name: string;
    slug: string;
    collegeType: string | null;
    status: string;
    createdAt: string;
  };
  totals: {
    students: number;
    staff: number;
    departments: number;
    /** Lifetime completed collections. */
    revenue: number;
    /** Pending (uncollected) payment amount. */
    pending: number;
    /** completed / (completed + pending), 0–100; null when no payment data. */
    collectionRate: number | null;
    /** Lifetime processed payroll. */
    payroll: number;
    /** payroll / revenue, 0–100+; null when no revenue. */
    payrollRatio: number | null;
  };
  /** Students by year of study, e.g. [{label:"Year 1", value:120}, …]. */
  enrollmentByYear: { label: string; value: number }[];
  /** New student admissions per month, last 12 months. */
  admissionsByMonth: MonthPoint[];
  /** Attendance rate per month, last 6 months. */
  attendanceTrend: AttendancePoint[];
  /** Revenue vs payroll per month, last 12 months. */
  revenueVsPayroll: RatioPoint[];
  departments: DeptBreakdownRow[];
};

/**
 * Phase 7C — full analytics for one institution. Same gate + service-role
 * pattern as getPlatformOverview (see header comment for the Dev Rule 16
 * justification). Attendance is scoped to the institution through the
 * attendance → class_schedules → departments join (attendance itself has no
 * institution column), counted with head:true queries so no row caps apply.
 */
export async function getInstitutionAnalytics(institutionId: string): Promise<
  | { success: true; data: InstitutionAnalytics }
  | { success: false; error: string }
> {
  const userId = await requireSuperAdmin();
  if (!userId) return { success: false, error: "Super admin access required." };

  const admin = createAdminClient();

  const { data: inst, error: instError } = await admin
    .from("institutions")
    .select("id, name, slug, college_type, status, created_at")
    .eq("id", institutionId)
    .single();
  if (instError || !inst) return { success: false, error: instError?.message ?? "Institution not found." };

  const months12 = lastMonths(12);
  const months6 = lastMonths(6);

  // Month boundaries as UTC ISO, oldest→newest, plus one trailing edge ("now")
  const boundaries12 = months12.map((_, i) => istMonthStartISO(11 - i));
  const boundaries6 = months6.map((_, i) => istMonthStartISO(5 - i));
  const nowISO = new Date().toISOString();

  // Attendance rate per month: 2 head-count queries per month (total, attended),
  // filtered through the nested join — cheap COUNTs, no rows transferred.
  const attendanceCounts = Promise.all(
    months6.map(async (_, i) => {
      const from = boundaries6[i];
      const to = i + 1 < boundaries6.length ? boundaries6[i + 1] : nowISO;
      const base = () =>
        admin
          .from("attendance")
          .select("id, class_schedules!inner(departments!inner(institution_id))", { count: "exact", head: true })
          .eq("class_schedules.departments.institution_id", institutionId)
          .gte("created_at", from)
          .lt("created_at", to);
      const [totalRes, attendedRes] = await Promise.all([
        base(),
        base().in("status", ["present", "late"]),
      ]);
      return { total: totalRes.count ?? 0, attended: attendedRes.count ?? 0, error: totalRes.error ?? attendedRes.error };
    })
  );

  const [studentRes, staffCountRes, deptRes, paymentRes, payrollRes, attendanceByMonth] = await Promise.all([
    // One institution's students; .range lifts the 1000-row cap.
    // NB: the column is student_year — students.year does not exist.
    admin
      .from("students")
      .select("student_year, department_id, created_at")
      .eq("institution_id", institutionId)
      .range(0, 49_999),
    // Head count (department FK counts would miss staff with no department)
    admin
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("institution_id", institutionId),
    // Department breakdown with FK-embedded counts (server-side, cap-free)
    admin
      .from("departments")
      .select("id, name, color, funding_type, students!department_id(count), staff!department_id(count)")
      .eq("institution_id", institutionId),
    admin
      .from("fee_payments")
      .select("amount_paid, payment_status, paid_at, created_at")
      .eq("tenant_id", institutionId)
      .in("payment_status", ["completed", "pending"])
      .range(0, 99_999),
    admin
      .from("salary_disbursements")
      .select("amount_disbursed, disbursed_at, created_at")
      .eq("tenant_id", institutionId)
      .eq("status", "processed")
      .range(0, 99_999),
    attendanceCounts,
  ]);

  const firstError = studentRes.error ?? staffCountRes.error ?? deptRes.error ?? paymentRes.error
    ?? payrollRes.error ?? attendanceByMonth.find((m) => m.error)?.error ?? null;
  if (firstError) return { success: false, error: firstError.message };

  const students = studentRes.data ?? [];
  const payments = paymentRes.data ?? [];
  const payroll = payrollRes.data ?? [];

  // ── Enrollment ─────────────────────────────────────────────────────────────
  const byYear = new Map<string, number>();
  for (const s of students) {
    const label = s.student_year != null && `${s.student_year}`.trim() !== "" ? `Year ${s.student_year}` : "Unassigned";
    byYear.set(label, (byYear.get(label) ?? 0) + 1);
  }
  const enrollmentByYear = [...byYear.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  const admissionBuckets = new Map<string, number>();
  for (const s of students) {
    const key = istMonthKey(s.created_at);
    admissionBuckets.set(key, (admissionBuckets.get(key) ?? 0) + 1);
  }
  const admissionsByMonth = months12.map(({ key, month }) => ({ month, value: admissionBuckets.get(key) ?? 0 }));

  // ── Finance ────────────────────────────────────────────────────────────────
  let revenue = 0;
  let pending = 0;
  const revBuckets = new Map<string, number>();
  for (const p of payments) {
    const amount = Number(p.amount_paid) || 0;
    if (p.payment_status === "completed") {
      revenue += amount;
      revBuckets.set(istMonthKey(p.paid_at ?? p.created_at), (revBuckets.get(istMonthKey(p.paid_at ?? p.created_at)) ?? 0) + amount);
    } else {
      pending += amount;
    }
  }

  let payrollTotal = 0;
  const payrollBuckets = new Map<string, number>();
  for (const d of payroll) {
    const amount = Number(d.amount_disbursed) || 0;
    payrollTotal += amount;
    const key = istMonthKey(d.disbursed_at ?? d.created_at);
    payrollBuckets.set(key, (payrollBuckets.get(key) ?? 0) + amount);
  }

  const revenueVsPayroll = months12.map(({ key, month }) => ({
    month,
    revenue: revBuckets.get(key) ?? 0,
    payroll: payrollBuckets.get(key) ?? 0,
  }));

  // ── Attendance trend ───────────────────────────────────────────────────────
  const attendanceTrend = months6.map(({ month }, i) => {
    const { total, attended } = attendanceByMonth[i];
    return { month, rate: total > 0 ? Math.round((attended / total) * 1000) / 10 : null };
  });

  // ── Departments ────────────────────────────────────────────────────────────
  type DeptRow = {
    id: string; name: string; color: string | null; funding_type: string | null;
    students: { count: number }[] | null; staff: { count: number }[] | null;
  };
  const departments: DeptBreakdownRow[] = ((deptRes.data ?? []) as DeptRow[])
    .map((d) => ({
      id: d.id,
      name: d.name,
      color: d.color,
      fundingType: d.funding_type,
      students: d.students?.[0]?.count ?? 0,
      staff: d.staff?.[0]?.count ?? 0,
    }))
    .sort((a, b) => b.students - a.students);

  return {
    success: true,
    data: {
      institution: {
        id: inst.id,
        name: inst.name,
        slug: inst.slug,
        collegeType: inst.college_type,
        status: inst.status,
        createdAt: inst.created_at,
      },
      totals: {
        students: students.length,
        staff: staffCountRes.count ?? 0,
        departments: departments.length,
        revenue,
        pending,
        collectionRate: revenue + pending > 0 ? Math.round((revenue / (revenue + pending)) * 1000) / 10 : null,
        payroll: payrollTotal,
        payrollRatio: revenue > 0 ? Math.round((payrollTotal / revenue) * 1000) / 10 : null,
      },
      enrollmentByYear,
      admissionsByMonth,
      attendanceTrend,
      revenueVsPayroll,
      departments,
    },
  };
}

/**
 * Lightweight re-count used by the realtime "Active Sessions Today" card —
 * called whenever a new attendance row arrives over the realtime channel.
 */
export async function getActiveSessionsToday(): Promise<
  | { success: true; data: number }
  | { success: false; error: string }
> {
  const userId = await requireSuperAdmin();
  if (!userId) return { success: false, error: "Super admin access required." };

  // Service role: same justified cross-institution read as getPlatformOverview.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("attendance")
    .select("schedule_id")
    .gte("created_at", istTodayStartISO());

  if (error) return { success: false, error: error.message };
  return { success: true, data: new Set((data ?? []).map((a) => a.schedule_id)).size };
}
