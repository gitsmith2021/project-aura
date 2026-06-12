// ─────────────────────────────────────────────────────────────
// Platform-wide audit logging — Arch A8 (NAAC / UGC / ISO 27001)
//
// Dev Rule 13: every Server Action mutating exam_results, cia_marks,
// fee_payments, salary_disbursements, promotion_logs, fee_concessions,
// leave_requests, institution_members, lms_submissions or
// department_budgets MUST call logAudit() / logAuditBatch().
//
// Properties:
//  - Fire-and-forget: never throws, never blocks the primary action.
//    Failures are logged server-side only.
//  - Writes via the service-role client: audit_logs has no INSERT
//    policy for users, so the trail can't be forged or suppressed
//    from the browser (RLS bypass justified — see Dev Rule 16).
//  - IP + user-agent captured automatically when running inside a
//    request context (Server Action / route handler).
//
// SERVER-ONLY: import from Server Actions and route handlers only.
// ─────────────────────────────────────────────────────────────

import { headers } from "next/headers";
import { createAdminClient } from "@/utils/supabase/admin";

export type AuditAction = "INSERT" | "UPDATE" | "DELETE" | "PROMOTE" | "REVERT";

export interface AuditEntry {
  /** Institution the record belongs to (null for platform-level events) */
  institutionId: string | null;
  /** auth.users id of the actor — null for system actions (e.g. Razorpay webhook) */
  performedBy: string | null;
  /** Actual table name, e.g. 'exam_results', 'fee_payments' */
  tableName: string;
  /** PK of the affected row */
  recordId: string;
  action: AuditAction;
  /** Row snapshot before the change (omit for INSERT) */
  beforeData?: Record<string, unknown> | null;
  /** Row snapshot after the change (omit for DELETE) */
  afterData?: Record<string, unknown> | null;
  /** Human-readable reason / context, e.g. 'Leave rejected: overlapping exam duty' */
  notes?: string;
}

/** Audit one mutation. Fire-and-forget — safe to `await` without try/catch. */
export async function logAudit(entry: AuditEntry): Promise<void> {
  return logAuditBatch([entry]);
}

/**
 * Audit a batch of mutations in a single insert — use for bulk
 * operations (bulk marks entry, salary disbursement runs) so a
 * 60-student save doesn't fire 60 round-trips.
 */
export async function logAuditBatch(entries: AuditEntry[]): Promise<void> {
  if (entries.length === 0) return;

  try {
    // Best-effort request metadata; headers() is unavailable outside
    // a request scope and that must never break audit writes.
    let ip: string | null = null;
    let userAgent: string | null = null;
    try {
      const headerList = await headers();
      ip =
        headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        headerList.get("x-real-ip") ??
        null;
      userAgent = headerList.get("user-agent");
    } catch {
      /* not in a request context */
    }

    const admin = createAdminClient();
    const { error } = await admin.from("audit_logs").insert(
      entries.map((e) => ({
        institution_id: e.institutionId,
        performed_by: e.performedBy,
        table_name: e.tableName,
        record_id: e.recordId,
        action: e.action,
        before_data: e.beforeData ?? null,
        after_data: e.afterData ?? null,
        ip_address: ip,
        user_agent: userAgent,
        notes: e.notes ?? null,
      }))
    );
    if (error) {
      console.error("[auditLog] failed to write audit_logs:", error.message);
    }
  } catch (err) {
    console.error("[auditLog] unexpected failure:", err);
  }
}
