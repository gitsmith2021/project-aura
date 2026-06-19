"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
// Dev Rule 16: the platform health/security dashboards aggregate read-only data
// across ALL institutions (audit logs, payment failures, catalog stats), which
// RLS deliberately scopes away from any single tenant. After verifying the
// caller holds a SUPER_ADMIN membership (cookie client, RLS-checked), the reads
// below use the service-role client, behind the same gate enforced in middleware
// and the /admin layout.
import { createAdminClient } from "@/utils/supabase/admin";
import { checkSchedulerHealth } from "@/lib/scheduler";
import { errorRate, rlsCoverage, INTENTIONAL_DENY_ALL_TABLES, type TableRls } from "@/lib/platformHealth";

type Result<T> = { success: true; data: T } | { success: false; error: string };

async function requireSuperAdmin(): Promise<boolean> {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("institution_members").select("id").eq("profile_id", user.id).eq("role", "SUPER_ADMIN").limit(1).maybeSingle();
  return !!data;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type SchedulerStatus = { online: boolean; latencyMs: number | null };
export type PaymentHealth = {
  total: number; completed: number; failed: number; pending: number;
  failureRate: number; failedLast7d: number; failedLast30d: number;
  recentFailures: { id: string; institution: string; amount: number; createdAt: string }[];
};
export type AuditEntry = { id: string; institution: string; table: string; action: string; recordId: string | null; notes: string | null; createdAt: string };
export type TableStat = { table: string; rows: number; rlsEnabled: boolean };

export type PlatformHealth = {
  scheduler: SchedulerStatus;
  payments: PaymentHealth;
  audit: AuditEntry[];
  totalRows: number;
  tableCount: number;
  topTables: TableStat[];
};

const DAY = 86_400_000;

async function institutionNameMap(admin: ReturnType<typeof createAdminClient>): Promise<Map<string, string>> {
  const { data } = await admin.from("institutions").select("id, name");
  return new Map((data ?? []).map((i) => [i.id as string, i.name as string]));
}

export async function getPlatformHealth(): Promise<Result<PlatformHealth>> {
  try {
    if (!(await requireSuperAdmin())) return { success: false, error: "Not authorised." };
    const admin = createAdminClient();
    const now = Date.now();

    const [scheduler, names, paymentsRes, auditRes, statsRes] = await Promise.all([
      checkSchedulerHealth(),
      institutionNameMap(admin),
      admin.from("fee_payments").select("id, institution_id, payment_status, amount_paid, created_at").order("created_at", { ascending: false }).limit(5000),
      admin.from("audit_logs").select("id, institution_id, table_name, action, record_id, notes, created_at").order("created_at", { ascending: false }).limit(40),
      admin.rpc("platform_table_stats"),
    ]);

    const payRows = (paymentsRes.data ?? []) as { id: string; institution_id: string; payment_status: string; amount_paid: number; created_at: string }[];
    let completed = 0, failed = 0, pending = 0, failedLast7d = 0, failedLast30d = 0;
    const recentFailures: PaymentHealth["recentFailures"] = [];
    for (const p of payRows) {
      if (p.payment_status === "completed") completed++;
      else if (p.payment_status === "failed") {
        failed++;
        const age = now - new Date(p.created_at).getTime();
        if (age <= 7 * DAY) failedLast7d++;
        if (age <= 30 * DAY) {
          failedLast30d++;
          if (recentFailures.length < 10) recentFailures.push({ id: p.id, institution: names.get(p.institution_id) ?? "—", amount: p.amount_paid ?? 0, createdAt: p.created_at });
        }
      } else pending++;
    }
    const total = payRows.length;

    const audit: AuditEntry[] = (auditRes.data ?? []).map((a) => ({
      id: a.id as string,
      institution: names.get(a.institution_id as string) ?? "—",
      table: a.table_name as string,
      action: a.action as string,
      recordId: (a.record_id as string | null) ?? null,
      notes: (a.notes as string | null) ?? null,
      createdAt: a.created_at as string,
    }));

    const stats = (statsRes.data ?? []) as { table_name: string; row_estimate: number; rls_enabled: boolean }[];
    const totalRows = stats.reduce((s, t) => s + Number(t.row_estimate), 0);
    const topTables: TableStat[] = [...stats]
      .sort((a, b) => Number(b.row_estimate) - Number(a.row_estimate))
      .slice(0, 15)
      .map((t) => ({ table: t.table_name, rows: Number(t.row_estimate), rlsEnabled: t.rls_enabled }));

    return {
      success: true,
      data: {
        scheduler: { online: scheduler.online, latencyMs: scheduler.latencyMs ?? null },
        payments: { total, completed, failed, pending, failureRate: errorRate(failed, total), failedLast7d, failedLast30d, recentFailures },
        audit,
        totalRows,
        tableCount: stats.length,
        topTables,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Security posture ──────────────────────────────────────────────────────────

export type SecurityFinding = { item: string; status: "pass" | "deferred" | "review"; detail: string };
export type SecurityPosture = {
  rls: { covered: number; total: number; pct: number; unprotected: string[] };
  intentionalDenyAll: string[];
  findings: SecurityFinding[];
};

export async function getSecurityPosture(): Promise<Result<SecurityPosture>> {
  try {
    if (!(await requireSuperAdmin())) return { success: false, error: "Not authorised." };
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("platform_table_stats");
    if (error) return { success: false, error: error.message };
    const tables = (data ?? []).map((t: { table_name: string; rls_enabled: boolean }) => ({ table_name: t.table_name, rls_enabled: t.rls_enabled })) as TableRls[];
    const cov = rlsCoverage(tables);

    const findings: SecurityFinding[] = [
      { item: "Row-Level Security coverage", status: cov.pct >= 99 ? "pass" : "review", detail: `${cov.pct}% of public tables have RLS enabled` },
      { item: "Security headers (CSP, X-Frame-Options, X-Content-Type-Options)", status: "pass", detail: "Set globally in next.config.ts" },
      { item: "Service-role key used server-side only", status: "pass", detail: "createAdminClient() restricted to server-only files behind role gates" },
      { item: "Data-retention periods documented (DPDP)", status: "pass", detail: "src/lib/dataRetention.ts covers every PII-bearing table" },
      { item: "RLS policy map", status: "pass", detail: "docs/rls-policy-map.md" },
      { item: "Penetration-test plan", status: "pass", detail: "docs/security-audit-plan.md (annual cadence)" },
      { item: "Intentional deny-all tables documented", status: "pass", detail: `${INTENTIONAL_DENY_ALL_TABLES.join(", ")} — service-role write only` },
      { item: "Leaked-password protection (HaveIBeenPwned)", status: "deferred", detail: "Requires Supabase Pro plan — enable on upgrade" },
      { item: "Storage buckets — sensitive data review", status: "review", detail: "Document-URL buckets are public by convention; no listing of sensitive PII intended" },
    ];

    return { success: true, data: { rls: cov, intentionalDenyAll: [...INTENTIONAL_DENY_ALL_TABLES], findings } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
