"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ScrollableTabBar } from "@/components/layout/ScrollableTabBar";
import { AddInstitutionModal } from "@/components/dashboard/AddInstitutionModal";
import { CollegeDashboard } from "@/components/dashboard/CollegeDashboard";
import { SessionSummaryModal } from "@/components/analytics/SessionSummaryModal";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

type College = {
  id: string;
  name: string;
  studentsCount: number;
  staffCount: number;
  departmentsCount: number;
};

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

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
    if (enriched.length > 0 && !activeTab) {
      setActiveTab(enriched[0].id);
    }
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

        {/* ── Tab Bar ── */}
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-5 min-w-0">
          <ScrollableTabBar className="min-w-0 flex-1" innerClassName="items-end gap-0">
            {loading ? (
              <div className="flex gap-3 py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 w-28 shrink-0 rounded-md bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : colleges.length === 0 ? (
              <p className="whitespace-nowrap px-2 py-2.5 text-xs text-slate-400">No institutions yet.</p>
            ) : (
              colleges.map((college) => (
                <button
                  key={college.id}
                  type="button"
                  onClick={() => setActiveTab(college.id)}
                  className={`relative shrink-0 whitespace-nowrap px-5 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                    activeTab === college.id
                      ? "border-violet-600 bg-violet-50/50 text-violet-700"
                      : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {college.name}
                </button>
              ))
            )}
          </ScrollableTabBar>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-700"
          >
            <Plus size={13} strokeWidth={2.5} /> Register Institution
          </button>
        </div>

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

      <AddInstitutionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchColleges}
      />

      {selectedScheduleId && (
        <SessionSummaryModal
          scheduleId={selectedScheduleId}
          onClose={() => setSelectedScheduleId(null)}
        />
      )}
    </DashboardLayout>
  );
}
