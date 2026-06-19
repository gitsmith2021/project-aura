// ─────────────────────────────────────────────────────────────
// Platform Health & Security — pure domain helpers (Phase 7D)
// Error-rate / RLS-coverage maths and compact number formatting
// for the super-admin operator dashboards. No I/O — unit-tested.
// ─────────────────────────────────────────────────────────────

/** Failed-over-total as a percentage to one decimal (0 when nothing happened). */
export function errorRate(failed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((failed / total) * 1000) / 10;
}

export type TableRls = { table_name: string; rls_enabled: boolean };

export type RlsCoverage = { covered: number; total: number; pct: number; unprotected: string[] };

/** Share of public tables with row-level security enabled. */
export function rlsCoverage(tables: TableRls[]): RlsCoverage {
  const total = tables.length;
  const covered = tables.filter((t) => t.rls_enabled).length;
  const unprotected = tables.filter((t) => !t.rls_enabled).map((t) => t.table_name);
  return { covered, total, pct: total ? Math.round((covered / total) * 1000) / 10 : 100, unprotected };
}

/** 1234 → "1.2k", 3_400_000 → "3.4M". */
export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${Math.round(n / 100) / 10}k`;
  if (n < 1_000_000_000) return `${Math.round(n / 100_000) / 10}M`;
  return `${Math.round(n / 100_000_000) / 10}B`;
}

export function formatLatency(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${Math.round(ms / 100) / 10} s`;
}

export type Severity = "ok" | "info" | "warn" | "critical";

/** Operator-facing severity for a payment-failure rate. */
export function paymentSeverity(rate: number): Severity {
  if (rate <= 0) return "ok";
  if (rate < 2) return "info";
  if (rate < 10) return "warn";
  return "critical";
}

/**
 * Tables that intentionally have RLS enabled with NO policies — they are
 * written only via the service role (createAdminClient) and no client role
 * should ever read them. Surfaced on the security dashboard so the advisor's
 * "RLS Enabled No Policy" INFO is understood as deliberate, not an oversight.
 */
export const INTENTIONAL_DENY_ALL_TABLES = ["razorpay_webhook_events", "scheduler_error_logs"] as const;
