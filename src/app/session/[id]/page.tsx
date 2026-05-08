"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SessionSummaryModal } from "@/components/analytics/SessionSummaryModal";
import { 
  ChevronLeft, Clock, User, CheckCircle2, Circle, 
  Wifi, ShieldCheck, Users, X, Download, MessageSquare, AlertCircle, FileText, LogOut
} from "lucide-react";

type Student = {
  id: string;
  full_name: string;
};

type Schedule = {
  id: string;
  start_time: string;
  end_time: string;
  department_id: string;
  subject_name: string;
  staff: { full_name: string } | null;
};

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = params.id as string;
  
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const fetchSessionData = async () => {
      const supabase = createClient();
      
      // 1. Fetch Schedule Details
      const { data: scheduleData, error: scheduleError } = await supabase
        .from("schedules")
        .select("id, start_time, end_time, department_id, subject_name, staff:profiles(full_name)")
        .eq("id", scheduleId)
        .single();
        
      if (scheduleError || !scheduleData) {
        if (scheduleError?.code !== 'PGRST116') {
          console.error("Error fetching schedule:", scheduleError);
        }
        setLoading(false);
        return;
      }
      
      setSchedule(scheduleData as unknown as Schedule);

      // 2. Fetch Students for this Department
      const { data: studentsData, error: studentsError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("department_id", scheduleData.department_id)
        .eq("role", "STUDENT")
        .order("full_name");
        
      if (studentsError) {
        console.error("Error fetching students:", studentsError);
      } else if (studentsData) {
        setStudents(studentsData);
        // Initialize attendance to false (Pending) for all students
        const initialAttendance: Record<string, boolean> = {};
        studentsData.forEach(s => {
          initialAttendance[s.id] = false;
        });
        setAttendance(initialAttendance);
      }
      
      setLoading(false);
    };

    if (scheduleId) {
      fetchSessionData();
    }
  }, [scheduleId]);

  const simulateNFCTap = () => {
    // Find students who are still pending
    const pendingStudentIds = Object.keys(attendance).filter(id => !attendance[id]);
    
    if (pendingStudentIds.length === 0) {
      alert("All students are already marked present!");
      return;
    }
    
    // Pick a random pending student
    const randomIndex = Math.floor(Math.random() * pendingStudentIds.length);
    const randomStudentId = pendingStudentIds[randomIndex];
    
    // Mark as present
    setAttendance(prev => ({
      ...prev,
      [randomStudentId]: true
    }));
  };

  const handleEndSession = async () => {
    const supabase = createClient();
    
    // Update status to completed
    const { error } = await supabase
      .from("schedules")
      .update({ status: "completed" })
      .eq("id", scheduleId);
      
    if (error) {
      console.error("Error ending session:", error);
      alert("Failed to end session. Please try again.");
      return;
    }
    
    setShowSummary(true);
  };

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hours = h % 12 || 12;
    return `${hours}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!schedule) {
    return (
      <DashboardLayout>
        <div className="p-6 w-full text-center py-20">
          <h2 className="text-xl font-semibold text-slate-700">Session not found</h2>
          <button 
            onClick={() => router.push("/")}
            className="mt-4 text-violet-600 hover:underline"
          >
            Return to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const totalCount = students.length;
  const attendancePercentage = totalCount === 0 ? 0 : Math.round((presentCount / totalCount) * 100);
  const missingStudents = students.filter(s => !attendance[s.id]);

  return (
    <DashboardLayout>
      <div className="p-6 w-full">
        
        {/* Header */}
        <button 
          onClick={() => router.push("/")}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors mb-4 text-sm font-medium"
        >
          <ChevronLeft size={16} /> Back to Dashboard
        </button>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider">Live Session</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{schedule.subject_name || "Session"}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-600">
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                  <Clock size={14} className="text-slate-400" />
                  <span>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                  <User size={14} className="text-slate-400" />
                  <span>{schedule.staff?.full_name || "Unknown Teacher"}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-3 bg-slate-50 p-4 rounded-lg border border-slate-100 min-w-[200px]">
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-medium text-slate-600 flex items-center gap-1.5"><Users size={14} /> Attendance</span>
                <span className="text-lg font-bold text-slate-900">{presentCount} <span className="text-sm text-slate-500 font-normal">/ {totalCount}</span></span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${attendancePercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-900">Student Roster</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={simulateNFCTap}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-semibold shadow-sm transition-all active:scale-95"
            >
              <Wifi size={16} />
              Simulate NFC Tap
            </button>
            <button
              onClick={handleEndSession}
              className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white px-4 py-2 rounded-lg font-semibold shadow-sm shadow-red-500/20 transition-all active:scale-95"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">End & Summarize Session</span>
              <span className="sm:hidden">End Session</span>
            </button>
          </div>
        </div>

        {/* Student Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {students.map(student => {
            const isPresent = attendance[student.id];
            return (
              <div 
                key={student.id} 
                className={`p-4 rounded-xl border transition-all duration-300 flex items-center justify-between ${
                  isPresent 
                    ? "bg-emerald-50 border-emerald-200 shadow-sm shadow-emerald-100/50" 
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    isPresent ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {student.full_name.split(" ").map(n => n[0]).join("").substring(0, 2)}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isPresent ? "text-emerald-900" : "text-slate-700"}`}>
                      {student.full_name}
                    </p>
                    <p className={`text-[11px] ${isPresent ? "text-emerald-600" : "text-slate-400"}`}>
                      ID: {student.id.substring(0, 8)}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-center">
                  {isPresent ? (
                    <div className="flex flex-col items-center animate-in zoom-in duration-300">
                      <ShieldCheck size={20} className="text-emerald-500 mb-1" />
                      <span className="text-[10px] font-bold text-emerald-600 uppercase">Marked</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Circle size={20} className="text-slate-300 mb-1" />
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Pending</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {students.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed">
              No students found in this department.
            </div>
          )}
        </div>

        {/* Summary Modal Overlay */}
        {showSummary && (
          <SessionSummaryModal 
            scheduleId={scheduleId} 
            onClose={() => router.push("/")} 
          />
        )}
      </div>
    </DashboardLayout>
  );
}
