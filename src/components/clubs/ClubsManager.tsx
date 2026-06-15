"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Search, Award, FileText, Check, AlertCircle, X, Sparkles } from "lucide-react";
import type { Club, ClubType, NAACReportData } from "@/lib/clubs";
import { CLUB_TYPE_LABELS, CLUB_TYPE_COLORS, formatClubType, formatClubActivityType } from "@/lib/clubs";
import ClubCard from "./ClubCard";
import { addClub } from "@/actions/clubs";

interface ClubsManagerProps {
  institutionId: string;
  initialClubs: Club[];
  coordinators: { id: string; full_name: string }[];
  secretaries: { id: string; full_name: string; roll_no: string | null }[];
  initialNaacReport: NAACReportData | null;
}

export default function ClubsManager({
  institutionId,
  initialClubs,
  coordinators,
  secretaries,
  initialNaacReport,
}: ClubsManagerProps) {
  const [clubs, setClubs] = useState<Club[]>(initialClubs);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ClubType | "">("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  
  // Drawer Form State
  const [name, setName] = useState("");
  const [clubType, setClubType] = useState<ClubType>("nss");
  const [coordinatorId, setCoordinatorId] = useState("");
  const [secretaryId, setSecretaryId] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isPending, startTransition] = useTransition();

  // Stats
  const totalMembers = useMemo(() => {
    return clubs.reduce((sum, c) => sum + (c.members_count || 0), 0);
  }, [clubs]);

  const totalActivities = useMemo(() => {
    return clubs.reduce((sum, c) => sum + (c.activities_count || 0), 0);
  }, [clubs]);

  const nssNccCount = useMemo(() => {
    return clubs.filter(c => c.club_type === "nss" || c.club_type === "ncc").length;
  }, [clubs]);

  // Filtering
  const filtered = useMemo(() => {
    return clubs.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description || "").toLowerCase().includes(search.toLowerCase());
      const matchesType = !typeFilter || c.club_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [clubs, search, typeFilter]);

  // Add Club Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Club name is required.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const res = await addClub({
        institution_id: institutionId,
        name: name.trim(),
        club_type: clubType,
        faculty_coordinator: coordinatorId || null,
        student_secretary_id: secretaryId || null,
        description: description.trim() || null,
        is_active: isActive,
      });

      if (!res.success) {
        setError(res.error);
        return;
      }

      // Prepend the new club locally
      setClubs((prev) => [res.data, ...prev]);
      
      // Reset form
      setName("");
      setClubType("nss");
      setCoordinatorId("");
      setSecretaryId("");
      setDescription("");
      setIsActive(true);
      setDrawerOpen(false);
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            Student Clubs & Organizations <Sparkles className="h-6 w-6 text-violet-500" />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Coordinate NSS, NCC, fests, sports councils, and track NAAC Criterion 5.3 participation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/70 hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm transition-all duration-300"
          >
            <FileText size={15} className="text-violet-500" /> NAAC 5.3 Report
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-500/20 transition-all duration-300"
          >
            <Plus size={16} strokeWidth={2.5} /> Add Organization
          </button>
        </div>
      </div>

      {/* Stats Counter Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatWidget label="Total Groups" value={clubs.length} description="Active committees" icon={<Award className="h-5 w-5 text-indigo-500" />} />
        <StatWidget label="Enrolled Students" value={totalMembers} description="Across all organizations" icon={<Plus className="h-5 w-5 text-emerald-500" />} />
        <StatWidget label="Logged Activities" value={totalActivities} description="Events & camps" icon={<Sparkles className="h-5 w-5 text-violet-500" />} />
        <StatWidget label="NSS / NCC Units" value={nssNccCount} description="Govt. aligned segments" icon={<Award className="h-5 w-5 text-teal-500" />} />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 bg-white/40 dark:bg-slate-900/20 backdrop-blur-md p-3 rounded-2xl border border-white/20 dark:border-slate-800/30">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clubs by name or keywords..."
            className="h-10 w-full pl-10 pr-4 bg-white/70 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-slate-100 placeholder-slate-400"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ClubType | "")}
          className="h-10 px-3 text-xs border border-slate-200 dark:border-slate-700/60 rounded-xl bg-white/70 dark:bg-slate-850/60 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-48"
        >
          <option value="">All Categories</option>
          {Object.entries(CLUB_TYPE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400 shrink-0 font-medium px-2">
          {filtered.length} of {clubs.length} clubs
        </span>
      </div>

      {/* Roster Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/10">
          <Award className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No organizations found</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting filters or register a new club to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((club) => (
            <ClubCard
              key={club.id}
              club={club}
              institutionSlug={institutionId} // Middleware handles UUID mapping from slug automatically
            />
          ))}
        </div>
      )}

      {/* sliding Drawer: Add Club */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col h-full z-10 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Add New Organization</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Club / Group Name
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. National Service Scheme (NSS)"
                  className="w-full h-10 px-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Organization Category
                </label>
                <select
                  value={clubType}
                  onChange={(e) => setClubType(e.target.value as ClubType)}
                  className="w-full h-10 px-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {Object.entries(CLUB_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Faculty Coordinator
                </label>
                <select
                  value={coordinatorId}
                  onChange={(e) => setCoordinatorId(e.target.value)}
                  className="w-full h-10 px-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Select Coordinator (Optional)</option>
                  {coordinators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Student Secretary
                </label>
                <select
                  value={secretaryId}
                  onChange={(e) => setSecretaryId(e.target.value)}
                  className="w-full h-10 px-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Select Student Leader (Optional)</option>
                  {secretaries.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} {s.roll_no ? `(${s.roll_no})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize aims and activities..."
                  className="w-full p-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 text-violet-600 focus:ring-violet-500 rounded border-slate-300"
                />
                <label htmlFor="isActive" className="text-xs font-semibold text-slate-700 dark:text-slate-350 select-none">
                  Mark as Active group
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-1.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border border-rose-100 dark:border-rose-900/30 text-xs">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex-1 h-10 border border-slate-250 dark:border-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 h-10 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-xs font-semibold rounded-xl text-white shadow-md shadow-violet-500/10"
                >
                  {isPending ? "Saving..." : "Create Club"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: NAAC 5.3 Report */}
      {reportOpen && initialNaacReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setReportOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  NAAC Criterion 5.3.3 Export
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Extracurricular sports, NSS, NCC, and cultural activities validation ledger.
                </p>
              </div>
              <button
                onClick={() => setReportOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Aggregates */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-100 dark:border-slate-800/80">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total Registered Clubs</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    {initialNaacReport.totalClubs}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-100 dark:border-slate-800/80">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Unique Student Roster</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    {initialNaacReport.totalMembers}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-100 dark:border-slate-800/80">
                  <p className="text-[10px] uppercase font-bold text-slate-400">NSS / NCC Participations</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    {initialNaacReport.nssNCCParticipants}
                  </p>
                </div>
              </div>

              {/* Table details */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Accreditation Metrics & Distribution
                </h3>
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-850 text-left text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Organizations</th>
                        <th className="p-3 text-right">Logged Events</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {Object.entries(CLUB_TYPE_LABELS).map(([k, label]) => {
                        const clubCount = initialNaacReport.clubTypeCounts[k as ClubType] || 0;
                        return (
                          <tr key={k} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20">
                            <td className="p-3 font-semibold text-slate-700 dark:text-slate-355">{label}</td>
                            <td className="p-3 text-right text-slate-900 dark:text-slate-200 font-bold">{clubCount}</td>
                            <td className="p-3 text-right text-slate-500 dark:text-slate-400 font-mono">
                              {k === "nss" || k === "ncc" ? (
                                <span className="text-teal-600 dark:text-teal-400 font-bold">
                                  {k === "nss" ? initialNaacReport.activityTypeCounts.community_service : 0}
                                </span>
                              ) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-150 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/30">
              <button
                onClick={() => setReportOpen(false)}
                className="px-4 py-2 border border-slate-250 dark:border-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl"
              >
                Print Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatWidget({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800/40 shadow-sm flex items-start justify-between">
      <div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
          {label}
        </span>
        <h4 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
          {value}
        </h4>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
          {description}
        </span>
      </div>
      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50">
        {icon}
      </div>
    </div>
  );
}
