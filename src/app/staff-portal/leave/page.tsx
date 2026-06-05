"use client";

import { useState, useEffect } from "react";
import { Plus, CheckCircle2, Clock, XCircle } from "lucide-react";
import { LeaveApplicationDrawer } from "@/components/staff-portal/LeaveApplicationDrawer";
import { getStaffProfile, getLeaveRequests } from "@/actions/staffPortal";
import type { LeaveRequest, StaffProfile } from "@/types/staffPortal";

const LEAVE_ALLOWANCES = [
  { type: "Sick Leave",   allowed: 12, color: "text-rose-600 dark:text-rose-400" },
  { type: "Casual Leave", allowed: 12, color: "text-blue-600 dark:text-blue-400" },
  { type: "Earned Leave", allowed: 15, color: "text-emerald-600 dark:text-emerald-400" },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function days(from: string, to: string) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1;
}

const statusCfg = {
  approved: { Icon: CheckCircle2, cls: "bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-800/40" },
  rejected: { Icon: XCircle,      cls: "bg-rose-100/80 text-rose-700 border-rose-200/60 dark:bg-rose-900/25 dark:text-rose-300 dark:border-rose-800/40" },
  pending:  { Icon: Clock,        cls: "bg-amber-100/80 text-amber-700 border-amber-200/60 dark:bg-amber-900/25 dark:text-amber-300 dark:border-amber-800/40" },
};

export default function LeavePage() {
  const [staff,       setStaff]      = useState<StaffProfile | null>(null);
  const [leaves,      setLeaves]     = useState<LeaveRequest[]>([]);
  const [drawerOpen,  setDrawerOpen] = useState(false);
  const [loading,     setLoading]    = useState(true);

  async function load() {
    const pRes = await getStaffProfile();
    if (!pRes.success) return;
    setStaff(pRes.data);
    const lRes = await getLeaveRequests(pRes.data.id);
    if (lRes.success) setLeaves(lRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-6 pt-4 pb-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Leave Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Apply for leave and track your requests</p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg border border-violet-700 transition-colors shadow-sm"
        >
          <Plus size={13} strokeWidth={2.5} /> Apply for Leave
        </button>
      </div>

      {/* Leave balance cards */}
      <div className="grid grid-cols-3 gap-3">
        {LEAVE_ALLOWANCES.map(la => {
          const used = leaves.filter(l =>
            l.leave_type === la.type.split(" ")[0].toLowerCase() && l.status === "approved"
          ).reduce((s, l) => s + days(l.from_date, l.to_date), 0);
          return (
            <div key={la.type} className="px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm">
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{la.type}</p>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl font-black ${la.color}`}>{la.allowed - used}</span>
                <span className="text-[10px] text-slate-400">/ {la.allowed} days remaining</span>
              </div>
              <div className="mt-1.5 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-violet-400 rounded-full" style={{ width: `${Math.min(100, (used / la.allowed) * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* History table */}
      <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100/60 dark:border-slate-700/40">
          <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Leave History</h2>
        </div>
        {leaves.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-xs text-slate-400">No leave requests yet.</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100/80 dark:border-slate-700/60">
                {["Type","From","To","Days","Reason","Status","Note"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
              {leaves.map(l => {
                const cfg = statusCfg[l.status] ?? statusCfg.pending;
                return (
                  <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 capitalize">{l.leave_type}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(l.from_date)}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(l.to_date)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 tabular-nums">{days(l.from_date, l.to_date)}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 max-w-[160px] truncate">{l.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${cfg.cls}`}>
                        <cfg.Icon size={9} />
                        {l.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400 max-w-[120px] truncate">{l.review_note ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {staff && (
        <LeaveApplicationDrawer
          isOpen={drawerOpen}
          staffId={staff.id}
          institutionId={staff.institution_id}
          onClose={() => setDrawerOpen(false)}
          onSuccess={() => { setDrawerOpen(false); load(); }}
        />
      )}
    </div>
  );
}
