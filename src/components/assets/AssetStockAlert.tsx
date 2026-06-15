"use client";

import { AlertTriangle } from "lucide-react";
import type { Asset } from "@/lib/assets";

export function AssetStockAlert({ items }: { items: Asset[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-4 rounded-xl border border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <AlertTriangle size={15} className="text-rose-500" />
        <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
          {items.length} item{items.length > 1 ? "s" : ""} at or below reorder level
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((a) => (
          <span key={a.id} className="px-2 py-0.5 rounded-md text-[11px] bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300">
            {a.name}: <span className="font-semibold">{a.current_stock} {a.unit}</span>
            {a.reorder_level != null && <span className="text-rose-400"> / reorder {a.reorder_level}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
