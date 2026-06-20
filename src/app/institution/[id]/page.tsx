import { ShiftSelector } from '@/components/dashboard/ShiftSelector';
import { DepartmentGrid } from '@/components/institution/DepartmentGrid';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { Suspense } from 'react';

// Next.js 15+ page props type for app router where params and searchParams are Promises
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function InstitutionDashboardPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const institutionId = resolvedParams.id;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch the actual institution name
  const { data: tenant } = await supabase
    .from('institutions')
    .select('name, session_types')
    .eq('id', institutionId)
    .single();

  const institutionName = tenant?.name || 'Bishop Heber College';
  const isMultiShift = ((tenant?.session_types as string[] | null) ?? []).length > 1;

  // Read shift search parameter. Default to 'DAY' if undefined or empty.
  const shiftParam = resolvedSearchParams?.shift;
  const activeShift = typeof shiftParam === 'string' && shiftParam !== '' ? shiftParam : 'DAY';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800/80 bg-gray-950/90 backdrop-blur-xl sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-5">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              {institutionName}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Managing operations for institution ID: <span className="text-gray-300 font-mono bg-gray-800/50 px-1.5 py-0.5 rounded">{institutionId}</span>
            </p>
          </div>
          
          {/* Shift Toggle — only for multi-shift institutions */}
          {isMultiShift && (
            <div className="flex items-center">
              <ShiftSelector />
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full space-y-8">
        
        {/* Stats Cards Section */}
        <section>
           <Suspense fallback={<StatsPlaceholder />}>
             <StatsCards institutionId={institutionId} activeShift={activeShift} />
           </Suspense>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Departmental Heatmap Section */}
          <section className="lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-white flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                Departmental Heatmap
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm">
                  {activeShift}
                </span>
              </h2>
            </div>
            
            {/* Suspense boundary for data fetching */}
            <div className="rounded-xl border border-gray-800/60 bg-gray-900/40 p-6 shadow-md backdrop-blur-sm min-h-[300px]">
              <Suspense fallback={<ActiveDepartmentsPlaceholder />}>
                <DepartmentsDataLoader institutionId={institutionId} activeShift={activeShift} />
              </Suspense>
            </div>
          </section>

          {/* Faculty Directory Section */}
          <section className="space-y-5">
             <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-white flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                Faculty Directory
              </h2>
            </div>
            
            {/* Faculty List */}
            <div className="rounded-xl border border-gray-800/60 bg-gray-900/40 p-6 shadow-md backdrop-blur-sm min-h-[300px]">
               <Suspense fallback={<FacultyDirectoryPlaceholder />}>
                 <FacultyDirectoryLoader institutionId={institutionId} activeShift={activeShift} />
               </Suspense>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

// ----------------------------------------------------------------------
// Data Loaders
// ----------------------------------------------------------------------

async function getShiftObj(supabase: any, institutionId: string, activeShift: string) {
  const { data } = await supabase
    .from('shifts')
    .select('id')
    .eq('tenant_id', institutionId)
    .ilike('name', `%${activeShift}%`)
    .maybeSingle();
  return data;
}

async function StatsCards({ institutionId, activeShift }: { institutionId: string; activeShift: string }) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 1. Find all active departments for this shift from schedules
  const { data: schedules } = await supabase
    .from('class_schedules')
    .select('department_id')
    .eq('shift', activeShift);

  const activeDeptIds = Array.from(new Set(schedules?.map(s => s.department_id).filter(Boolean) || []));

  let studentCount = 0;
  let staffCount = 0;

  if (activeDeptIds.length > 0) {
    const [{ count: students }, { count: staff }] = await Promise.all([
      supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId)
        .in('department_id', activeDeptIds),
      supabase
        .from('staff')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId)
        .in('department_id', activeDeptIds)
    ]);
    studentCount = students || 0;
    staffCount = staff || 0;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-gray-800/40 border border-gray-800/60 rounded-xl p-5 space-y-3 shadow-sm">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Today&#39;s Sessions</span>
        <div className="text-3xl font-bold text-gray-100">{schedules?.length || 0}</div>
      </div>
      <div className="bg-gray-800/40 border border-gray-800/60 rounded-xl p-5 space-y-3 shadow-sm">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Shift Students</span>
        <div className="text-3xl font-bold text-gray-100">{studentCount}</div>
      </div>
      <div className="bg-gray-800/40 border border-gray-800/60 rounded-xl p-5 space-y-3 shadow-sm">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Shift Faculty</span>
        <div className="text-3xl font-bold text-gray-100">{staffCount}</div>
      </div>
    </div>
  );
}

async function DepartmentsDataLoader({ institutionId, activeShift }: { institutionId: string; activeShift: string }) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 1. Fetch departments
  const { data: departments, error } = await supabase
    .from('departments')
    .select('id, name, color, funding_type')
    .eq('institution_id', institutionId)
    .order('name');
    
  if (error || !departments || departments.length === 0) {
    return (
       <div className="py-12 text-center">
         <p className="text-gray-500">No departments found for this institution.</p>
       </div>
    );
  }

  // 2. Fetch active schedules for this shift
  const { data: schedules } = await supabase
    .from('class_schedules')
    .select('department_id')
    .eq('shift', activeShift);
  
  const activeDeptIds = Array.from(new Set(schedules?.map(s => s.department_id).filter(Boolean) || []));

  if (activeDeptIds.length === 0) {
    return (
       <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center space-y-3">
         <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center">
            <span className="text-gray-500 font-bold text-xl">0</span>
         </div>
         <h3 className="text-gray-300 font-medium">No sessions scheduled</h3>
         <p className="text-gray-500 text-sm max-w-sm">There are no active departments with schedules for {activeShift}.</p>
       </div>
    );
  }

  // 3. Count students only for the active departments
  const { data: students } = await supabase
    .from('students')
    .select('department_id')
    .eq('institution_id', institutionId)
    .in('department_id', activeDeptIds);

  const deptStudentCounts = new Map<string, number>();
  if (students) {
    for (const student of students) {
      if (student.department_id) {
        deptStudentCounts.set(student.department_id, (deptStudentCounts.get(student.department_id) || 0) + 1);
      }
    }
  }

  // Only show departments that are active in this shift
  const mappedDepartments = departments
    .filter(d => activeDeptIds.includes(d.id))
    .map(d => ({
      ...d,
      studentCount: deptStudentCounts.get(d.id) || 0
    }));

  return <DepartmentGrid departments={mappedDepartments} activeShift={activeShift} />;
}

async function FacultyDirectoryLoader({ institutionId, activeShift }: { institutionId: string; activeShift: string }) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Filter faculty by active departments in the shift schedules
  const { data: schedules } = await supabase
    .from('class_schedules')
    .select('department_id, staff_id')
    .eq('shift', activeShift);

  const activeDeptIds = Array.from(new Set(schedules?.map(s => s.department_id).filter(Boolean) || []));
  const directStaffIds = Array.from(new Set(schedules?.map(s => s.staff_id).filter(Boolean) || []));

  // If no schedules exist for this shift, show empty
  if (activeDeptIds.length === 0 && directStaffIds.length === 0) {
    return (
       <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center space-y-3">
         <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center">
            <span className="text-gray-500 font-bold text-xl">0</span>
         </div>
         <p className="text-gray-500 text-sm">No faculty records for this shift.</p>
       </div>
    );
  }

  // Fetch staff who belong to the active departments
  const { data: staff, error } = await supabase
    .from('staff')
    .select('id, full_name')
    .eq('institution_id', institutionId)
    .in('department_id', activeDeptIds);

  if (error || !staff || staff.length === 0) {
    return (
       <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center space-y-3">
         <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center">
            <span className="text-gray-500 font-bold text-xl">0</span>
         </div>
         <p className="text-gray-500 text-sm">No faculty records for this shift.</p>
       </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-800">
      {staff.map((s: any) => (
         <div key={s.id} className="flex items-center gap-3 bg-gray-800/40 p-3 rounded-lg border border-gray-800/60 hover:bg-gray-800/80 transition-colors">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-semibold border border-indigo-500/30 shrink-0">
               {s.full_name?.charAt(0) || '?'}
            </div>
            <div className="flex flex-col">
              <span className="text-gray-200 font-medium">{s.full_name || 'Unknown Faculty'}</span>
              <span className="text-xs text-gray-500">Active Faculty</span>
            </div>
         </div>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------
// Placeholders
// ----------------------------------------------------------------------

function StatsPlaceholder() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
       <div className="bg-gray-800/40 border border-gray-800/60 rounded-xl p-5 space-y-3 h-[104px]"></div>
       <div className="bg-gray-800/40 border border-gray-800/60 rounded-xl p-5 space-y-3 h-[104px]"></div>
    </div>
  );
}

function ActiveDepartmentsPlaceholder() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between border-b border-gray-800/60 pb-4">
        <div className="h-5 bg-gray-800/80 rounded w-1/3"></div>
        <div className="h-5 bg-gray-800/80 rounded w-16"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col p-5 rounded-xl border border-gray-800/60 bg-gray-800/30 space-y-4">
             <div className="flex justify-between items-start">
               <div className="h-5 bg-gray-700/50 rounded w-1/2"></div>
               <div className="h-4 bg-gray-700/30 rounded w-16"></div>
             </div>
             <div className="pt-4 border-t border-gray-700/30 flex justify-between items-end">
               <div className="space-y-1">
                 <div className="h-3 bg-gray-700/30 rounded w-12"></div>
                 <div className="h-4 bg-gray-700/50 rounded w-8"></div>
               </div>
               <div className="h-8 w-8 bg-gray-700/50 rounded-full"></div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FacultyDirectoryPlaceholder() {
  return (
    <div className="animate-pulse space-y-4">
       {[1, 2, 3].map(i => (
         <div key={i} className="flex items-center gap-3 bg-gray-800/40 p-3 rounded-lg border border-gray-800/60">
            <div className="w-10 h-10 rounded-full bg-gray-700/50 shrink-0"></div>
            <div className="flex flex-col space-y-2 w-full">
              <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
              <div className="h-3 bg-gray-700/30 rounded w-1/2"></div>
            </div>
         </div>
       ))}
    </div>
  );
}
