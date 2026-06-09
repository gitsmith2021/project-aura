"use client";

import { useState } from "react";
import { ArrowUp, ArrowRight, GraduationCap, AlertTriangle, Users } from "lucide-react";
import { StudentPromotionRow, PromotionAction } from "@/actions/yearPromotion";
import Link from "next/link";

type Props = {
  rows: StudentPromotionRow[];
  institutionId: string;
};

const TAB_CONFIG: { key: PromotionAction; label: string; icon: React.ReactNode; color: string; emptyText: string }[] = [
  {
    key: "promote",
    label: "Promote",
    icon: <ArrowUp size={14} />,
    color: "emerald",
    emptyText: "No students eligible for promotion.",
  },
  {
    key: "hold",
    label: "Hold — Arrears",
    icon: <AlertTriangle size={14} />,
    color: "amber",
    emptyText: "No students held back — everyone is clear.",
  },
  {
    key: "graduate",
    label: "Graduate",
    icon: <GraduationCap size={14} />,
    color: "violet",
    emptyText: "No students completing their final year.",
  },
];

const COLOR_STYLES: Record<string, { tab: string; activeTab: string; badge: string; row: string }> = {
  emerald: {
    tab:       "text-emerald-600 dark:text-emerald-400",
    activeTab: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
    badge:     "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40",
    row:       "",
  },
  amber: {
    tab:       "text-amber-600 dark:text-amber-400",
    activeTab: "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
    badge:     "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40",
    row:       "bg-amber-50/40 dark:bg-amber-950/10",
  },
  violet: {
    tab:       "text-violet-600 dark:text-violet-400",
    activeTab: "border-violet-500 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300",
    badge:     "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800/40",
    row:       "bg-violet-50/30 dark:bg-violet-950/10",
  },
};

export function PromotionPreviewTable({ rows, institutionId }: Props) {
  const [activeTab, setActiveTab] = useState<PromotionAction>("promote");

  const byAction: Record<PromotionAction, StudentPromotionRow[]> = {
    promote:  rows.filter(r => r.action === "promote"),
    hold:     rows.filter(r => r.action === "hold"),
    graduate: rows.filter(r => r.action === "graduate"),
  };

  const activeRows = byAction[activeTab];
  const cfg        = TAB_CONFIG.find(t => t.key === activeTab)!;
  const colors     = COLOR_STYLES[cfg.color];

  return (
    <div className="flex flex-col gap-3">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <ArrowUp size={12} /> {byAction.promote.length} to promote
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-400">
          <AlertTriangle size={12} /> {byAction.hold.length} held
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/40 rounded-lg text-xs font-semibold text-violet-700 dark:text-violet-400">
          <GraduationCap size={12} /> {byAction.graduate.length} to graduate
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Users size={12} /> {rows.length} total
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-0">
        {TAB_CONFIG.map(tab => {
          const isActive = tab.key === activeTab;
          const tabColors = COLOR_STYLES[tab.color];
          const count = byAction[tab.key].length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                isActive
                  ? `${tabColors.activeTab} border-b-2`
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${isActive ? tabColors.badge : "bg-slate-100 dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {activeRows.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">
            {cfg.emptyText}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_2fr_1.5fr_5rem_7rem] gap-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Roll</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Name</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Department</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center">Year</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center">Action</span>
            </div>
            <div className={`divide-y divide-slate-100 dark:divide-slate-700/60 max-h-80 overflow-y-auto custom-scrollbar`}>
              {activeRows.map(s => (
                <div key={s.id} className={`grid grid-cols-[1fr_2fr_1.5fr_5rem_7rem] gap-0 items-center px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${colors.row}`}>
                  <span className="text-[11px] font-mono text-slate-400 truncate pr-2">{s.roll_number ?? "—"}</span>
                  <Link
                    href={`/institutions/${institutionId}/results/${s.id}`}
                    className="text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 transition-colors truncate pr-2 flex items-center gap-1 group"
                  >
                    {s.full_name}
                    <ArrowRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate pr-2">{s.departments?.name ?? "—"}</span>
                  <span className="text-xs text-center font-semibold text-slate-600 dark:text-slate-300">
                    Year {s.year}
                    {s.action === "promote" && <span className="text-slate-400"> → {s.year + 1}</span>}
                  </span>
                  <div className="flex justify-center">
                    {s.action === "promote" && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.badge}`}>
                        Year {s.year + 1}
                      </span>
                    )}
                    {s.action === "hold" && (
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.badge}`}>
                        <AlertTriangle size={9} /> {s.arrear_count} arrear
                      </span>
                    )}
                    {s.action === "graduate" && (
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.badge}`}>
                        <GraduationCap size={10} /> Graduate
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
