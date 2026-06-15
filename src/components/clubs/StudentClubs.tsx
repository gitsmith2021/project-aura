"use client";

import { useState } from "react";
import { Award, Shield, User, FileText, X, Printer, Calendar } from "lucide-react";
import type { ClubMember, ClubType } from "@/lib/clubs";
import { formatClubType, formatClubMemberRole, CLUB_TYPE_COLORS } from "@/lib/clubs";

interface StudentClubsProps {
  memberships: ClubMember[];
  studentName: string;
  rollNo: string;
}

export default function StudentClubs({ memberships, studentName, rollNo }: StudentClubsProps) {
  const [selectedCert, setSelectedCert] = useState<ClubMember | null>(null);

  const handlePrint = () => {
    // Standard window print. The CSS print media query inside print styles will make sure only the certificate card prints.
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-2 mb-2">
        <Award size={20} className="text-violet-500" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">My Clubs & Organizations</h1>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-6">
        View your registered groups, roles, and download membership certificates for NAAC compliance files.
      </p>

      {memberships.length === 0 ? (
        <div className="text-center p-16 rounded-2xl border border-dashed border-slate-250 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
          <Award className="h-10 w-10 text-slate-350 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">You are not enrolled in any clubs</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Please contact your faculty coordinators to enroll in NCC, NSS, or cultural groups.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {memberships.map((m) => {
            const club = m.club;
            if (!club) return null;
            const typeColor = CLUB_TYPE_COLORS[club.club_type as ClubType] || CLUB_TYPE_COLORS.other;

            return (
              <div
                key={m.id}
                className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800/40 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${typeColor}`}>
                      {formatClubType(club.club_type)}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                      {formatClubMemberRole(m.role)}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{club.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{club.description}</p>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-2">
                    {club.coordinator && (
                      <div className="flex items-center gap-1.5">
                        <Shield size={13} className="text-slate-400" />
                        <span>Coordinator: {club.coordinator.full_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      <span>Enrolled since: {m.joined_at}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-4 flex">
                  <button
                    onClick={() => setSelectedCert(m)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                  >
                    <FileText size={14} /> View Certificate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Certificate Viewer Modal */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:absolute print:inset-0 bg-slate-950/40 backdrop-blur-sm print:bg-white print:backdrop-none">
          <div className="absolute inset-0 print:hidden" onClick={() => setSelectedCert(null)} />
          
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:rounded-none z-10 flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 print:hidden">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Membership Certificate</h2>
              <button
                onClick={() => setSelectedCert(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            {/* Certificate Body */}
            <div className="p-8 print:p-0 flex justify-center items-center flex-1 bg-slate-50 dark:bg-slate-950/20 print:bg-white">
              <div
                id="certificate-print-area"
                className="w-full max-w-xl aspect-[1.414] p-8 bg-white border-8 border-double border-violet-900/20 rounded-2xl flex flex-col justify-between items-center text-center shadow-md relative overflow-hidden print:shadow-none print:border-violet-900/20"
              >
                {/* Background watermark icon */}
                <div className="absolute -bottom-8 -right-8 opacity-[0.03] pointer-events-none">
                  <Award size={200} className="text-violet-950" />
                </div>

                {/* Header */}
                <div>
                  <h4 className="text-[10px] tracking-[0.2em] font-black uppercase text-violet-750">PROJECT AURA CAMPUS</h4>
                  <div className="h-0.5 w-12 bg-violet-750 mx-auto mt-1" />
                </div>

                {/* Title */}
                <div className="my-2">
                  <h2 className="text-2xl font-serif font-black tracking-tight text-slate-800">Certificate of Membership</h2>
                  <p className="text-[10px] text-slate-400 italic mt-1">This document certifies the active participation of the student listed below.</p>
                </div>

                {/* Student Details */}
                <div className="space-y-1 my-3">
                  <p className="text-[11px] text-slate-500">This is proudly presented to</p>
                  <h3 className="text-xl font-bold text-slate-950 font-sans tracking-wide underline decoration-dotted decoration-violet-500 underline-offset-4">
                    {studentName}
                  </h3>
                  {rollNo && <p className="text-[10px] text-slate-400 font-mono">Roll No: {rollNo}</p>}
                </div>

                {/* Participation Details */}
                <div className="space-y-1 max-w-md my-2 text-xs leading-relaxed text-slate-700">
                  <p>
                    for outstanding performance and active membership in the
                  </p>
                  <p className="font-bold text-slate-950 text-sm">{selectedCert.club?.name}</p>
                  <p className="text-[10px]">
                    holding the distinguished rank of{" "}
                    <strong className="text-violet-800 uppercase tracking-wide">
                      {formatClubMemberRole(selectedCert.role)}
                    </strong>{" "}
                    since <strong className="font-semibold">{selectedCert.joined_at}</strong>.
                  </p>
                </div>

                {/* Footer signatures */}
                <div className="w-full flex justify-between items-end pt-6 text-[10px] text-slate-500 border-t border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800">
                      {selectedCert.club?.coordinator?.full_name || "Faculty Coordinator"}
                    </p>
                    <p className="text-[9px] text-slate-400">Coordinator</p>
                  </div>
                  <div>
                    <p className="font-mono text-slate-400 text-[8px]">ID: {selectedCert.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Academic Director</p>
                    <p className="text-[9px] text-slate-400">AURA Board</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-150 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/30 print:hidden">
              <button
                onClick={() => setSelectedCert(null)}
                className="px-4 py-2 border border-slate-250 dark:border-slate-700 text-xs font-semibold rounded-xl text-slate-750 dark:text-slate-355 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Printer size={14} /> Print Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
