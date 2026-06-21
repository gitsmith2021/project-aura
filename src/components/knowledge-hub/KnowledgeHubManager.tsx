"use client";

import { useMemo, useState } from "react";
import {
  BrainCircuit, Plus, Search, Download, ExternalLink, Trash2, Eye, EyeOff, Archive,
} from "lucide-react";
import {
  KH_CATEGORIES, contentTypesFor, matchesFilters, categoryLabel, contentTypeLabel,
  visibilityLabel, criterionLabel, resourceKindLabel, isLinkResource,
  type KnowledgeCategory,
} from "@/lib/knowledgeHub";
import {
  getResources, setResourceStatus, deleteResource, incrementDownload,
  type KnowledgeResource,
} from "@/actions/knowledgeHub";
import { UploadResourceDrawer } from "./UploadResourceDrawer";

type Props = {
  institutionId: string;
  initial: KnowledgeResource[];
  departments: { id: string; name: string }[];
  isAdmin: boolean;
  canUpload: boolean;
  currentStaffId: string | null;
};

const selectCls =
  "px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500";

export function KnowledgeHubManager({ institutionId, initial, departments, isAdmin, canUpload, currentStaffId }: Props) {
  const [resources, setResources] = useState<KnowledgeResource[]>(initial);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [contentType, setContentType] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const refresh = async () => {
    const res = await getResources(institutionId);
    if (res.success) setResources(res.data);
  };

  const filtered = useMemo(
    () => resources.filter((r) => matchesFilters(r, { search, category, contentType, departmentId })),
    [resources, search, category, contentType, departmentId],
  );

  const canManage = (r: KnowledgeResource) => isAdmin || (!!currentStaffId && r.uploaded_by === currentStaffId);

  const open = (r: KnowledgeResource) => {
    const url = isLinkResource(r) ? r.external_url : r.file_url;
    if (!url) return;
    incrementDownload(r.id);
    setResources((prev) => prev.map((x) => (x.id === r.id ? { ...x, download_count: x.download_count + 1 } : x)));
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const toggleStatus = async (r: KnowledgeResource) => {
    const next = r.status === "published" ? "draft" : "published";
    const res = await setResourceStatus(institutionId, r.id, next);
    if (res.success) setResources((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: next } : x)));
  };

  const archive = async (r: KnowledgeResource) => {
    const res = await setResourceStatus(institutionId, r.id, "archived");
    if (res.success) setResources((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "archived" } : x)));
  };

  const remove = async (r: KnowledgeResource) => {
    if (!confirm(`Delete "${r.title}"? This cannot be undone.`)) return;
    const res = await deleteResource(institutionId, r.id);
    if (res.success) setResources((prev) => prev.filter((x) => x.id !== r.id));
    else alert(res.error);
  };

  const counts = useMemo(() => {
    const by: Record<string, number> = {};
    for (const r of resources) by[r.category] = (by[r.category] ?? 0) + 1;
    return by;
  }, [resources]);

  return (
    <div className="w-full p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/60">
            <BrainCircuit size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Knowledge Hub</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">The institution&apos;s shared, searchable knowledge repository — {resources.length} resource{resources.length === 1 ? "" : "s"}.</p>
          </div>
        </div>
        {canUpload && (
          <button onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-violet-700 transition-colors">
            <Plus size={16} /> Upload
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {KH_CATEGORIES.map((c) => (
          <button key={c.value} onClick={() => setCategory(category === c.value ? "" : c.value)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${category === c.value ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            {c.label} <span className="text-slate-400">{counts[c.value] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, description, tags…"
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500" />
        </div>
        <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={selectCls}>
          <option value="">All types</option>
          {(category ? contentTypesFor(category as KnowledgeCategory) : KH_CATEGORIES.flatMap((c) => contentTypesFor(c.value))).map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={selectCls}>
          <option value="">All departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center">
          <p className="text-sm text-slate-500">{resources.length === 0 ? "No resources yet. Be the first to share knowledge." : "No resources match these filters."}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{resourceKindLabel(r)}</span>
                <div className="flex items-center gap-1.5">
                  {r.status !== "published" && (
                    <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${r.status === "draft" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{r.status}</span>
                  )}
                  {r.naac_criterion && <span className="text-[10px] font-semibold rounded bg-indigo-50 text-indigo-600 px-1.5 py-0.5">{criterionLabel(r.naac_criterion)}</span>}
                </div>
              </div>

              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">{r.title}</h3>
              {r.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{r.description}</p>}

              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-800 rounded px-1.5 py-0.5">{categoryLabel(r.category)} · {contentTypeLabel(r.content_type)}</span>
                <span className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800 rounded px-1.5 py-0.5">{visibilityLabel(r.visibility)}</span>
              </div>

              <div className="mt-2 text-[11px] text-slate-400">
                {[r.departments?.name, r.uploader_name, new Date(r.created_at).toLocaleDateString("en-IN")].filter(Boolean).join(" · ")}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                <button onClick={() => open(r)} className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700">
                  {isLinkResource(r) ? <ExternalLink size={13} /> : <Download size={13} />}
                  {isLinkResource(r) ? "Open" : "Download"}
                  <span className="text-slate-400 font-normal ml-1">· {r.download_count}</span>
                </button>
                {canManage(r) && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleStatus(r)} title={r.status === "published" ? "Unpublish" : "Publish"} className="p-1 text-slate-400 hover:text-slate-700">
                      {r.status === "published" ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    {r.status !== "archived" && (
                      <button onClick={() => archive(r)} title="Archive" className="p-1 text-slate-400 hover:text-slate-700"><Archive size={14} /></button>
                    )}
                    <button onClick={() => remove(r)} title="Delete" className="p-1 text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadResourceDrawer
        institutionId={institutionId}
        departments={departments}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={refresh}
      />
    </div>
  );
}
