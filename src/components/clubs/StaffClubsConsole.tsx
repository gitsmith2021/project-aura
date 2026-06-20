"use client";

import { useState } from "react";
import { Award, ChevronRight, Loader2, ArrowLeft } from "lucide-react";
import type { Club, ClubMember, ClubActivity } from "@/lib/clubs";
import { formatClubType } from "@/lib/clubs";
import { getClubMembers, getClubActivities, getSecretaryOptions } from "@/actions/clubs";
import ClubDetail from "./ClubDetail";

interface StaffClubsConsoleProps {
  clubs: Club[];
}

export default function StaffClubsConsole({ clubs }: StaffClubsConsoleProps) {
  const [activeClub, setActiveClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(false);
  const [clubDetail, setClubDetail] = useState<{
    members: ClubMember[];
    activities: ClubActivity[];
    students: { id: string; full_name: string; roll_no: string | null }[];
  } | null>(null);

  const handleSelectClub = async (club: Club) => {
    setLoading(true);
    try {
      const [mRes, aRes, sRes] = await Promise.all([
        getClubMembers(club.id),
        getClubActivities(club.id),
        getSecretaryOptions(club.institution_id),
      ]);
      
      const errors: string[] = [];
      if (!mRes.success) errors.push(mRes.error);
      if (!aRes.success) errors.push(aRes.error);
      if (!sRes.success) errors.push(sRes.error);

      if (mRes.success && aRes.success && sRes.success) {
        setClubDetail({
          members: mRes.data,
          activities: aRes.data,
          students: sRes.data,
        });
        setActiveClub(club);
      } else {
        alert("Failed to load details: " + errors.join(", "));
      }
    } catch {
      alert("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (activeClub && clubDetail) {
    return (
      <div>
        <button
          onClick={() => {
            setActiveClub(null);
            setClubDetail(null);
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-violet-600 transition-colors mb-4"
        >
          <ArrowLeft size={14} /> Back to My Units
        </button>
        <ClubDetail
          institutionId={activeClub.institution_id}
          club={activeClub}
          initialMembers={clubDetail.members}
          initialActivities={clubDetail.activities}
          students={clubDetail.students}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl w-full">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500 mb-2" />
          <p className="text-xs font-semibold">Loading console logs...</p>
        </div>
      ) : clubs.length === 0 ? (
        <div className="text-center p-16 rounded-2xl border border-dashed border-slate-250 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
          <Award className="h-10 w-10 text-slate-350 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No assigned groups found</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            You are not registered as the Faculty Coordinator for any clubs or organizations.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">My Coordinated Units</h2>
          <div className="grid grid-cols-1 gap-3">
            {clubs.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelectClub(c)}
                className="w-full text-left p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800/40 hover:border-violet-500/30 transition-all flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-violet-55 text-violet-700 dark:bg-violet-950/40 dark:text-violet-350 px-2 py-0.5 rounded">
                      {formatClubType(c.club_type)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {c.members_count || 0} enrolled
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {c.name}
                  </h3>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-violet-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
