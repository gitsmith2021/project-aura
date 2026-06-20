"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Users,
  Calendar,
  Shield,
  User,
  Trash2,
  ArrowLeft,
  Settings,
  AlertCircle,
  MapPin,
  X,
  PlusCircle,
} from "lucide-react";
import type { Club, ClubMember, ClubActivity, ClubMemberRole, ClubActivityType } from "@/lib/clubs";
import {
  CLUB_MEMBER_ROLE_LABELS,
  CLUB_ACTIVITY_TYPE_LABELS,
  CLUB_TYPE_COLORS,
  formatClubType,
  formatClubMemberRole,
  formatClubActivityType,
} from "@/lib/clubs";
import { addClubMember, removeClubMember, logClubActivity, deleteClubActivity, updateClub } from "@/actions/clubs";

interface ClubDetailProps {
  institutionId: string;
  club: Club;
  initialMembers: ClubMember[];
  initialActivities: ClubActivity[];
  students: { id: string; full_name: string; roll_no: string | null }[];
}

export default function ClubDetail({
  institutionId,
  club: initialClub,
  initialMembers,
  initialActivities,
  students,
}: ClubDetailProps) {
  const [club, setClub] = useState<Club>(initialClub);
  const [members, setMembers] = useState<ClubMember[]>(initialMembers);
  const [activities, setActivities] = useState<ClubActivity[]>(initialActivities);
  const [activeTab, setActiveTab] = useState<"roster" | "activities">("roster");

  // Modals / Drawers Open State
  const [editOpen, setEditOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addActivityOpen, setAddActivityOpen] = useState(false);

  // Form States
  const [editName, setEditName] = useState(club.name);
  const [editDesc, setEditDesc] = useState(club.description || "");
  const [editActive, setEditActive] = useState(club.is_active);

  const [studentId, setStudentId] = useState("");
  const [memberRole, setMemberRole] = useState<ClubMemberRole>("member");

  const [actTitle, setActTitle] = useState("");
  const [actType, setActType] = useState<ClubActivityType>("event");
  const [actDate, setActDate] = useState("");
  const [actVenue, setActVenue] = useState("");
  const [actParticipants, setActParticipants] = useState(0);
  const [actDesc, setActDesc] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const typeColor = CLUB_TYPE_COLORS[club.club_type] || CLUB_TYPE_COLORS.other;

  // Handle Edit Club
  const handleEditClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setError("Club name is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await updateClub(club.id, {
        institution_id: institutionId,
        name: editName.trim(),
        description: editDesc.trim() || null,
        is_active: editActive,
        club_type: club.club_type,
        faculty_coordinator: club.faculty_coordinator,
        student_secretary_id: club.student_secretary_id,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setClub(res.data);
      setEditOpen(false);
    });
  };

  // Handle Add Member
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      setError("Please select a student.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await addClubMember(club.id, studentId, memberRole, institutionId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setMembers((prev) => [res.data, ...prev]);
      setStudentId("");
      setMemberRole("member");
      setAddMemberOpen(false);
    });
  };

  // Handle Remove Member
  const handleRemoveMember = async (mId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    const res = await removeClubMember(mId, club.id, institutionId);
    if (!res.success) {
      alert(res.error);
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== mId));
  };

  // Handle Log Activity
  const handleLogActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim()) {
      setError("Activity title is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await logClubActivity(
        club.id,
        {
          title: actTitle.trim(),
          activity_type: actType,
          activity_date: actDate,
          venue: actVenue.trim() || null,
          participants_count: actParticipants,
          description: actDesc.trim() || null,
          photo_urls: [],
        },
        institutionId
      );
      if (!res.success) {
        setError(res.error);
        return;
      }
      setActivities((prev) => [res.data, ...prev]);
      setActTitle("");
      setActType("event");
      setActDate("");
      setActVenue("");
      setActParticipants(0);
      setActDesc("");
      setAddActivityOpen(false);
    });
  };

  // Handle Delete Activity
  const handleDeleteActivity = async (aId: string) => {
    if (!confirm("Are you sure you want to delete this activity log?")) return;
    const res = await deleteClubActivity(aId, club.id, institutionId);
    if (!res.success) {
      alert(res.error);
      return;
    }
    setActivities((prev) => prev.filter((a) => a.id !== aId));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      {/* Back to list */}
      <Link
        href={`/institutions/${institutionId}/clubs`}
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors mb-6"
      >
        <ArrowLeft size={14} /> Back to Organizations
      </Link>

      {/* Header Info Block */}
      <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800/40 p-6 rounded-3xl shadow-lg mb-8 flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-3 max-w-3xl">
          <div className="flex items-center gap-2.5">
            <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${typeColor}`}>
              {formatClubType(club.club_type)}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                club.is_active
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
              }`}
            >
              {club.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{club.name}</h1>
          <p className="text-sm text-slate-650 dark:text-slate-400 leading-relaxed">
            {club.description || "No description provided."}
          </p>

          <div className="pt-2 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
            {club.coordinator && (
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-indigo-500" />
                <span>
                  Coordinator:{" "}
                  <strong>
                    {club.coordinator.title ? `${club.coordinator.title} ` : ""}
                    {club.coordinator.full_name}
                  </strong>{" "}
                  ({club.coordinator.email})
                </span>
              </div>
            )}
            {club.secretary && (
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-violet-500" />
                <span>
                  Student Secretary: <strong>{club.secretary.full_name}</strong>{" "}
                  {club.secretary.roll_no ? `(${club.secretary.roll_no})` : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setEditOpen(true)}
          className="flex items-center gap-1 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950 hover:bg-slate-50 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-300"
        >
          <Settings size={14} /> Configure
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-250 dark:border-slate-800/80 mb-6">
        <button
          onClick={() => setActiveTab("roster")}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] flex items-center gap-1.5 ${
            activeTab === "roster"
              ? "border-violet-500 text-violet-600 dark:text-violet-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-250"
          }`}
        >
          <Users size={15} /> Members Roster ({members.length})
        </button>
        <button
          onClick={() => setActiveTab("activities")}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] flex items-center gap-1.5 ${
            activeTab === "activities"
              ? "border-violet-500 text-violet-600 dark:text-violet-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-250"
          }`}
        >
          <Calendar size={15} /> Activities Log ({activities.length})
        </button>
      </div>

      {/* Roster View */}
      {activeTab === "roster" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Registered Students</h3>
            <button
              onClick={() => setAddMemberOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
            >
              <PlusCircle size={14} /> Enroll Member
            </button>
          </div>

          {members.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-12">No student members enrolled in this club yet.</p>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 text-left text-[10px] uppercase font-bold text-slate-400">
                    <th className="p-3.5">Student</th>
                    <th className="p-3.5">Program / Year</th>
                    <th className="p-3.5">Club Role</th>
                    <th className="p-3.5">Joined Date</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20">
                      <td className="p-3.5">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{m.student?.full_name}</p>
                          <p className="text-[10px] text-slate-400">{m.student?.roll_no || "No roll number"}</p>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-350">
                        {m.student?.student_program || "—"} · Year {m.student?.student_year || "—"}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-350">
                          {formatClubMemberRole(m.role)}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 dark:text-slate-450">{m.joined_at}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Remove Member"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Activities View */}
      {activeTab === "activities" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Events and Camp log</h3>
            <button
              onClick={() => setAddActivityOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
            >
              <PlusCircle size={14} /> Log Activity
            </button>
          </div>

          {activities.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-12">No activities logged yet.</p>
          ) : (
            <div className="space-y-4">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                  <div className="space-y-2 max-w-3xl">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                        {formatClubActivityType(act.activity_type)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                        <Calendar size={11} /> {act.activity_date}
                      </span>
                      {act.venue && (
                        <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                          <MapPin size={11} /> {act.venue}
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{act.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{act.description}</p>
                    <p className="text-[10px] font-bold text-slate-400">
                      Participants count: <span className="text-slate-800 dark:text-slate-200 font-extrabold">{act.participants_count || 0}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteActivity(act.id)}
                    className="p-1.5 self-end sm:self-start text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Club Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setEditOpen(false)} />
          <form
            onSubmit={handleEditClub}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Configure {club.name}</h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Name</label>
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full p-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editActive"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="h-4 w-4 text-violet-650 focus:ring-violet-500 rounded border-slate-350"
                />
                <label htmlFor="editActive" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Active status</label>
              </div>

              {error && (
                <div className="flex items-center gap-1 bg-rose-50 text-rose-600 px-3 py-2 border border-rose-150 rounded-xl text-xs">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/30">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="px-3.5 py-1.5 border border-slate-250 dark:border-slate-700 text-xs font-semibold rounded-xl text-slate-750 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-xs font-semibold rounded-xl text-white"
              >
                {isPending ? "Saving..." : "Save Config"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Member Modal */}
      {addMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setAddMemberOpen(false)} />
          <form
            onSubmit={handleAddMember}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Enroll Student</h3>
              <button
                type="button"
                onClick={() => setAddMemberOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Select Student</label>
                <select
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="">Choose Student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} {s.roll_no ? `(${s.roll_no})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Roster Role</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as ClubMemberRole)}
                  className="w-full h-9 px-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {Object.entries(CLUB_MEMBER_ROLE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="flex items-center gap-1 bg-rose-50 text-rose-600 px-3 py-2 border border-rose-150 rounded-xl text-xs">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/30">
              <button
                type="button"
                onClick={() => setAddMemberOpen(false)}
                className="px-3.5 py-1.5 border border-slate-250 dark:border-slate-700 text-xs font-semibold rounded-xl text-slate-750 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-xs font-semibold rounded-xl text-white"
              >
                {isPending ? "Enrolling..." : "Add Member"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Log Activity Modal */}
      {addActivityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setAddActivityOpen(false)} />
          <form
            onSubmit={handleLogActivity}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Log Club Activity</h3>
              <button
                type="button"
                onClick={() => setAddActivityOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3.5 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Activity Title</label>
                <input
                  required
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  placeholder="e.g. Swachh Bharat Cleanliness Drive"
                  className="w-full h-9 px-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Activity Type</label>
                <select
                  value={actType}
                  onChange={(e) => setActType(e.target.value as ClubActivityType)}
                  className="w-full h-9 px-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {Object.entries(CLUB_ACTIVITY_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Activity Date</label>
                  <input
                    type="date"
                    required
                    value={actDate}
                    onChange={(e) => setActDate(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Participants Count</label>
                  <input
                    type="number"
                    min="0"
                    value={actParticipants}
                    onChange={(e) => setActParticipants(parseInt(e.target.value) || 0)}
                    className="w-full h-9 px-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Venue / Location</label>
                <input
                  value={actVenue}
                  onChange={(e) => setActVenue(e.target.value)}
                  placeholder="e.g. Auditorium / Nearby Village"
                  className="w-full h-9 px-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={actDesc}
                  onChange={(e) => setActDesc(e.target.value)}
                  placeholder="Aim, program flow, highlights..."
                  className="w-full p-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-1 bg-rose-50 text-rose-600 px-3 py-2 border border-rose-150 rounded-xl text-xs">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/30">
              <button
                type="button"
                onClick={() => setAddActivityOpen(false)}
                className="px-3.5 py-1.5 border border-slate-250 dark:border-slate-700 text-xs font-semibold rounded-xl text-slate-750 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-xs font-semibold rounded-xl text-white"
              >
                {isPending ? "Logging..." : "Log Activity"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
