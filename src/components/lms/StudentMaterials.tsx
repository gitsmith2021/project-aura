"use client";

import { useState } from "react";
import { GraduationCap, ChevronDown, Loader2, BookOpen } from "lucide-react";
import { getMaterials, type MaterialRow, type PortalSubject } from "@/actions/studyMaterials";
import { MaterialCard } from "./MaterialCard";

export function StudentMaterials({ subjects }: { subjects: PortalSubject[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, MaterialRow[]>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function toggle(id: string) {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    if (!cache[id]) {
      setLoading(id);
      const res = await getMaterials(id);
      setLoading(null);
      if (res.success) setCache((c) => ({ ...c, [id]: res.data }));
    }
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0"><BookOpen size={18} className="text-violet-600" /></div>
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Study Materials</h1>
          <p className="text-xs text-slate-500">Notes, slides and resources for your subjects</p>
        </div>
      </div>

      {subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/40">
          <GraduationCap size={32} className="text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No subjects found</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {subjects.map((s) => {
            const isOpen = openId === s.id;
            const mats = cache[s.id] ?? [];
            return (
              <div key={s.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 overflow-hidden">
                <button onClick={() => toggle(s.id)} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">{s.name}</p>
                    <p className="text-[11px] text-slate-400">{[s.code, s.semester ? `Sem ${s.semester}` : null].filter(Boolean).join(" · ")} · {s.materialCount} material{s.materialCount !== 1 ? "s" : ""}</p>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700/60 pt-3">
                    {loading === s.id ? (
                      <div className="py-6 flex justify-center text-slate-400"><Loader2 size={20} className="animate-spin" /></div>
                    ) : mats.length === 0 ? (
                      <p className="text-[13px] text-slate-400 py-4 text-center">No materials published yet.</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {mats.map((m) => <MaterialCard key={m.id} material={m} />)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
