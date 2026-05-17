"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { X, Download, MessageSquare, AlertCircle, FileText, CheckCircle2, Users, Clock, User } from "lucide-react";

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

interface SessionSummaryModalProps {
  scheduleId: string;
  onClose: () => void;
}

export function SessionSummaryModal({ scheduleId, onClose }: SessionSummaryModalProps) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessionData = async () => {
      const supabase = createClient();
      
      const { data: scheduleData, error: scheduleError } = await supabase
        .from("schedules")
        .select("id, start_time, end_time, department_id, subject_name, staff:staff(full_name)")
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

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, full_name")
        .eq("department_id", scheduleData.department_id)
        .order("full_name");
        
      if (studentsError) {
        console.error("Error fetching students:", studentsError);
      } else if (studentsData) {
        setStudents(studentsData);
        
        const { data: attendanceData } = await supabase
          .from("attendance")
          .select("student_id, status")
          .eq("schedule_id", scheduleId);
          
        const attendanceMap: Record<string, boolean> = {};
        studentsData.forEach(s => { attendanceMap[s.id] = false; });
        
        if (attendanceData) {
          attendanceData.forEach(record => {
            if (record.status === "present") attendanceMap[record.student_id] = true;
          });
        }
        
        setAttendance(attendanceMap);
      }
      
      setLoading(false);
    };

    if (scheduleId) fetchSessionData();
  }, [scheduleId]);

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hours = h % 12 || 12;
    return `${hours}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const totalCount = students.length;
  const attendancePercentage = totalCount === 0 ? 0 : Math.round((presentCount / totalCount) * 100);
  const missingStudents = students.filter(s => !attendance[s.id]);
  const presentStudents = students.filter(s => attendance[s.id]);

  const ringCircumference = 2 * Math.PI * 52; // r=52

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>

      {/* Dim backdrop */}
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] animate-in fade-in duration-200" />

      {/* Slide-in panel */}
      <div
        className="relative h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <FileText size={15} className="text-violet-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">Session Report</h2>
                {schedule && (
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <Clock size={10} className="text-slate-400" />
                    {schedule.subject_name || "Session"} · {formatTime(schedule.start_time)}–{formatTime(schedule.end_time)}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            >
              <X size={15} />
            </button>
          </div>

          {/* Teacher pill */}
          {schedule?.staff?.full_name && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1 text-[11px] text-slate-600">
              <User size={10} className="text-slate-400" />
              {schedule.staff.full_name}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600" />
            </div>
          ) : !schedule ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
              <p className="text-sm font-medium">Session not found</p>
              <button onClick={onClose} className="text-xs text-violet-600 hover:underline">Close</button>
            </div>
          ) : (
            <>
              {/* ── Attendance Ring ── */}
              <div className="px-5 py-6 border-b border-slate-100">
                <div className="flex items-center gap-6">
                  {/* SVG ring */}
                  <div className="relative w-[120px] h-[120px] shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" stroke="#f1f5f9" />
                      <circle
                        cx="60" cy="60" r="52" fill="none"
                        strokeWidth="10"
                        stroke="#7c3aed"
                        strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringCircumference - (ringCircumference * attendancePercentage) / 100}
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center leading-tight">
                      <span className="text-2xl font-bold text-slate-900">{attendancePercentage}%</span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Present</span>
                    </div>
                  </div>

                  {/* Stat pills */}
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 size={12} /> Present
                      </span>
                      <span className="text-sm font-bold text-emerald-900">{presentCount}</span>
                    </div>
                    <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1.5">
                        <AlertCircle size={12} /> Absent
                      </span>
                      <span className="text-sm font-bold text-amber-900">{missingStudents.length}</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                      <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                        <Users size={12} /> Total
                      </span>
                      <span className="text-sm font-bold text-slate-900">{totalCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Absent Roster ── */}
              <div className="px-5 pt-5 pb-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <AlertCircle size={11} className={missingStudents.length > 0 ? "text-amber-500" : "text-emerald-500"} />
                  Absent Students · {missingStudents.length}
                </h3>

                {missingStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                    <CheckCircle2 size={28} className="text-emerald-500 mb-2" />
                    <p className="text-xs font-bold text-emerald-900">Perfect Attendance!</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Every student attended this session.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {missingStudents.map(student => (
                      <div key={student.id} className="flex items-center justify-between p-2.5 bg-amber-50/60 border border-amber-100/80 rounded-xl group">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {student.full_name.split(" ").map(n => n[0]).join("").substring(0, 2)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 leading-tight">{student.full_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">#{student.id.substring(0, 8)}</p>
                          </div>
                        </div>
                        <button className="flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-200 text-amber-600 hover:bg-amber-50 rounded-lg text-[10px] font-semibold transition-colors opacity-0 group-hover:opacity-100">
                          <MessageSquare size={10} /> Alert
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Present Roster (collapsed summary) ── */}
              {presentStudents.length > 0 && (
                <div className="px-5 pb-6">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <CheckCircle2 size={11} className="text-emerald-500" />
                    Present Students · {presentStudents.length}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {presentStudents.map(student => (
                      <span key={student.id} className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full px-2.5 py-1 text-[10px] font-semibold">
                        <CheckCircle2 size={9} />
                        {student.full_name.split(" ")[0]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {!loading && schedule && (
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center gap-2.5 shrink-0">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors shadow-sm shadow-violet-600/20">
              <Download size={13} />
              Export PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
