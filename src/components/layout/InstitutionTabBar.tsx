"use client";

import React from "react";
import { ScrollableTabBar } from "./ScrollableTabBar";

type Institution = { id: string; name: string };

type InstitutionTabBarProps = {
  institutions: Institution[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  trailing?: React.ReactNode;
  className?: string;
};

export function InstitutionTabBar({
  institutions,
  selectedId,
  onSelect,
  loading = false,
  trailing,
  className = "",
}: InstitutionTabBarProps) {
  return (
    <div
      className={`mb-3 shrink-0 border-b border-slate-200 dark:border-slate-700 flex items-center min-w-0 ${className}`}
    >
      <ScrollableTabBar
        className="min-w-0 flex-1"
        innerClassName="items-stretch gap-0"
        trailing={trailing}
      >
        {loading ? (
          <div className="flex gap-3 py-2 px-5">
            <div className="h-6 w-28 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-6 w-28 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
        ) : institutions.length === 0 ? (
          <p className="whitespace-nowrap px-5 py-2.5 text-xs text-slate-400 dark:text-slate-550">
            No institutions registered.
          </p>
        ) : (
          institutions.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={`shrink-0 whitespace-nowrap px-5 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                selectedId === t.id
                  ? "border-violet-600 bg-violet-50/50 text-violet-700 dark:border-violet-500 dark:bg-violet-950/20 dark:text-violet-400"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {t.name}
            </button>
          ))
        )}
      </ScrollableTabBar>
    </div>
  );
}
