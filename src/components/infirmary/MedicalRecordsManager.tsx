"use client";

import { useState } from "react";
import { Search, FileEdit, UserCheck, UserX } from "lucide-react";
import { getMedicalRecords, type MedicalRecord } from "@/actions/infirmary";
import { MedicalProfileDrawer } from "./MedicalProfileDrawer";

type Props = {
  institutionId: string;
  initialRecords: MedicalRecord[];
};

const BLOOD_GROUP_COLOR: Record<string, string> = {
  "A+": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "A-": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "B+": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "B-": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "AB+": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "AB-": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "O+": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "O-": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export function MedicalRecordsManager({ institutionId, initialRecords }: Props) {
  const [records, setRecords] = useState<MedicalRecord[]>(initialRecords);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<MedicalRecord | null | "new">(null);
  const [editStudentId, setEditStudentId] = useState<string>("");
  const [editStudentName, setEditStudentName] = useState<string>("");

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.student?.full_name?.toLowerCase().includes(q) ||
      r.student?.roll_no?.toLowerCase().includes(q) ||
      r.blood_group?.toLowerCase().includes(q)
    );
  });

  const openEdit = (rec: MedicalRecord) => {
    setEditing(rec);
    setEditStudentId(rec.student_id);
    setEditStudentName(rec.student?.full_name ?? "Unknown");
  };

  const handleSaved = async (updated: MedicalRecord) => {
    setRecords((prev) =>
      prev.map((r) => (r.student_id === updated.student_id ? { ...r, ...updated } : r))
    );
    setEditing(null);
    // Soft-refresh to pick up any new records the server action created
    const res = await getMedicalRecords(institutionId);
    if (res.success) setRecords(res.data);
  };

  return (
    <div className="px-6 pt-6 pb-10 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Medical Records</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Student health profiles — blood group, allergies, emergency contacts.</p>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student…"
            className="h-8 pl-7 pr-3 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 w-56 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 py-16 text-center">
          <UserCheck size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {records.length === 0 ? "No medical profiles yet." : "No results match your search."}
          </p>
          <p className="text-xs text-slate-400 mt-1">Profiles are created when a student&#39;s first visit is recorded, or via the Edit button.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Student</th>
                <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Blood Group</th>
                <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Allergies</th>
                <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Chronic Conditions</th>
                <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">Emergency Contact</th>
                <th className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{r.student?.full_name ?? "—"}</p>
                    {r.student?.roll_no && <p className="text-slate-400 text-[10px]">{r.student.roll_no}</p>}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.blood_group ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${BLOOD_GROUP_COLOR[r.blood_group] ?? "bg-slate-100 text-slate-600"}`}>
                        {r.blood_group}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 max-w-[160px]">
                    {r.known_allergies ? (
                      <p className="line-clamp-2">{r.known_allergies}</p>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px]">
                        <UserCheck size={10} /> NIL
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 max-w-[160px]">
                    {r.chronic_conditions ? (
                      <p className="line-clamp-2">{r.chronic_conditions}</p>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.emergency_contact_name ? (
                      <div>
                        <p className="font-medium text-slate-700 dark:text-slate-200">{r.emergency_contact_name}</p>
                        {r.emergency_contact_phone && (
                          <p className="text-slate-400 text-[10px]">{r.emergency_contact_phone}</p>
                        )}
                      </div>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[10px]">
                        <UserX size={10} /> Not set
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <FileEdit size={11} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && editing !== "new" && (
        <MedicalProfileDrawer
          institutionId={institutionId}
          record={editing}
          studentId={editStudentId}
          studentName={editStudentName}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
