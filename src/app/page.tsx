"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CollegeDashboard } from "@/components/dashboard/CollegeDashboard";
import { SessionSummaryModal } from "@/components/analytics/SessionSummaryModal";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useInstitution } from "@/context/InstitutionContext";

type College = {
  id: string;
  name: string;
  studentsCount: number;
  staffCount: number;
  departmentsCount: number;
};

export default function Dashboard() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const { selectedId: activeTab } = useInstitution();

  const fetchColleges = async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: tenants, error } = await supabase
      .from('institutions')
      .select(`*, students:students!institution_id(count), staff:staff!institution_id(count), departments(count)`)
      .order('name', { ascending: true });

    if (error) { console.error("Error fetching colleges:", error); setLoading(false); return; }

    const enriched = (tenants ?? []).map((t: any) => ({
      ...t,
      studentsCount: t.students?.[0]?.count || 0,
      staffCount:    t.staff?.[0]?.count    || 0,
      departmentsCount: t.departments?.[0]?.count || 0,
    }));

    setColleges(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchColleges();

    const supabase = createClient();
    const sub = supabase
      .channel('dashboard-institutions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'institutions' }, fetchColleges)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCollege = colleges.find(c => c.id === activeTab);

  return (
    <DashboardLayout>
      <div className="w-full h-[calc(100vh-56px)] min-h-0 flex flex-col overflow-hidden">

        {/* ── Per-college dashboard ── */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            </div>
          ) : activeCollege ? (
            <CollegeDashboard
              college={activeCollege}
              onViewReport={setSelectedScheduleId}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
              <p className="text-sm text-slate-400">No institution selected.</p>
            </div>
          )}
        </div>
      </div>

      {selectedScheduleId && (
        <SessionSummaryModal
          scheduleId={selectedScheduleId}
          onClose={() => setSelectedScheduleId(null)}
        />
      )}
    </DashboardLayout>
  );
}
