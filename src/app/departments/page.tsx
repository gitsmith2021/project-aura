"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ScrollableTabBar } from "@/components/layout/ScrollableTabBar";
import { createClient } from "@/utils/supabase/client";
import { AddDepartmentModal, type DepartmentEditPayload } from "@/components/dashboard/AddDepartmentModal";
import { DepartmentFundingBadge } from "@/components/departments/DepartmentFundingBadge";
import { getDeptColor } from "@/lib/deptColors";
import { getDeptIcon } from "@/lib/deptIcons";
import { ExternalLink, LayoutGrid, Pencil, Plus, Table2 } from "lucide-react";

type DeptRow = {
  id: string;
  name: string;
  tenant_id: string;
  color: string | null;
  session_type: string | null;
  funding_type: string | null;
};

function formatSessionType(sessionType: string | null) {
  switch (sessionType) {
    case "DAY":
      return "Day Shift 1";
    case "EVENING":
      return "Evening Shift 2";
    default:
      return "General Shift";
  }
}

export default function DepartmentsPage() {
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [departments, setDepartments] = useState<DeptRow[]>([]);
  const [studentCountByDept, setStudentCountByDept] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [departmentToEdit, setDepartmentToEdit] = useState<DepartmentEditPayload | null>(null);
  const [layoutMode, setLayoutMode] = useState<"grid" | "table">("grid");

  const fetchDepartments = useCallback(async () => {
    if (!selectedTenantId) {
      setDepartments([]);
      setStudentCountByDept(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();

    const [{ data: deptRows, error: deptErr }, { data: profileRows }] = await Promise.all([
      supabase
        .from("departments")
        .select("id, name, tenant_id, color, session_type, funding_type")
        .eq("tenant_id", selectedTenantId)
        .order("name", { ascending: true }),
      supabase.from("profiles").select("department_id").eq("tenant_id", selectedTenantId).eq("role", "STUDENT"),
    ]);

    if (!deptErr && deptRows) setDepartments(deptRows as DeptRow[]);
    else setDepartments([]);

    const counts = new Map<string, number>();
    if (profileRows) {
      for (const row of profileRows) {
        const id = row.department_id as string | null;
        if (!id) continue;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    setStudentCountByDept(counts);
    setLoading(false);
  }, [selectedTenantId]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("tenants")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data?.length) {
          setTenants(data);
          setSelectedTenantId((prev) => prev || data[0].id);
        }
      });
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const activeTenantName = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId)?.name ?? "",
    [tenants, selectedTenantId]
  );

  const openCreate = () => {
    setDepartmentToEdit(null);
    setModalOpen(true);
  };

  const openEdit = (d: DeptRow) => {
    setDepartmentToEdit({
      id: d.id,
      name: d.name,
      session_type: d.session_type ?? null,
      funding_type: d.funding_type ?? null,
      color: d.color ?? null,
    });
    setModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="px-6 pt-2 pb-4 w-full flex flex-col h-[calc(100vh-56px)] min-h-0 overflow-hidden">
        <div className="mb-3 shrink-0 border-b border-slate-200">
          <ScrollableTabBar innerClassName="items-stretch gap-0">
            {tenants.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTenantId(t.id)}
                className={`shrink-0 whitespace-nowrap px-5 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  selectedTenantId === t.id
                    ? "border-violet-600 bg-violet-50/50 text-violet-700"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
                }`}
              >
                {t.name}
              </button>
            ))}
          </ScrollableTabBar>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 shrink-0">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Departments</h1>
            <p className="text-slate-500 mt-0.5 text-[11px] leading-snug">
              <span className="font-medium text-slate-700">{activeTenantName || "…"}</span>
              {" · "}Use tabs above to switch institutions.
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
              onClick={openCreate}
              disabled={!selectedTenantId}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 transition-colors border border-purple-700 disabled:opacity-50"
            >
              <Plus size={14} strokeWidth={2.5} /> Add department
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-purple-600" />
              </div>
            ) : departments.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-16">No departments yet. Add one to get started.</p>
            ) : layoutMode === "grid" ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 pb-2">
                {departments.map((d) => {
                  const c = getDeptColor(d.color);
                  const n = studentCountByDept.get(d.id) ?? 0;
                  const Icon = getDeptIcon(d.name);
                  return (
                    <article
                      key={d.id}
                      className="rounded-xl border px-3 py-3 shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex flex-col gap-3 transition-all hover:shadow-md hover:-translate-y-px"
                      style={{
                        background: `linear-gradient(135deg, ${c.bg} 0%, ${c.bg2} 100%)`,
                        borderColor: c.border,
                      }}
                    >
                      <header className="flex items-start gap-2 pb-2 border-b" style={{ borderBottomColor: c.border }}>
                        <span
                          className="w-9 h-9 rounded-lg border shrink-0 flex items-center justify-center bg-white/80"
                          style={{ borderColor: c.border }}
                        >
                          <Icon className="w-4 h-4" style={{ color: c.hex }} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: c.text }}>
                            {d.name}
                          </p>
                          <p className="text-[11px] mt-1 opacity-80" style={{ color: c.text }}>
                            {formatSessionType(d.session_type)}
                          </p>
                        </div>
                        <DepartmentFundingBadge fundingType={d.funding_type} className="shrink-0" />
                      </header>
                      <div className="flex items-center justify-between gap-2 text-[11px]" style={{ color: c.text }}>
                        <span className="opacity-80">Students</span>
                        <span className="font-bold tabular-nums">{n}</span>
                      </div>
                      <span
                        className="inline-block w-full h-2 rounded-md border"
                        style={{ background: `linear-gradient(90deg, ${c.bg}, ${c.bg2})`, borderColor: c.border }}
                        title={c.hex}
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <Link
                          href={`/institutions/${selectedTenantId}/department/${d.id}`}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border bg-white/90 text-[11px] font-semibold border-white/60 text-slate-700 hover:bg-white"
                        >
                          <ExternalLink size={12} />
                          Open
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEdit(d)}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border bg-white/90 text-[11px] font-semibold border-white/60 text-slate-700 hover:bg-white"
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
            <table className="w-full text-left text-sm border border-slate-200 rounded-lg overflow-hidden bg-white">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900">Department</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900">Session</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900">Funding</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900 w-16">Color</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900 text-right">Students</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900 text-right w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((d) => {
                    const c = getDeptColor(d.color);
                    const n = studentCountByDept.get(d.id) ?? 0;
                    const Icon = getDeptIcon(d.name);
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-7 h-7 rounded-lg border shrink-0 flex items-center justify-center"
                              style={{ background: c.bg2, borderColor: c.border }}
                            >
                              <Icon className="w-3.5 h-3.5" style={{ color: c.hex }} />
                            </span>
                            <span className="font-medium text-slate-900 text-xs truncate">{d.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{formatSessionType(d.session_type)}</td>
                        <td className="px-4 py-3">
                          <DepartmentFundingBadge fundingType={d.funding_type} />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-block w-6 h-6 rounded-md border"
                            style={{ background: `linear-gradient(135deg, ${c.bg}, ${c.bg2})`, borderColor: c.border }}
                            title={c.hex}
                          />
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700 text-right tabular-nums font-medium">{n}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <Link
                              href={`/institutions/${selectedTenantId}/department/${d.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-[11px] font-medium text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50/50"
                            >
                              <ExternalLink size={12} />
                              Open
                            </Link>
                            <button
                              type="button"
                              onClick={() => openEdit(d)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-[11px] font-medium text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50/50"
                            >
                              <Pencil size={12} />
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            )}
        </div>
      </div>

      <AddDepartmentModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setDepartmentToEdit(null);
        }}
        tenantId={selectedTenantId}
        onSuccess={fetchDepartments}
        departmentToEdit={departmentToEdit}
      />
    </DashboardLayout>
  );
}
