"use client";

import { useEffect, useState, use, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/client";
import { Plus, ArrowLeft, Building2, Pencil } from "lucide-react";
import Link from "next/link";
import { AddDepartmentModal, type DepartmentEditPayload } from "@/components/dashboard/AddDepartmentModal";
import { EditInstitutionModal, type InstitutionEditPayload } from "@/components/dashboard/EditInstitutionModal";
import { DepartmentHeatmap } from "@/components/dashboard/DepartmentHeatmap";
import { StaffDirectory } from "@/components/dashboard/StaffDirectory";
import { getDeptColor } from "@/lib/deptColors";
import { ShiftGateway, type ShiftKey } from "@/components/institution/ShiftGateway";
import { DepartmentFundingBadge } from "@/components/departments/DepartmentFundingBadge";

type Department = {
  id: string;
  name: string;
  institution_id: string;
  studentsCount: number;
  color: string | null;
  session_type: string | null;
  funding_type: string | null;
};

type College = {
  id: string;
  name: string;
  college_type: string | null;
  subdomain?: string | null;
};

type StaffMember = {
  id: string;
  full_name: string;
  email: string | null;
  phone?: string | null;
  role: string;
  department_id: string | null;
  department?: { name: string; funding_type?: string | null } | null;
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
  const [departmentToEdit, setDepartmentToEdit] = useState<DepartmentEditPayload | null>(null);
  const [editInstitutionOpen, setEditInstitutionOpen] = useState(false);

  const formatSessionType = (sessionType: string | null) => {
    switch (sessionType) {
      case "DAY":
        return "Day Shift 1";
      case "EVENING":
        return "Evening Shift 2";
      default:
        return "General Shift";
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();
    
    // Fetch College
    const { data: collegeData, error: collegeError } = await supabase
      .from('institutions')
      .select('*')
      .eq('id', collegeId)
      .single();
      
    if (!collegeError && collegeData) {
      setCollege(collegeData);
    }
    
    // Fetch departments first. Do not filter by joined students, otherwise
    // newly created departments with 0 students are hidden.
    const { data: deptData, error: deptError } = await supabase
      .from('departments')
      .select('id, name, institution_id, color, session_type, funding_type')
      .eq('institution_id', collegeId)
      .order('name', { ascending: true });

    const { data: studentRows, error: studentError } = await supabase
      .from('students')
      .select('department_id')
      .eq('institution_id', collegeId)
      .not('department_id', 'is', null);
      
    if (!deptError && deptData) {
      const studentCountByDepartment = new Map<string, number>();
      const filteredDepartments = deptData.filter((d: any) => (d.session_type ?? 'NORMAL') === activeShift);

      if (!studentError && studentRows) {
        for (const row of studentRows) {
          const deptId = row.department_id as string | null;
          if (!deptId) continue;
          studentCountByDepartment.set(deptId, (studentCountByDepartment.get(deptId) ?? 0) + 1);
        }
      }

      const enrichedDepts = filteredDepartments.map((d: any) => ({
        id: d.id,
        name: d.name,
        institution_id: d.institution_id,
        color: d.color ?? 'violet',
        session_type: d.session_type ?? 'NORMAL',
        funding_type: d.funding_type ?? 'AIDED',
        studentsCount: studentCountByDepartment.get(d.id) ?? 0
      }));
      setDepartments(enrichedDepts);
    }

    // Fetch Staff with department name
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, full_name, email, phone, role, department_id, department:departments(name, funding_type)')
      .eq('institution_id', collegeId)
      .order('full_name', { ascending: true });

    if (!staffError && staffData) {
      setStaff(staffData as unknown as StaffMember[]);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [collegeId, activeShift]);

  const breadcrumb = (
    <>
      <Link href="/" className="hover:text-slate-900 cursor-pointer transition-colors">Command Center</Link>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-900 font-semibold">{college?.name || "Loading..."}</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="px-5 pt-2 pb-2 w-full h-[calc(100vh-56px)] min-h-0 flex flex-col overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2 shrink-0">
            <div>
              <Link href="/" className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-purple-600 mb-1 transition-colors uppercase tracking-wider font-semibold">
                <ArrowLeft size={12} /> Back to Command Center
              </Link>
              {loading ? (
                <div className="h-6 bg-slate-200 rounded w-48 animate-pulse mt-1"></div>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight truncate">{college?.name}</h1>
                  <button
                    type="button"
                    onClick={() => setEditInstitutionOpen(true)}
                    disabled={!college}
                    title="Edit institution"
                    aria-label="Edit institution"
                    className="shrink-0 p-1 rounded-md text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <Pencil size={16} strokeWidth={2.25} />
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setDepartmentToEdit(null);
                setIsModalOpen(true);
              }}
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

          <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto pb-4 pr-1.5">
            {loading ? (
              <div className="flex justify-center py-20 min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : college ? (
              <div className="min-h-full grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-1 gap-5 lg:items-stretch lg:auto-rows-[minmax(0,1fr)]">
                {/* Left Column: Dept List & Heatmap */}
                <div className="lg:col-span-2 flex flex-col gap-5 min-h-0 lg:h-full">
                  <div className="bg-white/75 backdrop-blur-sm rounded-xl border border-slate-100/90 p-5 shadow-[0_1px_8px_rgba(0,0,0,0.04)] shrink-0">
                    <h2 className="text-sm font-semibold text-slate-900 mb-4">All Departments</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {departments.map(dept => {
                        const c = getDeptColor(dept.color);
                        return (
                          <div
                            key={dept.id}
                            className="relative overflow-hidden p-3 rounded-xl flex items-center gap-2 sm:gap-3 transition-all hover:shadow-md hover:-translate-y-px border group"
                            style={{ background: `linear-gradient(135deg, ${c.bg} 0%, ${c.bg2} 100%)`, borderColor: c.border }}
                          >
                            <Link
                              href={`/institutions/${collegeId}/department/${dept.id}`}
                              className="flex items-center gap-3 min-w-0 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center border shrink-0" style={{ background: c.bg2, borderColor: c.border }}>
                                <Building2 className="w-4 h-4" style={{ color: c.hex }} />
                              </div>
                              <div className="flex flex-col min-w-0 gap-0.5">
                                <span className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xs font-semibold truncate" style={{ color: c.text }}>{dept.name}</span>
                                  <DepartmentFundingBadge fundingType={dept.funding_type} />
                                </span>
                                <span className="text-[10px] opacity-80 truncate" style={{ color: c.text }}>
                                  {formatSessionType(dept.session_type)}
                                </span>
                              </div>
                            </Link>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                                {dept.studentsCount} students
                              </div>
                              <button
                                type="button"
                                title="Edit department"
                                aria-label={`Edit ${dept.name}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDepartmentToEdit({
                                    id: dept.id,
                                    name: dept.name,
                                    session_type: dept.session_type,
                                    funding_type: dept.funding_type,
                                    color: dept.color,
                                  });
                                  setIsModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg border transition-all shrink-0 hover:brightness-95 active:scale-95"
                                style={{
                                  color: c.text,
                                  borderColor: c.border,
                                  background: c.bg2,
                                }}
                              >
                                <Pencil size={14} strokeWidth={2.25} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {departments.length === 0 && (
                        <div className="col-span-full py-8 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                          <p className="text-xs text-slate-500">No departments found. Add one to get started.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col min-h-[200px] lg:min-h-0 min-w-0">
                    <DepartmentHeatmap departments={departments} />
                  </div>
                </div>

                {/* Right Column: Staff Directory */}
                <div className="lg:col-span-1 flex flex-col min-h-[320px] lg:min-h-0 lg:h-full min-w-0">
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
        onClose={() => {
          setIsModalOpen(false);
          setDepartmentToEdit(null);
        }}
        tenantId={collegeId}
        onSuccess={fetchData}
        departmentToEdit={departmentToEdit}
      />

      <EditInstitutionModal
        isOpen={editInstitutionOpen}
        onClose={() => setEditInstitutionOpen(false)}
        onSuccess={fetchData}
        tenant={
          college
            ? ({
                id: college.id,
                name: college.name,
                college_type: college.college_type,
                subdomain: college.subdomain ?? null,
              } satisfies InstitutionEditPayload)
            : null
        }
      />
    </DashboardLayout>
  );
}
