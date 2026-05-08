import { Building, Users, GraduationCap, MoreVertical, BookOpen } from "lucide-react";
import { Badge } from "../ui/Badge";
import Link from "next/link";

export type College = {
  id: string;
  name: string;
  college_type: string;
  status?: 'active' | 'inactive';
  subdomain?: string;
  studentsCount?: number;
  staffCount?: number;
  departmentsCount?: number;
};

export function CollegeCard({ college }: { college: College }) {
  const status = college.status || 'active';
  const studentsCount = college.studentsCount || 0;
  const staffCount = college.staffCount || 0;
  const departmentsCount = college.departmentsCount || 0;

  const typeLabel = college.college_type ? college.college_type.toUpperCase() : '';

  return (
    <Link href={`/institutions/${college.id}`} className="bg-white rounded-md border border-slate-200 p-4 flex flex-col group hover:border-purple-300 transition-colors block text-left">
      <div className="flex justify-between items-start mb-3">
        <div className="w-10 h-10 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-purple-50 group-hover:border-purple-100 transition-colors">
          <Building className="text-slate-400 w-5 h-5 group-hover:text-purple-600 transition-colors" />
        </div>
        <div className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-50 transition-colors">
          <MoreVertical size={16} />
        </div>
      </div>
      
      <div className="mb-3 flex-1">
        <h3 className="text-sm font-semibold text-slate-900 mb-1.5 line-clamp-1" title={college.name}>
          {college.name}
        </h3>
        <div className="flex items-center gap-1.5 mt-2">
          {college.college_type && (
            <Badge variant={college.college_type}>
              {typeLabel}
            </Badge>
          )}
          {status && (
            <Badge variant={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-0 divide-x divide-slate-100 text-xs text-slate-500 mb-3">
        <div className="flex flex-col items-center justify-center px-1">
          <div className="flex items-center gap-1 mb-1">
            <BookOpen size={12} className="text-slate-400" />
            <span className="font-semibold text-slate-700">{departmentsCount.toLocaleString()}</span>
          </div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Depts</span>
        </div>
        <div className="flex flex-col items-center justify-center px-1">
          <div className="flex items-center gap-1 mb-1">
            <GraduationCap size={12} className="text-slate-400" />
            <span className="font-semibold text-slate-700">{staffCount.toLocaleString()}</span>
          </div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Staff</span>
        </div>
        <div className="flex flex-col items-center justify-center px-1">
          <div className="flex items-center gap-1 mb-1">
            <Users size={12} className="text-slate-400" />
            <span className="font-semibold text-slate-700">{studentsCount.toLocaleString()}</span>
          </div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Students</span>
        </div>
      </div>
      
      <div className="mt-auto pt-3 border-t border-slate-100 flex justify-center">
        <span className="text-xs font-semibold text-purple-600 group-hover:text-purple-700 transition-colors flex items-center gap-1">
          View Details <span className="text-[10px]">&rarr;</span>
        </span>
      </div>
    </Link>
  );
}
