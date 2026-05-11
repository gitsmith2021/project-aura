"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddInstitutionModal } from "@/components/dashboard/AddInstitutionModal";
import { EditInstitutionModal, type TenantEditPayload } from "@/components/dashboard/EditInstitutionModal";
import { createClient } from "@/utils/supabase/client";
import { Building2, ExternalLink, GraduationCap, LayoutGrid, Pencil, Plus, Table2, Users } from "lucide-react";

type InstitutionRow = {
  id: string;
  name: string;
  college_type: string | null;
  subdomain: string | null;
  studentsCount: number;
  staffCount: number;
  departmentsCount: number;
};

export default function InstitutionsPage() {
  const [rows, setRows] = useState<InstitutionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState<"grid" | "table">("grid");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [tenantToEdit, setTenantToEdit] = useState<TenantEditPayload | null>(null);

  const fetchInstitutions = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: tenants, error } = await supabase
      .from("tenants")
      .select(`*, students:profiles!tenant_id(count), staff:profiles!tenant_id(count), departments(count)`)
      .eq("students.role", "STUDENT")
      .eq("staff.role", "STAFF")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching institutions:", error);
      setRows([]);
      setLoading(false);
      return;
    }

    const enriched: InstitutionRow[] = (tenants ?? []).map((t: Record<string, unknown>) => ({
      id: String(t.id),
      name: String(t.name ?? ""),
      college_type: (t.college_type as string | null) ?? null,
      subdomain: (t.subdomain as string | null) ?? null,
      studentsCount: (t.students as { count: number }[])?.[0]?.count ?? 0,
      staffCount: (t.staff as { count: number }[])?.[0]?.count ?? 0,
      departmentsCount: (t.departments as { count: number }[])?.[0]?.count ?? 0,
    }));

    setRows(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInstitutions();
    const supabase = createClient();
    const sub = supabase
      .channel("institutions-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "tenants" }, fetchInstitutions)
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
    });
    setEditOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="px-6 pt-2 pb-4 w-full flex flex-col h-[calc(100vh-56px)] min-h-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3 shrink-0">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Institutions</h1>
            <p className="text-slate-500 mt-0.5 text-[11px] leading-snug">
              Register and edit colleges. Use the Dashboard for tabbed analytics and drill-down per institution.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
            <div
              className="flex rounded-lg border border-slate-200 bg-slate-100/90 p-0.5 shrink-0"
              role="group"
              aria-label="Layout"
            >
              <button
                type="button"
                onClick={() => setLayoutMode("grid")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  layoutMode === "grid"
                    ? "bg-white text-violet-700 shadow-sm border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-800"
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
                    ? "bg-white text-violet-700 shadow-sm border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Table2 size={14} strokeWidth={2.25} />
                Table
              </button>
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-md hover:bg-violet-700 transition-colors border border-violet-700"
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
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 pb-2">
                {rows.map((r) => (
                  <article
                    key={r.id}
                    className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50/80 to-white p-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex flex-col gap-3 hover:border-violet-200/80 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-lg bg-violet-50 border border-violet-100 shrink-0 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-violet-600" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-semibold text-slate-900 leading-tight truncate" title={r.name}>
                          {r.name}
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-1">{r.college_type ?? "—"}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate" title={r.subdomain ? `${r.subdomain}.aura.edu` : undefined}>
                          {r.subdomain ? `${r.subdomain}.aura.edu` : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-0 divide-x divide-slate-100 rounded-lg border border-slate-100 bg-white/80 py-2 text-center">
                      <div>
                        <p className="text-sm font-bold text-slate-800 tabular-nums">{r.departmentsCount}</p>
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">Depts</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 tabular-nums">{r.staffCount}</p>
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5 flex items-center justify-center gap-0.5">
                          <Users size={10} className="opacity-60" aria-hidden />
                          Staff
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 tabular-nums">{r.studentsCount}</p>
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5 flex items-center justify-center gap-0.5">
                          <GraduationCap size={10} className="opacity-60" aria-hidden />
                          Students
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        href={`/institutions/${r.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50/50"
                      >
                        <ExternalLink size={12} />
                        Open
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50/50"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <table className="w-full text-left text-sm border border-slate-200 rounded-lg overflow-hidden bg-white">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900">Institution</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900">Subdomain</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900 text-right tabular-nums">Departments</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900 text-right tabular-nums">Staff</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900 text-right tabular-nums">Students</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900 text-right w-[140px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 shrink-0 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-violet-600" />
                          </span>
                          <span className="font-medium text-slate-900 text-xs truncate">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{r.college_type ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                        {r.subdomain ? `${r.subdomain}.aura.edu` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 text-right tabular-nums font-medium">{r.departmentsCount}</td>
                      <td className="px-4 py-3 text-xs text-slate-700 text-right tabular-nums font-medium">{r.staffCount}</td>
                      <td className="px-4 py-3 text-xs text-slate-700 text-right tabular-nums font-medium">{r.studentsCount}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <Link
                            href={`/institutions/${r.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-[11px] font-medium text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50/50"
                          >
                            <ExternalLink size={12} />
                            Open
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-[11px] font-medium text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50/50"
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
