"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CollegeDashboard } from "@/components/dashboard/CollegeDashboard";
import { SessionSummaryModal } from "@/components/analytics/SessionSummaryModal";
import { AddInstitutionModal } from "@/components/dashboard/AddInstitutionModal";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useInstitution } from "@/context/InstitutionContext";
import { Building2, Plus } from "lucide-react";

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
  const [addOpen, setAddOpen] = useState(false);
  const { selectedId: activeTab } = useInstitution();

  const fetchColleges = async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: tenants, error } = await supabase
      .from('institutions')
      .select(`*, students:students!institution_id(count), staff:staff!institution_id(count), departments(count)`)
      .order('name', { ascending: true });

    if (error) {
      console.error("Error fetching colleges:", error);
      setLoading(false);
      return;
    }

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

  // Fallback to first college if activeTab is not set yet but colleges are loaded
  const activeTabId = activeTab || (colleges.length > 0 ? colleges[0].id : "");
  const activeCollege = colleges.find(c => c.id === activeTabId);

  return (
    <DashboardLayout>
      <div className="w-full h-[calc(100vh-56px)] min-h-0 flex flex-col overflow-hidden">

        {/* ── Per-college dashboard ── */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            </div>
          ) : activeCollege ? (
            <CollegeDashboard
              college={activeCollege}
              onViewReport={setSelectedScheduleId}
            />
          ) : colleges.length === 0 ? (
            /* Get Started Empty State */
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="max-w-md w-full bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-md rounded-2xl p-8 shadow-xl text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                  <Building2 size={28} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Get Started</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                    Create your first academic institution to start managing departments, staff directory, students, schedules, and financial operations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="mx-auto inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl border border-indigo-700 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Add Institution
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
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

      {addOpen && (
        <AddInstitutionModal
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
          onSuccess={fetchColleges}
        />
      )}
    </DashboardLayout>
  );
}
