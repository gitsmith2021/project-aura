"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
      .from('tenants')
      .select(`*, students:profiles!tenant_id(count), staff:profiles!tenant_id(count), departments(count)`)
      .eq('students.role', 'STUDENT')
      .eq('staff.role', 'STAFF')
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
      .channel('dashboard-tenants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, fetchColleges)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCollege = colleges.find(c => c.id === activeTab);

  return (
    <DashboardLayout>
      <div className="w-full h-[calc(100vh-56px)] flex flex-col overflow-hidden">

        {/* ── Tab Bar ── */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-5 flex items-center justify-between gap-4">
          <div className="flex items-end gap-0 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {loading ? (
              <div className="flex gap-3 py-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-8 w-28 bg-slate-100 rounded-md animate-pulse" />
                ))}
              </div>
            ) : colleges.map(college => (
              <button
                key={college.id}
                onClick={() => setActiveTab(college.id)}
                className={`relative whitespace-nowrap px-5 py-3.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                  activeTab === college.id
                    ? 'border-violet-600 text-violet-700 bg-violet-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {college.name}
              </button>
            ))}
            {!loading && colleges.length === 0 && (
              <p className="text-xs text-slate-400 py-3.5 px-2">No institutions yet.</p>
            )}
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus size={13} strokeWidth={2.5} /> Register Institution
          </button>
        </div>

        {/* ── Per-college dashboard ── */}
        <div className="flex-1 overflow-hidden">
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
