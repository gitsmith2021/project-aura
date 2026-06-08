"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddInstitutionModal } from "@/components/dashboard/AddInstitutionModal";
import { EditInstitutionModal, type InstitutionEditPayload } from "@/components/dashboard/EditInstitutionModal";
import { createClient } from "@/utils/supabase/client";
import { Building2, ExternalLink, GraduationCap, LayoutGrid, Pencil, Plus, Table2, Users } from "lucide-react";

type InstitutionRow = {
  id: string;
  name: string;
  college_type: string | null;
  subdomain: string | null;
  session_types: string[] | null;
  email_domain?: string | null;
  studentsCount: number;
  staffCount: number;
  departmentsCount: number;
};

const PALETTES = [
  {
    card: "from-violet-50/40 to-white dark:from-slate-900 dark:to-slate-950/40 border-violet-100 dark:border-violet-900/50 bg-gradient-to-br",
    icon: "bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/40 text-violet-600 dark:text-violet-400",
    stats: "border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20",
    btn: "border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-800 hover:bg-violet-50/50 dark:hover:bg-violet-950/30 hover:text-violet-700 dark:hover:text-violet-400"
  },
  {
    card: "from-blue-50/40 to-white dark:from-slate-900 dark:to-slate-950/40 border-blue-100 dark:border-blue-900/50 bg-gradient-to-br",
    icon: "bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400",
    stats: "border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20",
    btn: "border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 hover:text-blue-700 dark:hover:text-blue-400"
  },
  {
    card: "from-emerald-50/40 to-white dark:from-slate-900 dark:to-slate-950/40 border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-br",
    icon: "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400",
    stats: "border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20",
    btn: "border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-300 hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400"
  },
  {
    card: "from-amber-50/40 to-white dark:from-slate-900 dark:to-slate-950/40 border-amber-100 dark:border-amber-900/50 bg-gradient-to-br",
    icon: "bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 text-amber-600 dark:text-amber-400",
    stats: "border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20",
    btn: "border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-300 hover:border-amber-300 dark:hover:border-amber-800 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 hover:text-amber-700 dark:hover:text-amber-400"
  },
  {
    card: "from-rose-50/40 to-white dark:from-slate-900 dark:to-slate-950/40 border-rose-100 dark:border-rose-900/50 bg-gradient-to-br",
    icon: "bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400",
    stats: "border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20",
    btn: "border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-300 hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 hover:text-rose-700 dark:hover:text-rose-400"
  },
  {
    card: "from-cyan-50/40 to-white dark:from-slate-900 dark:to-slate-950/40 border-cyan-100 dark:border-cyan-900/50 bg-gradient-to-br",
    icon: "bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900/40 text-cyan-600 dark:text-cyan-400",
    stats: "border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20",
    btn: "border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-300 hover:border-cyan-300 dark:hover:border-cyan-800 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/30 hover:text-cyan-700 dark:hover:text-cyan-400"
  },
] as const;

export default function InstitutionsPage() {
  const [rows, setRows] = useState<InstitutionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState<"grid" | "table">("grid");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [tenantToEdit, setTenantToEdit] = useState<InstitutionEditPayload | null>(null);

  const fetchInstitutions = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [{ data: tenants, error }, { data: deptRows }] = await Promise.all([
      supabase
        .from("institutions")
        .select(`*, students:students!institution_id(count), staff:staff!institution_id(count)`)
        .order("name", { ascending: true }),
      supabase
        .from("departments")
        .select("institution_id"),
    ]);

    if (error) {
      console.error("Error fetching institutions:", error);
      setRows([]);
      setLoading(false);
      return;
    }

    const deptCountById: Record<string, number> = {};
    for (const d of deptRows ?? []) {
      const iid = (d as { institution_id: string }).institution_id;
      if (iid) deptCountById[iid] = (deptCountById[iid] ?? 0) + 1;
    }

    const enriched: InstitutionRow[] = (tenants ?? []).map((t: Record<string, unknown>) => ({
      id: String(t.id),
      name: String(t.name ?? ""),
      college_type: (t.college_type as string | null) ?? null,
      subdomain: (t.subdomain as string | null) ?? null,
      session_types: (t.session_types as string[] | null) ?? null,
      studentsCount: (t.students as { count: number }[])?.[0]?.count ?? 0,
      staffCount: (t.staff as { count: number }[])?.[0]?.count ?? 0,
      departmentsCount: deptCountById[String(t.id)] ?? 0,
    }));

    setRows(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInstitutions();
    const supabase = createClient();
    const sub = supabase
      .channel("institutions-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "institutions" }, fetchInstitutions)
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, [fetchInstitutions]);

  const openEdit = (r: InstitutionRow) => {
    setTenantToEdit({
      id: r.id,
      name: r.name,
      college_type: r.college_type,
      subdomain: r.subdomain,
      session_types: r.session_types,
      email_domain: r.email_domain ?? null,
    });
    setEditOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="px-6 pt-6 pb-6 w-full flex flex-col h-[calc(100vh-56px)] min-h-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3 shrink-0">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">Institutions</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[11px] leading-snug">
              Register and edit colleges. Use the Dashboard for tabbed analytics and drill-down per institution.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
            <div
              className="flex rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-100/90 dark:bg-slate-800/90 p-0.5 shrink-0"
              role="group"
              aria-label="Layout"
            >
              <button
                type="button"
                onClick={() => setLayoutMode("grid")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  layoutMode === "grid"
                    ? "bg-white dark:bg-slate-750 text-violet-700 dark:text-violet-400 shadow-sm border border-slate-200/80 dark:border-slate-650"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <LayoutGrid size={14} strokeWidth={2.25} />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("table")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  layoutMode === "table"
                    ? "bg-white dark:bg-slate-750 text-violet-700 dark:text-violet-400 shadow-sm border border-slate-200/80 dark:border-slate-650"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Table2 size={14} strokeWidth={2.25} />
                Table
              </button>
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 transition-colors border border-purple-700 shadow-sm"
            >
              <Plus size={14} strokeWidth={2.5} /> Register institution
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar flex flex-col">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-purple-600" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-16 px-4">No institutions yet. Register one to get started.</p>
            ) : layoutMode === "grid" ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 pb-2 animate-in fade-in duration-200">
                {rows.map((r, idx) => {
                  const p = PALETTES[idx % PALETTES.length];
                  return (
                  <article
                    key={r.id}
                    className={`rounded-xl border ${p.card} p-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex flex-col gap-3 hover:shadow-md hover:-translate-y-px transition-all`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center ${p.icon}`}>
                        <Building2 className="w-5 h-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-semibold leading-tight truncate text-slate-900 dark:text-slate-100" title={r.name}>
                          {r.name}
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{r.college_type ?? "—"}</p>
                        <p className="text-[10px] font-mono mt-0.5 truncate text-violet-600 dark:text-violet-400" title={r.subdomain ? `${r.subdomain}.aura.edu` : undefined}>
                          {r.subdomain ? `${r.subdomain}.aura.edu` : "—"}
                        </p>
                      </div>
                    </div>

                    <div className={`grid grid-cols-3 gap-0 divide-x divide-slate-100 dark:divide-slate-800 rounded-lg border py-2 text-center ${p.stats}`}>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums">{r.departmentsCount}</p>
                        <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-0.5">Depts</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums">{r.staffCount}</p>
                        <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-0.5 flex items-center justify-center gap-0.5">
                          <Users size={10} className="opacity-60" aria-hidden />
                          Staff
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums">{r.studentsCount}</p>
                        <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-0.5 flex items-center justify-center gap-0.5">
                          <GraduationCap size={10} className="opacity-60" aria-hidden />
                          Students
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        href={`/institutions/${r.id}`}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border text-[11px] font-semibold transition-colors ${p.btn}`}
                      >
                        <ExternalLink size={12} />
                        Open
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border text-[11px] font-semibold transition-colors ${p.btn}`}
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    </div>
                  </article>
                  );
                })}
              </div>
            ) : (
              <table className="w-full text-left text-sm border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-slate-100">Institution</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-slate-100">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-slate-100">Subdomain</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-slate-100 text-right tabular-nums">Departments</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-slate-100 text-right tabular-nums">Staff</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-slate-100 text-right tabular-nums">Students</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-slate-100 text-right w-[140px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/60 shrink-0 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                          </span>
                          <span className="font-medium text-slate-900 dark:text-slate-100 text-xs truncate">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{r.college_type ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
                        {r.subdomain ? `${r.subdomain}.aura.edu` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 text-right tabular-nums font-medium">{r.departmentsCount}</td>
                      <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 text-right tabular-nums font-medium">{r.staffCount}</td>
                      <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 text-right tabular-nums font-medium">{r.studentsCount}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <Link
                            href={`/institutions/${r.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-800 hover:text-violet-700 dark:hover:text-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/30 transition-colors"
                          >
                            <ExternalLink size={12} />
                            Open
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-800 hover:text-violet-700 dark:hover:text-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/30 transition-colors"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>

      <AddInstitutionModal isOpen={addOpen} onClose={() => setAddOpen(false)} onSuccess={fetchInstitutions} />

      <EditInstitutionModal
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          setTenantToEdit(null);
        }}
        onSuccess={fetchInstitutions}
        tenant={tenantToEdit}
      />
    </DashboardLayout>
  );
}
