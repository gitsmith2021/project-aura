"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudOff, Loader2, RotateCcw } from "lucide-react";

type Status = "checking" | "online" | "offline";

/**
 * Phase 2.5C — shows an amber warning when the Python scheduler
 * microservice is unreachable, so admins know AI generation is down
 * but manual timetable building still works. Renders nothing while
 * checking or when the engine is healthy.
 */
export function SchedulerStatusBanner() {
  const [status, setStatus] = useState<Status>("checking");
  const [retrying, setRetrying] = useState(false);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/scheduler-health", { cache: "no-store" });
      setStatus(res.ok ? "online" : "offline");
    } catch {
      setStatus("offline");
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  if (status !== "offline") return null;

  async function handleRetry() {
    setRetrying(true);
    await check();
    setRetrying(false);
  }

  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
      <CloudOff className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-800">AI Scheduler is offline</p>
        <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
          Schedule generation is unavailable, but you can still publish a manually built draft
          or add classes by hand from the calendar.
        </p>
      </div>
      <button
        onClick={handleRetry}
        disabled={retrying}
        title="Check again"
        className="shrink-0 flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-amber-700 border border-amber-300 rounded-md hover:bg-amber-100 disabled:opacity-50 transition-colors"
      >
        {retrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
        Retry
      </button>
    </div>
  );
}
