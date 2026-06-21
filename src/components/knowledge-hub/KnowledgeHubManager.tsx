"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BrainCircuit, Plus, Search, Download, ExternalLink, Trash2, Eye, EyeOff, Archive,
  TrendingUp, Building2, X, Loader2, Bookmark, BookmarkCheck, FolderPlus, Folder, BarChart3,
} from "lucide-react";
import {
  KH_CATEGORIES, contentTypesFor, matchesFilters, hasActiveFacets, categoryLabel,
  contentTypeLabel, visibilityLabel, criterionLabel, resourceKindLabel, isLinkResource,
  tagCloud, topDownloaded, distinctAcademicYears, NAAC_CRITERIA,
  type KnowledgeCategory, type ResourceFilters,
} from "@/lib/knowledgeHub";
import {
  getResources, searchResources, setResourceStatus, deleteResource, incrementDownload,
  getMyEngagement, rateResource, toggleBookmark, getCollections, createCollection,
  deleteCollection, setCollectionItem,
  type KnowledgeResource, type Collection,
} from "@/actions/knowledgeHub";
import { UploadResourceDrawer } from "./UploadResourceDrawer";
import { AddToCollectionDrawer } from "./AddToCollectionDrawer";
import { StarRating } from "./StarRating";

type Props = {
  institutionId: string;
  initial: KnowledgeResource[];
  departments: { id: string; name: string }[];
  isAdmin: boolean;
  canUpload: boolean;
  currentStaffId: string | null;
  currentDepartmentId: string | null;
  currentUserId: string;
};

const selectCls =
  "px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500";

export function KnowledgeHubManager({ institutionId, initial, departments, isAdmin, canUpload, currentStaffId, currentDepartmentId, currentUserId }: Props) {
  const [resources, setResources] = useState<KnowledgeResource[]>(initial);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Engagement (KH-3)
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [collections, setCollections] = useState<Collection[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [pickerResource, setPickerResource] = useState<KnowledgeResource | null>(null);

  // Search + facets
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<KnowledgeResource[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [category, setCategory] = useState("");
  const [contentType, setContentType] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [naacCriterion, setNaacCriterion] = useState("");
  const [tag, setTag] = useState("");

  useEffect(() => {
    (async () => {
      const [eng, cols] = await Promise.all([getMyEngagement(), getCollections(institutionId)]);
      if (eng.success) { setMyRatings(eng.data.ratings); setBookmarked(new Set(eng.data.bookmarkedIds)); }
      if (cols.success) setCollections(cols.data);
    })();
  }, [institutionId]);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setSearchResults(null); setSearching(false); return; }
    setSearching(true);
    const h = setTimeout(async () => {
      const res = await searchResources(institutionId, q);
      if (res.success) setSearchResults(res.data);
      setSearching(false);
    }, 350);
    return () => clearTimeout(h);
  }, [query, institutionId]);

  const applyLocal = (fn: (list: KnowledgeResource[]) => KnowledgeResource[]) => {
    setResources(fn);
    setSearchResults((prev) => (prev ? fn(prev) : prev));
  };
  const refresh = async () => {
    const res = await getResources(institutionId);
    if (res.success) setResources(res.data);
    if (query.trim()) { const s = await searchResources(institutionId, query); if (s.success) setSearchResults(s.data); }
  };

  const facets: ResourceFilters = { category, contentType, departmentId, naacCriterion, academicYear, tag };
  const facetsActive = hasActiveFacets(facets) || savedOnly || !!activeCollection;
  const isPristine = !query.trim() && !facetsActive;

  const activeCol = collections.find((c) => c.id === activeCollection) ?? null;
  const baseList = searchResults ?? resources;
  const filtered = useMemo(() => baseList.filter((r) =>
    matchesFilters(r, facets)
    && (!savedOnly || bookmarked.has(r.id))
    && (!activeCol || activeCol.resourceIds.includes(r.id))
  // eslint-disable-next-line react-hooks/exhaustive-deps -- facets/activeCol derived each render
  ), [baseList, category, contentType, departmentId, naacCriterion, academicYear, tag, savedOnly, bookmarked, activeCollection, collections]);

  const years = useMemo(() => distinctAcademicYears(resources), [resources]);
  const cloud = useMemo(() => tagCloud(resources).slice(0, 14), [resources]);
  const mostDownloaded = useMemo(() => topDownloaded(resources, 5), [resources]);
  const fromMyDept = useMemo(() => (currentDepartmentId ? resources.filter((r) => r.department_id === currentDepartmentId).slice(0, 5) : []), [resources, currentDepartmentId]);
  const counts = useMemo(() => { const by: Record<string, number> = {}; for (const r of resources) by[r.category] = (by[r.category] ?? 0) + 1; return by; }, [resources]);
  const myCollections = useMemo(() => collections.filter((c) => c.owner_id === currentUserId), [collections, currentUserId]);

  const canManage = (r: KnowledgeResource) => isAdmin || (!!currentStaffId && r.uploaded_by === currentStaffId);

  const open = (r: KnowledgeResource) => {
    const url = isLinkResource(r) ? r.external_url : r.file_url;
    if (!url) return;
    incrementDownload(r.id);
    applyLocal((list) => list.map((x) => (x.id === r.id ? { ...x, download_count: x.download_count + 1 } : x)));
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const toggleStatus = async (r: KnowledgeResource) => {
    const next = r.status === "published" ? "draft" : "published";
    const res = await setResourceStatus(institutionId, r.id, next);
    if (res.success) applyLocal((list) => list.map((x) => (x.id === r.id ? { ...x, status: next } : x)));
  };
  const archive = async (r: KnowledgeResource) => {
    const res = await setResourceStatus(institutionId, r.id, "archived");
    if (res.success) applyLocal((list) => list.map((x) => (x.id === r.id ? { ...x, status: "archived" } : x)));
  };
  const remove = async (r: KnowledgeResource) => {
    if (!confirm(`Delete "${r.title}"? This cannot be undone.`)) return;
    const res = await deleteResource(institutionId, r.id);
    if (res.success) applyLocal((list) => list.filter((x) => x.id !== r.id));
    else alert(res.error);
  };
  const rate = async (r: KnowledgeResource, n: number) => {
    setMyRatings((prev) => ({ ...prev, [r.id]: n }));
    const res = await rateResource(r.id, n);
    if (res.success) applyLocal((list) => list.map((x) => (x.id === r.id ? { ...x, rating_count: res.data.rating_count, rating_sum: res.data.rating_sum } : x)));
  };
  const bookmark = async (r: KnowledgeResource) => {
    const on = !bookmarked.has(r.id);
    setBookmarked((prev) => { const s = new Set(prev); if (on) s.add(r.id); else s.delete(r.id); return s; });
    await toggleBookmark(r.id, on);
  };
  const toggleInCollection = async (collectionId: string, present: boolean) => {
    if (!pickerResource) return;
    const rid = pickerResource.id;
    setCollections((prev) => prev.map((c) => c.id !== collectionId ? c : {
      ...c, resourceIds: present ? Array.from(new Set([...c.resourceIds, rid])) : c.resourceIds.filter((x) => x !== rid),
    }));
    await setCollectionItem(collectionId, rid, present);
  };
  const newCollection = async (name: string) => {
    const res = await createCollection(institutionId, { name });
    if (res.success) { const cols = await getCollections(institutionId); if (cols.success) setCollections(cols.data); }
  };
  const removeCollection = async (c: Collection) => {
    if (!confirm(`Delete collection "${c.name}"?`)) return;
    const res = await deleteCollection(institutionId, c.id);
    if (res.success) { setCollections((prev) => prev.filter((x) => x.id !== c.id)); if (activeCollection === c.id) setActiveCollection(null); }
  };

  const clearAll = () => {
    setCategory(""); setContentType(""); setDepartmentId(""); setAcademicYear(""); setNaacCriterion(""); setTag("");
    setQuery(""); setSavedOnly(false); setActiveCollection(null);
  };

  const Card = ({ r }: { r: KnowledgeResource }) => (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{resourceKindLabel(r)}</span>
        <div className="flex items-center gap-1">
          {r.status !== "published" && <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${r.status === "draft" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{r.status}</span>}
          {r.naac_criterion && <span className="text-[10px] font-semibold rounded bg-indigo-50 text-indigo-600 px-1.5 py-0.5">{criterionLabel(r.naac_criterion)}</span>}
          <button onClick={() => bookmark(r)} title={bookmarked.has(r.id) ? "Remove bookmark" : "Bookmark"} className="p-0.5 text-slate-400 hover:text-violet-600">
            {bookmarked.has(r.id) ? <BookmarkCheck size={15} className="text-violet-600" /> : <Bookmark size={15} />}
          </button>
          <button onClick={() => setPickerResource(r)} title="Add to collection" className="p-0.5 text-slate-400 hover:text-violet-600"><FolderPlus size={15} /></button>
        </div>
      </div>
      <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">{r.title}</h3>
      {r.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{r.description}</p>}
      <div className="mt-2 flex flex-wrap gap-1">
        <span className="text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-800 rounded px-1.5 py-0.5">{categoryLabel(r.category)} · {contentTypeLabel(r.content_type)}</span>
        <span className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800 rounded px-1.5 py-0.5">{visibilityLabel(r.visibility)}</span>
        {r.academic_year && <span className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800 rounded px-1.5 py-0.5">{r.academic_year}</span>}
      </div>
      {(r.tags?.length ?? 0) > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">{r.tags.slice(0, 4).map((t) => <button key={t} onClick={() => setTag(t)} className="text-[10px] text-violet-600 hover:underline">#{t}</button>)}</div>
      )}
      <div className="mt-2"><StarRating myRating={myRatings[r.id] ?? 0} ratingSum={r.rating_sum} ratingCount={r.rating_count} onRate={(n) => rate(r, n)} /></div>
      <div className="mt-1 text-[11px] text-slate-400">{[r.departments?.name, r.uploader_name, new Date(r.created_at).toLocaleDateString("en-IN")].filter(Boolean).join(" · ")}</div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
        <button onClick={() => open(r)} className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700">
          {isLinkResource(r) ? <ExternalLink size={13} /> : <Download size={13} />} {isLinkResource(r) ? "Open" : "Download"}
          <span className="text-slate-400 font-normal ml-1">· {r.download_count}</span>
        </button>
        {canManage(r) && (
          <div className="flex items-center gap-1">
            <button onClick={() => toggleStatus(r)} title={r.status === "published" ? "Unpublish" : "Publish"} className="p-1 text-slate-400 hover:text-slate-700">{r.status === "published" ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            {r.status !== "archived" && <button onClick={() => archive(r)} title="Archive" className="p-1 text-slate-400 hover:text-slate-700"><Archive size={14} /></button>}
            <button onClick={() => remove(r)} title="Delete" className="p-1 text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/60"><BrainCircuit size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Knowledge Hub</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Search, save & curate the institution&apos;s shared knowledge — {resources.length} resource{resources.length === 1 ? "" : "s"}.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link href={`/institutions/${institutionId}/knowledge-hub/analytics`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><BarChart3 size={15} /> Analytics</Link>
          )}
          {canUpload && <button onClick={() => setDrawerOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-violet-700 transition-colors"><Plus size={16} /> Upload</button>}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        {searching ? <Loader2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-500 animate-spin" /> : <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the knowledge base…" className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500" />
        {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={15} /></button>}
      </div>

      {/* Category chips + Saved */}
      <div className="flex flex-wrap gap-2">
        {KH_CATEGORIES.map((c) => (
          <button key={c.value} onClick={() => setCategory(category === c.value ? "" : c.value)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${category === c.value ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            {c.label} <span className="text-slate-400">{counts[c.value] ?? 0}</span>
          </button>
        ))}
        <button onClick={() => setSavedOnly((s) => !s)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${savedOnly ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
          <BookmarkCheck size={12} /> Saved <span className="text-slate-400">{bookmarked.size}</span>
        </button>
      </div>

      {/* Collections */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide"><Folder size={12} /> Collections</span>
        {collections.map((c) => (
          <span key={c.id} className={`group inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${activeCollection === c.id ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>
            <button onClick={() => setActiveCollection(activeCollection === c.id ? null : c.id)}>{c.name} <span className="text-slate-400">{c.resourceIds.length}</span></button>
            {c.owner_id === currentUserId && <button onClick={() => removeCollection(c)} className="text-slate-300 hover:text-rose-500"><X size={11} /></button>}
          </span>
        ))}
        <button onClick={async () => { const name = prompt("New collection name"); if (name?.trim()) await newCollection(name.trim()); }} className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline"><FolderPlus size={12} /> New</button>
      </div>

      {/* Facet selects */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={selectCls}>
          <option value="">All types</option>
          {(category ? contentTypesFor(category as KnowledgeCategory) : KH_CATEGORIES.flatMap((c) => contentTypesFor(c.value))).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={selectCls}>
          <option value="">All departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {years.length > 0 && <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={selectCls}><option value="">All years</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>}
        <select value={naacCriterion} onChange={(e) => setNaacCriterion(e.target.value)} className={selectCls}><option value="">All NAAC criteria</option>{NAAC_CRITERIA.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
        {(facetsActive || query) && <button onClick={clearAll} className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"><X size={12} /> Clear</button>}
      </div>

      {/* Tag cloud */}
      {cloud.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cloud.map(({ tag: t, count }) => (
            <button key={t} onClick={() => setTag(tag === t ? "" : t)} className={`text-[11px] rounded-full px-2 py-0.5 border transition-colors ${tag === t ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>#{t} <span className="text-slate-400">{count}</span></button>
          ))}
        </div>
      )}

      {/* Discovery widgets */}
      {isPristine && (mostDownloaded.length > 0 || fromMyDept.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {mostDownloaded.length > 0 && <DiscoveryList title="Most downloaded" icon={<TrendingUp size={14} />} items={mostDownloaded} onOpen={open} />}
          {fromMyDept.length > 0 && <DiscoveryList title="From your department" icon={<Building2 size={14} />} items={fromMyDept} onOpen={open} />}
        </div>
      )}

      {/* Results */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
          {activeCol ? `Collection: ${activeCol.name} (${filtered.length})` : savedOnly ? `Saved (${filtered.length})` : query.trim() ? `Search results (${filtered.length})` : facetsActive ? `Filtered (${filtered.length})` : `All resources (${filtered.length})`}
        </p>
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center">
            <p className="text-sm text-slate-500">{resources.length === 0 ? "No resources yet. Be the first to share knowledge." : "Nothing matched. Try a broader search or clear filters."}</p>
            {(facetsActive || query) && <button onClick={clearAll} className="mt-2 text-xs font-semibold text-violet-600">Clear all filters</button>}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((r) => <Card key={r.id} r={r} />)}</div>
        )}
      </div>

      <UploadResourceDrawer institutionId={institutionId} departments={departments} isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} onCreated={refresh} />
      <AddToCollectionDrawer
        isOpen={!!pickerResource}
        resourceTitle={pickerResource?.title ?? ""}
        myCollections={myCollections}
        isInCollection={(cid) => !!pickerResource && (collections.find((c) => c.id === cid)?.resourceIds.includes(pickerResource.id) ?? false)}
        onToggle={toggleInCollection}
        onCreate={newCollection}
        onClose={() => setPickerResource(null)}
      />
    </div>
  );
}

function DiscoveryList({ title, icon, items, onOpen }: { title: string; icon: React.ReactNode; items: KnowledgeResource[]; onOpen: (r: KnowledgeResource) => void }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{icon} {title}</h3>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((r) => (
          <li key={r.id}>
            <button onClick={() => onOpen(r)} className="w-full flex items-center justify-between gap-3 py-2 text-left hover:opacity-80">
              <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{r.title}</span>
              <span className="text-[11px] text-slate-400 shrink-0">{r.download_count} ↓</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
