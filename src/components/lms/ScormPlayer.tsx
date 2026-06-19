"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

/**
 * Minimal SCORM 1.2 / 2004 host: embeds the package's launch URL in an iframe
 * and listens for a `postMessage({ type: "scorm:complete" })` from the content
 * (the common lightweight integration). Completion is surfaced to the parent.
 */
export function ScormPlayer({ src, title, onComplete }: { src: string; title?: string; onComplete?: () => void }) {
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data;
      if (data && typeof data === "object" && data.type === "scorm:complete") {
        setComplete(true);
        onComplete?.();
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onComplete]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
        <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{title ?? "SCORM Package"}</p>
        {complete && <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={13} /> Completed</span>}
      </div>
      <iframe
        src={src}
        title={title ?? "SCORM content"}
        className="w-full h-[70vh] bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
