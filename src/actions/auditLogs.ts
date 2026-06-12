"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { AuditAction } from "@/lib/auditLog";

export type AuditLogRow = {
  id: string;
  institution_id: string | null;
  performed_by: string | null;
  table_name: string;
  record_id: string;
  action: AuditAction;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  notes: string | null;
  created_at: string;
  // resolved for display; null performer = system action (e.g. webhook)
  performer_name?: string | null;
};

export type AuditLogFilters = {
  tableName?: string;
  action?: AuditAction;
  /** ISO date (inclusive), e.g. "2026-06-01" */
  from?: string;
  /** ISO date (inclusive) */
  to?: string;
  page?: number;
  pageSize?: number;
};

/**
 * Institution audit trail (Arch A8). RLS restricts SELECT on audit_logs to
 * SUPER_ADMIN / INST_ADMIN of the institution — non-admins get empty results.
 */
export async function getAuditLogs(
  institutionId: string,
  filters: AuditLogFilters = {}
): Promise<
  | { success: true; data: AuditLogRow[]; total: number; tables: string[] }
  | { success: false; error: string }
> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const rangeFrom = (page - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false })
    .range(rangeFrom, rangeTo);

  if (filters.tableName) query = query.eq("table_name", filters.tableName);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00Z`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59Z`);

  const { data, error, count } = await query;
  if (error) return { success: false, error: error.message };

  const rows = (data ?? []) as AuditLogRow[];

  // Resolve performer display names (profiles.id === auth.users.id)
  const userIds = [...new Set(rows.map((r) => r.performed_by).filter((v): v is string => !!v))];
  const nameById = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles").select("id, full_name").in("id", userIds);
    for (const p of profiles ?? []) nameById.set(p.id, p.full_name);
  }

  // Distinct table names for the filter dropdown (cheap: from current page +
  // a dedicated head query would be nicer, but the audited set is small/known)
  const { data: tableRows } = await supabase
    .from("audit_logs")
    .select("table_name")
    .eq("institution_id", institutionId)
    .limit(1000);
  const tables = [...new Set((tableRows ?? []).map((t) => t.table_name as string))].sort();

  return {
    success: true,
    data: rows.map((r) => ({
      ...r,
      performer_name: r.performed_by ? nameById.get(r.performed_by) ?? null : null,
    })),
    total: count ?? 0,
    tables,
  };
}
