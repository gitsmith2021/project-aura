"use client";

import { useEffect, useState, use, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/client";
import { Plus, ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { AddDepartmentModal } from "@/components/dashboard/AddDepartmentModal";
import { DepartmentHeatmap } from "@/components/dashboard/DepartmentHeatmap";
import { StaffDirectory } from "@/components/dashboard/StaffDirectory";
import { getDeptColor } from "@/lib/deptColors";
import { ShiftGateway, type ShiftKey } from "@/components/institution/ShiftGateway";

type Department = {
  id: string;
  name: string;
  tenant_id: string;
  studentsCount: number;
  color: string | null;
};

type College = {
  id: string;
  name: string;
  college_type: string;
};

type StaffMember = {
  id: string;
  full_name: string;
  email: string | null;
  phone?: string | null;
  role: string;
  department_id: string | null;
  department?: { name: string } | null;
};

export default function InstitutionPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const collegeId = resolvedParams.id;
  const searchParams = useSearchParams();
  const activeShift: ShiftKey = (searchParams?.get("shift") as ShiftKey) || "NORMAL";
  
  const [college, setCollege] = useState<College | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();
    
    // Fetch College
    const { data: collegeData, error: collegeError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', collegeId)
      .single();
      
    if (!collegeError && collegeData) {
      setCollege(collegeData);
    }
    
    // Fetch Departments with student counts
    const { data: deptData, error: deptError } = await supabase
      .from('departments')
      .select(`id, name, tenant_id, color, students:profiles!department_id(count)`)
      .eq('tenant_id', collegeId)
      .eq('students.role', 'STUDENT');
      
    if (!deptError && deptData) {
      const enrichedDepts = deptData.map((d: any) => ({
        id: d.id,
        name: d.name,
        tenant_id: d.tenant_id,
        color: d.color ?? 'violet',
        studentsCount: d.students?.[0]?.count || 0
      }));
      setDepartments(enrichedDepts);
    }

    // Fetch Staff with department name
    const { data: staffData, error: staffError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, department_id, department:departments(name)')
      .eq('tenant_id', collegeId)
      .eq('role', 'STAFF')
      .order('full_name', { ascending: true });

    if (!staffError && staffData) {
      setStaff(staffData as unknown as StaffMember[]);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [collegeId]);

  const breadcrumb = (
    <>
      <Link href="/" className="hover:text-slate-900 cursor-pointer transition-colors">Command Center</Link>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-900 font-semibold">{college?.name || "Loading..."}</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="px-5 pt-4 pb-2 w-full h-[calc(100vh-56px)] flex flex-col overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 shrink-0">
            <div>
              <Link href="/" className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-purple-600 mb-1 transition-colors uppercase tracking-wider font-semibold">
                <ArrowLeft size={12} /> Back to Command Center
              </Link>
              {loading ? (
                <div className="h-6 bg-slate-200 rounded w-48 animate-pulse mt-1"></div>
              ) : (
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{college?.name}</h1>
              )}
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors shrink-0"
            >
              <Plus size={13} strokeWidth={2.5} />
              Add Department
            </button>
          </div>

          {/* Shift Gateway — Segmented Control */}
          <div className="shrink-0 mb-4">
            <Suspense fallback={<div className="h-9 w-80 bg-slate-100 rounded-xl animate-pulse" />}>
              <ShiftGateway />
            </Suspense>
          </div>

          <div className="custom-scrollbar flex-1 pb-4 pr-1.5">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : college ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-full">
                {/* Left Column: Dept List & Heatmap */}
                <div className="lg:col-span-2 flex flex-col gap-5">
                  <div className="bg-white/75 backdrop-blur-sm rounded-xl border border-slate-100/90 p-5 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
                    <h2 className="text-sm font-semibold text-slate-900 mb-4">All Departments</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {departments.map(dept => {
                        const c = getDeptColor(dept.color);
                        return (
                          <Link
                            href={`/institutions/${collegeId}/department/${dept.id}`}
                            key={dept.id}
                            className="relative overflow-hidden p-3 rounded-xl flex items-center justify-between group transition-all hover:shadow-md hover:-translate-y-px cursor-pointer border"
                            style={{ background: `linear-gradient(135deg, ${c.bg} 0%, ${c.bg2} 100%)`, borderColor: c.border }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center border" style={{ background: c.bg2, borderColor: c.border }}>
                                <Building2 className="w-4 h-4" style={{ color: c.hex }} />
                              </div>
                              <span className="text-xs font-semibold" style={{ color: c.text }}>{dept.name}</span>
                            </div>
                            <div className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                              {dept.studentsCount} students
                            </div>
                          </Link>
                        );
                      })}
                      {departments.length === 0 && (
                        <div className="col-span-full py-8 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                          <p className="text-xs text-slate-500">No departments found. Add one to get started.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <DepartmentHeatmap departments={departments} />
                </div>

                {/* Right Column: Staff Directory */}
                <div className="lg:col-span-1 h-[600px] lg:h-auto">
                  <StaffDirectory staff={staff} />
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-500 text-sm">Institution not found.</div>
            )}
          </div>
          
        </div>
      </div>

      <AddDepartmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tenantId={collegeId}
        onSuccess={fetchData}
      />
    </DashboardLayout>
  );
}
