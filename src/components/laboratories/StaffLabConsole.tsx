"use client";

import { useState } from "react";
import { FlaskConical, ChevronRight, Loader2, Users } from "lucide-react";
import {
  getLabBatches, getLabExperiments, getLabSessions, getLabRoster,
  type RosterStudent,
} from "@/actions/laboratories";
import { LAB_TYPE_COLORS, labTypeLabel, type Laboratory, type LabBatch, type LabExperiment, type LabSession } from "@/lib/laboratories";
import { SessionLogger } from "./SessionLogger";

type LoadedLab = {
  batches: LabBatch[];
  experiments: LabExperiment[];
  sessions: LabSession[];
  roster: RosterStudent[];
};

export function StaffLabConsole({ labs }: { labs: Laboratory[] }) {
  const [active, setActive] = useState<Laboratory | null>(null);
  const [loaded, setLoaded] = useState<LoadedLab | null>(null);
  const [loading, setLoading] = useState(false);

  const openLab = async (lab: Laboratory) => {
    setActive(lab);
    setLoaded(null);
    setLoading(true);
    const [b, e, s, r] = await Promise.all([
      getLabBatches(lab.id),
      getLabExperiments(lab.id),
      getLabSessions(lab.id),
      getLabRoster(lab.institution_id, lab.department_id),
    ]);
    setLoaded({
      batches: b.success ? b.data : [],
      experiments: e.success ? e.data : [],
      sessions: s.success ? s.data : [],
      roster: r.success ? r.data : [],
    });
    setLoading(false);
  };

  if (active) {
    if (loading || !loaded) {
      return (
        <div className="flex justify-center py-20"><Loader2 size={22} className="animate-spin text-violet-500" /></div>
      );
    }
    return (
      <SessionLogger
        lab={active}
        batches={loaded.batches}
        experiments={loaded.experiments}
        roster={loaded.roster}
        initialSessions={loaded.sessions}
        onBack={() => { setActive(null); setLoaded(null); }}
      />
    );
  }

  if (labs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400 dark:text-slate-500">
        <FlaskConical size={28} className="opacity-30" />
        <p className="text-xs">You aren&apos;t assigned as the assistant for any laboratory.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {labs.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => openLab(l)}
          className="group text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
              <FlaskConical size={17} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{l.name}</h3>
              <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${LAB_TYPE_COLORS[l.lab_type]}`}>
                {labTypeLabel(l.lab_type)}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="truncate">{l.departments?.name ?? "No department"}</span>
            <span className="flex items-center gap-1 font-semibold text-violet-600 dark:text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
              Open <ChevronRight size={12} />
            </span>
          </div>
          {l.capacity != null && (
            <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-1"><Users size={11} /> Capacity {l.capacity}</p>
          )}
        </button>
      ))}
    </div>
  );
}
