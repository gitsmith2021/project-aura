"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { PlayCircle, Clock, User } from "lucide-react";
import Link from "next/link";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type ActiveClass = {
  id: string;
  subject_name: string | null;
  start_time: string;
  end_time: string;
  staff_id: string | null;
  staffName: string | null;
};

export function CurrentClassWidget({ tenantId }: { tenantId?: string }) {
  const [activeClasses, setActiveClasses] = useState<ActiveClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentClasses = async () => {
      const supabase = createClient();
      const now = new Date();
      const today = DAY_NAMES[now.getDay()];
      const hh = now.getHours().toString().padStart(2, "0");
      const mm = now.getMinutes().toString().padStart(2, "0");
      const currentTime = `${hh}:${mm}:00`;

      // Step 1 — fetch active schedule rows (no join, avoids FK ambiguity issues)
      let query = supabase
        .from("schedules")
        .select("id, subject_name, start_time, end_time, staff_id")
        .eq("day_of_week", today)
        .lte("start_time", currentTime)
        .gt("end_time", currentTime)
        .order("start_time", { ascending: true });

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data: scheduleData, error: scheduleError } = await query;

      if (scheduleError) {
        console.error("Error fetching current classes:", scheduleError.message ?? scheduleError);
        setLoading(false);
        return;
      }

      const rows = scheduleData ?? [];

      if (rows.length === 0) {
        setActiveClasses([]);
        setLoading(false);
        return;
      }

      // Step 2 — bulk-resolve staff names with a simple .in() query
      const staffIds = [...new Set(rows.map((r) => r.staff_id).filter(Boolean))] as string[];
      let staffMap: Record<string, string> = {};

      if (staffIds.length > 0) {
        const { data: staffData } = await supabase
          .from("staff")
          .select("id, full_name")
          .in("id", staffIds);

        if (staffData) {
          staffMap = Object.fromEntries(staffData.map((s) => [s.id, s.full_name]));
        }
      }

      setActiveClasses(
        rows.map((r) => ({ ...r, staffName: staffMap[r.staff_id] ?? null })),
      );
      setLoading(false);
    };

    fetchCurrentClasses();

    const interval = setInterval(fetchCurrentClasses, 60000);
    return () => clearInterval(interval);
  }, [tenantId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 animate-pulse flex flex-col gap-4">
        <div className="h-32 bg-slate-100 rounded-lg"></div>
        <div className="h-32 bg-slate-100 rounded-lg"></div>
      </div>
    );
  }

  if (!activeClasses || activeClasses.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 border-dashed shadow-sm p-8 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
          <Clock className="text-slate-400" size={24} />
        </div>
        <h3 className="text-sm font-semibold text-slate-700">No Live Sessions</h3>
        <p className="text-xs text-slate-500 mt-1">There are no classes currently in progress.</p>
      </div>
    );
  }

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hours = h % 12 || 12;
    return `${hours}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  return (
    <div className="flex flex-col gap-3">
      {activeClasses.map((activeClass) => (
        <div key={activeClass.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col relative transition-all hover:border-violet-300 hover:shadow-md">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider">Live</span>
            </div>
            
            <div className="text-[10px] font-medium text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
              <Clock size={10} className="text-slate-400" />
              {formatTime(activeClass.start_time)} - {formatTime(activeClass.end_time)}
            </div>
          </div>
          
          <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-2 truncate">{activeClass.subject_name}</h2>
          
          <div className="flex flex-col gap-1.5 text-slate-600 text-[11px] mb-4">
            <div className="flex items-center gap-1.5">
              <User size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{activeClass.staffName ?? "Unknown Teacher"}</span>
            </div>
          </div>

          <div className="mt-auto">
            <Link
              href={`/session/${activeClass.id}`}
              className="flex items-center justify-center gap-1.5 bg-violet-50 text-violet-700 hover:bg-violet-600 hover:text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-all w-full border border-violet-100 hover:border-violet-600"
            >
              <PlayCircle size={14} />
              Launch Session
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}