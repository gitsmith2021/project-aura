import React from 'react';

export interface Department {
  id: string;
  name: string;
  color?: string;
  studentCount?: number;
}

interface DepartmentGridProps {
  departments: Department[];
  activeShift: string;
}

export function DepartmentGrid({ departments, activeShift }: DepartmentGridProps) {
  if (!departments || departments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-gray-800 border-dashed rounded-xl bg-gray-900/20">
        <div className="w-16 h-16 mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-200">No departments found</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-md text-center">
          No active departments were found for this institution and shift.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {departments.map((dept) => (
        <div key={dept.id} className="group flex flex-col p-5 rounded-xl border border-gray-800 bg-gray-900/40 hover:bg-gray-800/80 transition-all duration-200">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-gray-100 text-lg group-hover:text-white transition-colors line-clamp-1 mr-4">
              {dept.name}
            </h3>
            {/* Live Status */}
            <span className="shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Now
            </span>
          </div>
          
          <div className="mt-auto pt-4 border-t border-gray-800/60 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Students</span>
              <span className="text-sm text-gray-300 font-semibold mt-0.5">
                 {dept.studentCount || 0}
              </span>
            </div>
            
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-indigo-500/20 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
