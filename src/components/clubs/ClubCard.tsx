"use client";

import Link from "next/link";
import { Users, Calendar, Shield, User, ArrowUpRight } from "lucide-react";
import type { Club } from "@/lib/clubs";
import { formatClubType, CLUB_TYPE_COLORS } from "@/lib/clubs";

interface ClubCardProps {
  club: Club;
  institutionSlug: string;
}

export default function ClubCard({ club, institutionSlug }: ClubCardProps) {
  const typeColor = CLUB_TYPE_COLORS[club.club_type] || CLUB_TYPE_COLORS.other;

  return (
    <div className="group relative flex flex-col justify-between p-6 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800/40 shadow-lg hover:shadow-xl hover:border-violet-500/30 dark:hover:border-violet-500/30 transition-all duration-300 transform hover:-translate-y-1">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${typeColor}`}>
            {formatClubType(club.club_type)}
          </span>
          <Link
            href={`/institutions/${institutionSlug}/clubs/${club.id}`}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-violet-100 dark:bg-slate-800 dark:hover:bg-violet-950 text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 transition-colors"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors mb-2">
          {club.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-6">
          {club.description || "No description provided."}
        </p>
      </div>

      {/* Meta & Stats */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60">
        <div className="grid grid-cols-2 gap-4 mb-4 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-violet-500" />
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {club.members_count || 0}
              </span>{" "}
              Members
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-emerald-500" />
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {club.activities_count || 0}
              </span>{" "}
              Activities
            </div>
          </div>
        </div>

        {/* Leadership */}
        <div className="space-y-1.5 text-xs">
          {club.coordinator && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Shield className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate">
                Coordinator:{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {club.coordinator.title ? `${club.coordinator.title} ` : ""}
                  {club.coordinator.full_name}
                </strong>
              </span>
            </div>
          )}
          {club.secretary && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate">
                Secretary:{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {club.secretary.full_name}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
