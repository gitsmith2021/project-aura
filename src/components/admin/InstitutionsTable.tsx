"use client";

import Link from "next/link";
import type { InstitutionRow } from "@/actions/superAdmin";
import { formatINRCompact, formatINRFull, formatLastActivity, intFmt } from "./format";

/**
 * Shared by the /admin overview and /admin/institutions list (Phase 7B/7C).
 * Names link to the operator drill-down, not the college dashboard — the
 * college view is offered as a quick action inside the drill-down.
 */
export function InstitutionsTable({ institutions, title, subtitle }: {
  institutions: InstitutionRow[];
  title: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-2 font-semibold">Institution</th>
              <th className="px-4 py-2 font-semibold">Type</th>
              <th className="px-4 py-2 font-semibold text-right">Students</th>
              <th className="px-4 py-2 font-semibold text-right">Staff</th>
              <th className="px-4 py-2 font-semibold text-right">Revenue</th>
              <th className="px-4 py-2 font-semibold">Last Activity</th>
              <th className="px-4 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {institutions.map((inst) => (
              <tr key={inst.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-violet-50/40 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/admin/institutions/${inst.id}`}
                    className="text-xs font-semibold text-slate-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                  >
                    {inst.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">{inst.collegeType ?? "—"}</td>
                <td className="px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 text-right tabular-nums">{intFmt.format(inst.students)}</td>
                <td className="px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 text-right tabular-nums">{intFmt.format(inst.staff)}</td>
                <td className="px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white text-right tabular-nums" title={formatINRFull(inst.revenue)}>
                  {formatINRCompact(inst.revenue)}
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">{formatLastActivity(inst.lastActivity)}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    inst.status === "Active"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {inst.status}
                  </span>
                </td>
              </tr>
            ))}
            {institutions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">
                  No institutions registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
