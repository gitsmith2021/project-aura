import { checkSchedulerHealth } from "@/lib/scheduler";

// Liveness probe for the Python scheduler microservice. Public (no auth):
// returns only up/down + latency, and external uptime monitors
// (e.g. UptimeRobot) need to reach it without a cookie session.
export async function GET() {
  const health = await checkSchedulerHealth();
  return Response.json(
    {
      service: "aura-scheduler-engine",
      status: health.online ? "ok" : "offline",
      latency_ms: health.latencyMs ?? null,
      checked_at: new Date().toISOString(),
    },
    { status: health.online ? 200 : 503 }
  );
}
