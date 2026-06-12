// ─────────────────────────────────────────────────────────────
// Scheduler resilience wrapper — Phase 2.5C
//
// Dev Rule 14: ALL calls to the Python scheduler microservice must
// go through callScheduler(). It adds a 30s timeout, converts every
// network/HTTP failure into a typed result instead of a thrown
// error, and records failures in scheduler_error_logs so outages
// are visible to admins.
//
// SERVER-ONLY: uses the service-role client for error logging.
// Import from Server Actions / route handlers only.
// ─────────────────────────────────────────────────────────────

import { createAdminClient } from "@/utils/supabase/admin";

const SCHEDULER_URL = process.env.SCHEDULER_API_URL ?? "http://127.0.0.1:8000";
const DEFAULT_TIMEOUT_MS = 30_000;
const HEALTH_TIMEOUT_MS = 5_000;

export const SCHEDULER_OFFLINE_MESSAGE =
  "The AI Scheduler is currently unavailable. You can still build and publish a timetable manually — or try again once the scheduler service is back online.";

type ErrorKind = "network" | "timeout" | "http_error" | "invalid_response";

export type SchedulerCallResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status?: number; detail?: unknown };

/** Fire-and-forget failure log. Logging must never break the actual call. */
async function logSchedulerError(entry: {
  endpoint: string;
  error_kind: ErrorKind;
  status_code?: number;
  error_message?: string;
  institution_id?: string;
}) {
  try {
    // Service-role client: scheduler_error_logs is RLS-locked with no
    // policies — only this wrapper writes to it (see migration 20260612180000).
    const admin = createAdminClient();
    await admin.from("scheduler_error_logs").insert(entry);
  } catch (logErr) {
    console.error("[scheduler] failed to record scheduler_error_logs entry:", logErr);
  }
}

/**
 * Call the Python scheduler with timeout + failure logging.
 * On HTTP errors the parsed response body is returned in `detail`
 * so callers can surface solver-specific messages (e.g. INFEASIBLE).
 */
export async function callScheduler<T>(
  path: string,
  opts: {
    method?: "GET" | "POST";
    body?: unknown;
    timeoutMs?: number;
    institutionId?: string;
  } = {}
): Promise<SchedulerCallResult<T>> {
  const { method = "GET", body, timeoutMs = DEFAULT_TIMEOUT_MS, institutionId } = opts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${SCHEDULER_URL}${path}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    await logSchedulerError({
      endpoint: path,
      error_kind: timedOut ? "timeout" : "network",
      error_message: err instanceof Error ? err.message : String(err),
      institution_id: institutionId,
    });
    return { success: false, error: SCHEDULER_OFFLINE_MESSAGE };
  } finally {
    clearTimeout(timer);
  }

  let parsed: unknown = null;
  try {
    parsed = await res.json();
  } catch {
    if (res.ok) {
      await logSchedulerError({
        endpoint: path,
        error_kind: "invalid_response",
        status_code: res.status,
        error_message: "Scheduler returned a non-JSON response",
        institution_id: institutionId,
      });
      return { success: false, error: SCHEDULER_OFFLINE_MESSAGE, status: res.status };
    }
  }

  if (!res.ok) {
    await logSchedulerError({
      endpoint: path,
      error_kind: "http_error",
      status_code: res.status,
      error_message: typeof parsed === "object" ? JSON.stringify(parsed).slice(0, 1000) : String(parsed),
      institution_id: institutionId,
    });
    return {
      success: false,
      error: `Scheduling engine returned HTTP ${res.status}.`,
      status: res.status,
      detail: parsed,
    };
  }

  return { success: true, data: parsed as T };
}

export type SchedulerHealth = { online: boolean; latencyMs?: number };

/**
 * Lightweight liveness probe against the engine's /health endpoint.
 * Short timeout, never logs — polling an offline service every page
 * load would flood scheduler_error_logs.
 */
export async function checkSchedulerHealth(): Promise<SchedulerHealth> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(`${SCHEDULER_URL}/health`, {
      cache: "no-store",
      signal: controller.signal,
    });
    return { online: res.ok, latencyMs: Date.now() - started };
  } catch {
    return { online: false };
  } finally {
    clearTimeout(timer);
  }
}
