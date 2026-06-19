"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
// Dev Rule 16: billing aggregates span ALL institutions (MRR/ARR, every
// subscription + invoice), which RLS scopes away from a single tenant. After
// the SUPER_ADMIN gate below, cross-institution reads use the service role.
import { createAdminClient } from "@/utils/supabase/admin";
import {
  mrr, arr, planMonthlyEquivalent, effectiveStatus, invoiceNumber, withinLimits,
  type BillingCycle, type SubStatus, type FeatureKey,
} from "@/lib/subscriptions";

type Result<T> = { success: true; data: T } | { success: false; error: string };

async function db() {
  return createClient(await cookies());
}

async function requireSuperAdmin(): Promise<boolean> {
  const supabase = await db();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("institution_members").select("id").eq("profile_id", user.id).eq("role", "SUPER_ADMIN").limit(1).maybeSingle();
  return !!data;
}

// ── Plans ─────────────────────────────────────────────────────────────────────

export type PlanRow = {
  id: string; name: string; priceMonthly: number; priceAnnual: number | null;
  maxStudents: number | null; maxStaff: number | null; features: FeatureKey[]; isActive: boolean; sortOrder: number;
};

export async function getPlans(): Promise<Result<PlanRow[]>> {
  try {
    const supabase = await db();
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("id, name, price_monthly, price_annual, max_students, max_staff, features, is_active, sort_order")
      .order("sort_order");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []).map(mapPlan) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

function mapPlan(p: Record<string, unknown>): PlanRow {
  return {
    id: p.id as string, name: p.name as string,
    priceMonthly: Number(p.price_monthly), priceAnnual: p.price_annual !== null ? Number(p.price_annual) : null,
    maxStudents: (p.max_students as number | null) ?? null, maxStaff: (p.max_staff as number | null) ?? null,
    features: (Array.isArray(p.features) ? p.features : []) as FeatureKey[],
    isActive: !!p.is_active, sortOrder: (p.sort_order as number) ?? 0,
  };
}

export async function savePlan(input: {
  id?: string | null; name: string; priceMonthly: number; priceAnnual: number | null;
  maxStudents: number | null; maxStaff: number | null; features: FeatureKey[]; isActive: boolean; sortOrder: number;
}): Promise<Result<{ id: string }>> {
  try {
    if (!(await requireSuperAdmin())) return { success: false, error: "Not authorised." };
    if (!input.name.trim()) return { success: false, error: "Plan name is required." };
    const supabase = await db();
    const payload = {
      name: input.name.trim(), price_monthly: input.priceMonthly, price_annual: input.priceAnnual,
      max_students: input.maxStudents, max_staff: input.maxStaff, features: input.features,
      is_active: input.isActive, sort_order: input.sortOrder,
    };
    if (input.id) {
      const { error } = await supabase.from("subscription_plans").update(payload).eq("id", input.id);
      if (error) return { success: false, error: error.message };
      revalidatePath("/admin/billing/plans");
      return { success: true, data: { id: input.id } };
    }
    const { data, error } = await supabase.from("subscription_plans").insert(payload).select("id").single();
    if (error) {
      if (error.code === "23505") return { success: false, error: "A plan with this name already exists." };
      return { success: false, error: error.message };
    }
    revalidatePath("/admin/billing/plans");
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function togglePlanActive(input: { id: string; isActive: boolean }): Promise<Result<null>> {
  try {
    if (!(await requireSuperAdmin())) return { success: false, error: "Not authorised." };
    const supabase = await db();
    const { error } = await supabase.from("subscription_plans").update({ is_active: input.isActive }).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/billing/plans");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export type SubscriptionRow = {
  institutionId: string; institutionName: string; slug: string;
  planId: string | null; planName: string | null; billingCycle: BillingCycle | null;
  status: SubStatus | "none"; expiresAt: string | null; monthlyValue: number;
  students: number; staff: number; studentsOver: boolean; staffOver: boolean;
};
export type BillingSummary = { mrr: number; arr: number; active: number; trial: number; expired: number; unsubscribed: number; institutions: number };

export async function getBilling(): Promise<Result<{ rows: SubscriptionRow[]; summary: BillingSummary }>> {
  try {
    if (!(await requireSuperAdmin())) return { success: false, error: "Not authorised." };
    const admin = createAdminClient();
    const now = new Date();

    const [{ data: insts }, { data: subs }, { data: students }, { data: staff }] = await Promise.all([
      admin.from("institutions").select("id, name, slug"),
      admin.from("institution_subscriptions").select("institution_id, plan_id, billing_cycle, status, expires_at, subscription_plans(name, price_monthly, price_annual, max_students, max_staff)"),
      admin.from("students").select("institution_id").eq("is_active", true),
      admin.from("staff").select("institution_id").eq("is_active", true),
    ]);

    const studentCount = new Map<string, number>();
    for (const s of students ?? []) studentCount.set(s.institution_id as string, (studentCount.get(s.institution_id as string) ?? 0) + 1);
    const staffCount = new Map<string, number>();
    for (const s of staff ?? []) staffCount.set(s.institution_id as string, (staffCount.get(s.institution_id as string) ?? 0) + 1);

    const subByInst = new Map<string, Record<string, unknown>>();
    for (const s of subs ?? []) subByInst.set(s.institution_id as string, s);

    const rows: SubscriptionRow[] = (insts ?? []).map((i) => {
      const sub = subByInst.get(i.id as string);
      const plan = sub?.subscription_plans as { name: string; price_monthly: number; price_annual: number | null; max_students: number | null; max_staff: number | null } | null;
      const cycle = (sub?.billing_cycle as BillingCycle | undefined) ?? null;
      const status = sub ? effectiveStatus(sub.status as SubStatus, (sub.expires_at as string | null) ?? null, now) : "none";
      const students = studentCount.get(i.id as string) ?? 0;
      const staffN = staffCount.get(i.id as string) ?? 0;
      const lim = plan ? withinLimits({ max_students: plan.max_students, max_staff: plan.max_staff }, students, staffN) : { studentsOver: false, staffOver: false };
      return {
        institutionId: i.id as string, institutionName: i.name as string, slug: (i.slug as string) ?? (i.id as string),
        planId: (sub?.plan_id as string | null) ?? null, planName: plan?.name ?? null, billingCycle: cycle,
        status, expiresAt: (sub?.expires_at as string | null) ?? null,
        monthlyValue: plan && cycle && status === "active" ? planMonthlyEquivalent(plan, cycle) : 0,
        students, staff: staffN, studentsOver: lim.studentsOver, staffOver: lim.staffOver,
      };
    });

    const subLikes = (subs ?? []).map((s) => {
      const p = s.subscription_plans as unknown as { price_monthly: number; price_annual: number | null } | null;
      return {
        status: s.status as SubStatus, billing_cycle: s.billing_cycle as BillingCycle, expires_at: (s.expires_at as string | null) ?? null,
        plan: p ? { price_monthly: Number(p.price_monthly), price_annual: p.price_annual } : null,
      };
    });
    let active = 0, trial = 0, expired = 0;
    for (const r of rows) {
      if (r.status === "active") active++;
      else if (r.status === "trial") trial++;
      else if (r.status === "expired") expired++;
    }
    const summary: BillingSummary = {
      mrr: mrr(subLikes, now), arr: arr(subLikes, now), active, trial, expired,
      unsubscribed: rows.filter((r) => r.status === "none").length, institutions: rows.length,
    };
    return { success: true, data: { rows, summary } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function assignPlan(input: {
  institutionId: string; planId: string; billingCycle: BillingCycle; status: SubStatus; expiresAt: string | null;
}): Promise<Result<null>> {
  try {
    if (!(await requireSuperAdmin())) return { success: false, error: "Not authorised." };
    const supabase = await db();
    const { error } = await supabase.from("institution_subscriptions").upsert({
      institution_id: input.institutionId, plan_id: input.planId, billing_cycle: input.billingCycle,
      status: input.status, expires_at: input.expiresAt,
    }, { onConflict: "institution_id" });
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/billing");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function renewSubscription(input: { institutionId: string; months: number }): Promise<Result<null>> {
  try {
    if (!(await requireSuperAdmin())) return { success: false, error: "Not authorised." };
    const supabase = await db();
    const { data: sub } = await supabase.from("institution_subscriptions").select("expires_at").eq("institution_id", input.institutionId).maybeSingle();
    if (!sub) return { success: false, error: "No subscription to renew." };
    const base = sub.expires_at && new Date(sub.expires_at as string) > new Date() ? new Date(sub.expires_at as string) : new Date();
    base.setMonth(base.getMonth() + Math.max(1, input.months));
    const { error } = await supabase.from("institution_subscriptions").update({ expires_at: base.toISOString(), status: "active" }).eq("institution_id", input.institutionId);
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/billing");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function cancelSubscription(input: { institutionId: string }): Promise<Result<null>> {
  try {
    if (!(await requireSuperAdmin())) return { success: false, error: "Not authorised." };
    const supabase = await db();
    const { error } = await supabase.from("institution_subscriptions").update({ status: "cancelled" }).eq("institution_id", input.institutionId);
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/billing");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export type InvoiceRow = {
  id: string; institutionName: string; invoiceNumber: string; amount: number; currency: string;
  periodStart: string; periodEnd: string; status: string; createdAt: string;
};

export async function getInvoices(): Promise<Result<InvoiceRow[]>> {
  try {
    if (!(await requireSuperAdmin())) return { success: false, error: "Not authorised." };
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("subscription_invoices")
      .select("id, invoice_number, amount, currency, period_start, period_end, status, created_at, institutions(name)")
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    const rows: InvoiceRow[] = (data ?? []).map((v) => ({
      id: v.id as string,
      institutionName: (v.institutions as unknown as { name: string } | null)?.name ?? "—",
      invoiceNumber: v.invoice_number as string, amount: Number(v.amount), currency: v.currency as string,
      periodStart: v.period_start as string, periodEnd: v.period_end as string,
      status: v.status as string, createdAt: v.created_at as string,
    }));
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function generateInvoice(input: {
  institutionId: string; amount: number; periodStart: string; periodEnd: string;
}): Promise<Result<{ id: string }>> {
  try {
    if (!(await requireSuperAdmin())) return { success: false, error: "Not authorised." };
    if (input.amount < 0) return { success: false, error: "Amount must be positive." };
    const supabase = await db();
    const year = new Date().getFullYear();
    const { count } = await supabase.from("subscription_invoices").select("id", { count: "exact", head: true }).gte("created_at", `${year}-01-01`);
    const number = invoiceNumber(year, (count ?? 0) + 1);
    const { data, error } = await supabase.from("subscription_invoices").insert({
      institution_id: input.institutionId, invoice_number: number, amount: input.amount,
      period_start: input.periodStart, period_end: input.periodEnd, status: "pending",
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/billing/invoices");
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function markInvoice(input: { id: string; status: "pending" | "paid" | "failed" | "refunded" }): Promise<Result<null>> {
  try {
    if (!(await requireSuperAdmin())) return { success: false, error: "Not authorised." };
    const supabase = await db();
    const { error } = await supabase.from("subscription_invoices").update({ status: input.status }).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/billing/invoices");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Feature gating (institution-admin readable via RLS) ───────────────────────

export type InstitutionPlan = { planName: string | null; status: SubStatus | "none"; expiresAt: string | null; features: FeatureKey[] };

/**
 * Whether a premium module is enabled for an institution.
 * DEFAULT-ALLOW: institutions with no subscription row are grandfathered in
 * (returns true) so existing tenants are never locked out before plans are
 * assigned. Once a plan is assigned, access follows the plan's feature list
 * (and an expired/cancelled subscription disables premium modules). Call this
 * from premium pages/actions to gate; middleware-level enforcement is a
 * deliberate follow-up to avoid hard lock-outs during rollout.
 */
export async function isFeatureEnabled(institutionId: string, feature: FeatureKey): Promise<boolean> {
  const res = await getInstitutionPlan(institutionId);
  if (!res.success) return true;            // fail open — never block on a read error
  if (res.data.status === "none") return true; // grandfathered (no plan yet)
  if (res.data.status === "expired" || res.data.status === "cancelled") return false;
  return res.data.features.includes(feature);
}

/** The institution's current plan + enabled features, for gating premium modules. */
export async function getInstitutionPlan(institutionId: string): Promise<Result<InstitutionPlan>> {
  try {
    const supabase = await db();
    const { data, error } = await supabase
      .from("institution_subscriptions")
      .select("status, expires_at, subscription_plans(name, features)")
      .eq("institution_id", institutionId)
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: true, data: { planName: null, status: "none", features: [], expiresAt: null } };
    const plan = data.subscription_plans as unknown as { name: string; features: FeatureKey[] } | null;
    return {
      success: true,
      data: {
        planName: plan?.name ?? null,
        status: effectiveStatus(data.status as SubStatus, (data.expires_at as string | null) ?? null),
        expiresAt: (data.expires_at as string | null) ?? null,
        features: (plan?.features ?? []) as FeatureKey[],
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
