"use client";

import { usePathname, useRouter } from "next/navigation";
import { ScrollableTabBar } from "@/components/layout/ScrollableTabBar";

type Institution = { id: string; name: string };

type Props = {
  institutions: Institution[];
  currentId:    string;
};

export function FinanceTabBar({ institutions, currentId }: Props) {
  const pathname = usePathname();
  const router   = useRouter();

  function handleSelect(newId: string) {
    if (newId === currentId) return;

    // Swap the institution segment in the current path, keeping the sub-page
    const newPath = pathname.replace(
      `/institutions/${currentId}/`,
      `/institutions/${newId}/`
    );

    // Keep sidebar in sync
    localStorage.setItem("aura_finance_inst", newId);
    window.dispatchEvent(new CustomEvent("aura:finance:inst", { detail: newId }));

    router.push(newPath);
  }

  if (!institutions.length) return null;

  return (
    <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <ScrollableTabBar innerClassName="items-stretch gap-0">
        {institutions.map(inst => (
          <button
            key={inst.id}
            type="button"
            onClick={() => handleSelect(inst.id)}
            className={`shrink-0 whitespace-nowrap px-5 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
              inst.id === currentId
                ? "border-violet-600 bg-violet-50/50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400"
                : "border-transparent text-slate-500 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            {inst.name}
          </button>
        ))}
      </ScrollableTabBar>
    </div>
  );
}
