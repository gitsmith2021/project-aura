"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlaskConical, Plus, Pencil, Trash2, ChevronLeft, Wallet } from "lucide-react";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, formatINR, type ResearchProject } from "@/lib/research";
import { deleteProject } from "@/actions/research";
import { ProjectDrawer } from "./ProjectDrawer";

type Staff = { id: string; full_name: string };
type Dept = { id: string; name: string };

export function ProjectsRegistry({
  institutionId, instSlug, staff, departments, initial,
}: {
  institutionId: string; instSlug: string; staff: Staff[]; departments: Dept[]; initial: ResearchProject[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [editing, setEditing] = useState<ResearchProject | null>(null);

  function openAdd() { setMode("add"); setEditing(null); setOpen(true); }
  function openEdit(p: ResearchProject) { setMode("edit"); setEditing(p); setOpen(true); }
  async function remove(id: string) { await deleteProject({ institutionId, id }); router.refresh(); }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/institutions/${instSlug}/research`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-purple-600 mb-1"><ChevronLeft size={13} /> Research</Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><FlaskConical size={22} className="text-purple-600" /> Research Projects</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Funded &amp; in-house research projects with PI and grant tracking.</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700"><Plus size={15} /> New Project</button>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No research projects yet.</div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Title</th>
                <th className="text-left font-medium px-4 py-2.5">PI</th>
                <th className="text-left font-medium px-4 py-2.5">Funding</th>
                <th className="text-left font-medium px-4 py-2.5">Status</th>
                <th className="text-right font-medium px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {initial.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 align-top">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-900 dark:text-white">{p.title}</div>
                    {p.departments?.name && <div className="text-[11px] text-slate-400">{p.departments.name}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{p.staff?.full_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {p.funding_agency && <div className="text-[12px]">{p.funding_agency}</div>}
                    <div className="text-[11px] text-slate-400 inline-flex items-center gap-1"><Wallet size={11} /> {formatINR(p.funding_amount)}{p.funding_spent != null ? ` · ${formatINR(p.funding_spent)} used` : ""}</div>
                  </td>
                  <td className="px-4 py-2.5"><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${PROJECT_STATUS_COLORS[p.status]}`}>{PROJECT_STATUS_LABELS[p.status]}</span></td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"><Pencil size={13} /></button>
                      <button onClick={() => remove(p.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProjectDrawer open={open} mode={mode} institutionId={institutionId} staff={staff} departments={departments} project={editing} onClose={() => setOpen(false)} />
    </div>
  );
}
