"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Database, Play, Save, Trash2, Star, Plus, X, Download, FileSpreadsheet, Printer,
  Filter, Table2, RotateCcw, ChevronDown, Layers, Sigma, ArrowUpDown, CalendarRange,
  Columns3, Check,
} from "lucide-react";
import { useInstitution } from "@/context/InstitutionContext";
import {
  listExplorerEntities, runQuery, listSavedViews, saveView, deleteSavedView, toggleViewFavourite,
  type RunResult, type SavedView,
} from "@/actions/dataExplorer";
import {
  toCSV, OPERATOR_LABELS, DEFAULT_LIMIT,
  type EntityDef, type ColumnType, type FilterOperator, type AggFn, type QueryModel,
} from "@/lib/dataExplorer";
import { downloadWorkbook } from "@/lib/excelXml";

// CF-2 Data Explorer — Visual Builder UI. UI/UX polish only; the Query Model,
// server actions, and engine are unchanged. Builds a Query Model from UI state
// and runs it through the action (read-only, RLS-scoped). No SQL.

type UiCondition = { field: string; operator: FilterOperator; value: string; value2: string };
type UiAgg = { fn: AggFn; field: string };

const OPERATORS: FilterOperator[] = ["eq", "neq", "gt", "gte", "lt", "lte", "ilike", "like", "in", "between", "is_null", "not_null"];
const AGG_FNS: AggFn[] = ["count", "sum", "avg", "min", "max"];
const noValueOp = (op: FilterOperator) => op === "is_null" || op === "not_null";
const OP_SYMBOL: Partial<Record<FilterOperator, string>> = { eq: "=", neq: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤", ilike: "contains", like: "contains", in: "in", between: "between", is_null: "is empty", not_null: "is set" };

export function DataExplorer() {
  const { selectedId } = useInstitution();
  const [entities, setEntities] = useState<EntityDef[]>([]);
  const [entityKey, setEntityKey] = useState<string>("");
  const [fields, setFields] = useState<string[]>([]);
  const [filterOp, setFilterOp] = useState<"and" | "or">("and");
  const [conditions, setConditions] = useState<UiCondition[]>([]);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [aggs, setAggs] = useState<UiAgg[]>([]);
  const [sortField, setSortField] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [views, setViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  // popovers
  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [exportOpen, setExportOpen] = useState(false);

  const entity = useMemo(() => entities.find((e) => e.key === entityKey) ?? null, [entities, entityKey]);

  useEffect(() => {
    if (!selectedId) return;
    listExplorerEntities(selectedId).then((r) => { if (r.success) setEntities(r.data); });
    listSavedViews(selectedId).then((r) => { if (r.success) setViews(r.data); });
  }, [selectedId]);

  function pickEntity(key: string) {
    setEntityKey(key);
    const e = entities.find((x) => x.key === key);
    setFields(e ? e.columns.slice(0, Math.min(5, e.columns.length)).map((c) => c.key) : []);
    setConditions([]); setGroupBy([]); setAggs([]); setSortField(""); setDateFrom(""); setDateTo("");
    setResult(null); setError(null); setHasRun(false); setActiveViewId(null);
  }

  function resetBuilder() {
    if (!entity) return;
    setFields(entity.columns.slice(0, Math.min(5, entity.columns.length)).map((c) => c.key));
    setConditions([]); setGroupBy([]); setAggs([]); setSortField(""); setDateFrom(""); setDateTo(""); setLimit(DEFAULT_LIMIT);
    setResult(null); setError(null); setHasRun(false); setActiveViewId(null);
  }

  const labelOf = (key: string) => entity?.columns.find((c) => c.key === key)?.label ?? key;
  const typeOf = (key: string): ColumnType => {
    if (key === "count" || aggs.some((a) => aggAlias(a) === key)) return "number";
    return entity?.columns.find((c) => c.key === key)?.type ?? "text";
  };
  const colLabel = (key: string): string => {
    if (key === "count") return "Count";
    const agg = aggs.find((a) => aggAlias(a) === key);
    if (agg) return `${agg.fn.toUpperCase()}(${agg.fn === "count" ? "*" : labelOf(agg.field)})`;
    return labelOf(key);
  };

  function buildModel(): QueryModel {
    return {
      entity: entityKey,
      fields,
      filters: conditions.length
        ? { op: filterOp, conditions: conditions.map((c) => ({
            field: c.field, operator: c.operator,
            value: noValueOp(c.operator) ? undefined
              : c.operator === "in" ? c.value.split(",").map((s) => s.trim())
              : c.operator === "between" ? [c.value, c.value2]
              : c.value,
          })) }
        : null,
      dateRange: entity?.defaultDateField && (dateFrom || dateTo) ? { field: entity.defaultDateField, from: dateFrom || null, to: dateTo || null } : null,
      sort: sortField ? [{ field: sortField, dir: sortDir }] : [],
      groupBy,
      aggregations: aggs.map((a) => ({ fn: a.fn, field: a.fn === "count" ? "*" : a.field, as: aggAlias(a) })),
      limit,
    };
  }

  async function run() {
    if (!selectedId || !entityKey) return;
    setRunning(true); setError(null); setHasRun(true);
    const res = await runQuery(selectedId, buildModel());
    if (res.success) setResult(res.data);
    else { setError(res.error); setResult(null); }
    setRunning(false);
  }

  async function confirmSave() {
    if (!selectedId || !entityKey || !viewName.trim()) return;
    const res = await saveView({ institutionId: selectedId, name: viewName.trim(), queryModel: buildModel() });
    if (res.success) { const v = await listSavedViews(selectedId); if (v.success) setViews(v.data); setActiveViewId(res.data.id); }
    else setError(res.error);
    setSaveOpen(false); setViewName("");
  }

  function loadView(v: SavedView) {
    const m = v.queryModel;
    setEntityKey(m.entity);
    setFields(m.fields ?? []);
    setFilterOp(m.filters?.op ?? "and");
    setConditions((m.filters?.conditions ?? []).filter((c) => "field" in c).map((c) => {
      const cc = c as { field: string; operator: FilterOperator; value?: unknown };
      const v2 = Array.isArray(cc.value) ? cc.value : [cc.value];
      return { field: cc.field, operator: cc.operator,
        value: cc.operator === "in" ? (Array.isArray(cc.value) ? cc.value.join(", ") : String(cc.value ?? "")) : String(v2[0] ?? ""),
        value2: String(v2[1] ?? "") };
    }));
    setGroupBy(m.groupBy ?? []);
    setAggs((m.aggregations ?? []).map((a) => ({ fn: a.fn, field: a.field === "*" ? "" : a.field })));
    setSortField(m.sort?.[0]?.field ?? "");
    setSortDir(m.sort?.[0]?.dir ?? "asc");
    setLimit(m.limit ?? DEFAULT_LIMIT);
    setResult(null); setHasRun(false); setActiveViewId(v.id);
  }

  async function removeView(id: string) {
    if (!selectedId) return;
    await deleteSavedView({ institutionId: selectedId, id });
    const v = await listSavedViews(selectedId); if (v.success) setViews(v.data);
    if (activeViewId === id) setActiveViewId(null);
  }
  async function favView(v: SavedView) {
    if (!selectedId) return;
    await toggleViewFavourite({ institutionId: selectedId, id: v.id, isFavourite: !v.isFavourite });
    const r = await listSavedViews(selectedId); if (r.success) setViews(r.data);
  }

  function exportCSV() {
    if (!result) return;
    downloadBlob(`${entityKey}-export.csv`, new Blob([toCSV(result.rows, result.columns)], { type: "text/csv;charset=utf-8" }));
    setExportOpen(false);
  }
  function exportExcel() {
    if (!result) return;
    downloadWorkbook(`${entityKey}-export`, [{
      name: entity?.label ?? "Data",
      rows: [result.columns.map(colLabel), ...result.rows.map((r) => result.columns.map((c) => normalizeCell(r[c])))],
    }]);
    setExportOpen(false);
  }
  function printResults() {
    if (!result) return;
    const head = result.columns.map((c) => `<th style="text-align:left;border-bottom:2px solid #333;padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#555">${escapeHtml(colLabel(c))}</th>`).join("");
    const body = result.rows.map((r, i) => `<tr style="background:${i % 2 ? "#fafafa" : "#fff"}">${result.columns.map((c) => `<td style="padding:7px 8px;border-bottom:1px solid #eee;font-size:12px">${escapeHtml(String(r[c] ?? ""))}</td>`).join("")}</tr>`).join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${escapeHtml(entity?.label ?? "Report")}</title></head><body style="font-family:system-ui,sans-serif;padding:24px"><h2 style="margin:0 0 4px">${escapeHtml(entity?.label ?? "Report")}</h2><p style="color:#888;font-size:12px;margin:0 0 16px">${result.rowCount} rows · generated ${new Date().toLocaleString("en-IN")}</p><table style="width:100%;border-collapse:collapse"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
    setExportOpen(false);
  }

  if (!selectedId) return <Shell><CenterState icon={Database} title="No institution selected" sub="Choose an institution to explore its data." /></Shell>;

  const aggregatable = entity?.columns.filter((c) => c.aggregatable) ?? [];
  const groupable = entity?.columns.filter((c) => c.groupable) ?? [];
  const favourites = views.filter((v) => v.isFavourite);
  const others = views.filter((v) => !v.isFavourite);

  // Active-query chips (reflect the current builder state)
  const chips: { key: string; label: string; tone: string; onRemove: () => void }[] = [
    ...conditions.map((c, i) => ({
      key: `f${i}`,
      label: `${labelOf(c.field)} ${OP_SYMBOL[c.operator] ?? c.operator}${noValueOp(c.operator) ? "" : ` ${c.operator === "between" ? `${c.value}–${c.value2}` : c.value || "…"}`}`,
      tone: "violet",
      onRemove: () => setConditions((p) => p.filter((_, j) => j !== i)),
    })),
    ...groupBy.map((g) => ({ key: `g${g}`, label: `Group: ${labelOf(g)}`, tone: "sky", onRemove: () => setGroupBy((p) => p.filter((x) => x !== g)) })),
    ...aggs.map((a, i) => ({ key: `a${i}`, label: `${a.fn.toUpperCase()}(${a.fn === "count" ? "*" : labelOf(a.field) || "…"})`, tone: "emerald", onRemove: () => setAggs((p) => p.filter((_, j) => j !== i)) })),
    ...(sortField ? [{ key: "sort", label: `Sort: ${labelOf(sortField)} ${sortDir === "asc" ? "↑" : "↓"}`, tone: "amber", onRemove: () => setSortField("") }] : []),
    ...((dateFrom || dateTo) && entity?.defaultDateField ? [{ key: "date", label: `${labelOf(entity.defaultDateField)}: ${dateFrom || "…"} → ${dateTo || "…"}`, tone: "slate", onRemove: () => { setDateFrom(""); setDateTo(""); } }] : []),
  ];

  return (
    <Shell>
      <div className="flex flex-1 min-h-0 overflow-hidden gap-4">
        {/* ── Builder panel ───────────────────────────────────────────── */}
        <aside className="w-[19rem] shrink-0 overflow-y-auto custom-scrollbar rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col">
          {/* Saved views */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/70">
            <SectionLabel icon={Star} title="Saved Views" count={views.length} />
            {views.length === 0 ? (
              <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">Build a query and save it for one-click access.</p>
            ) : (
              <div className="mt-2 space-y-0.5">
                {[...favourites, ...others].map((v) => (
                  <div key={v.id} className={`group flex items-center gap-1 rounded-lg pl-1 pr-0.5 transition-colors ${activeViewId === v.id ? "bg-violet-50 dark:bg-violet-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}>
                    <button onClick={() => favView(v)} title={v.isFavourite ? "Unfavourite" : "Favourite"} className="p-1 shrink-0">
                      <Star size={12} className={v.isFavourite ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600 group-hover:text-slate-400"} />
                    </button>
                    <button onClick={() => loadView(v)} className={`flex-1 text-left text-xs py-1.5 truncate ${activeViewId === v.id ? "font-semibold text-violet-700 dark:text-violet-300" : "text-slate-600 dark:text-slate-300"}`}>{v.name}</button>
                    <button onClick={() => removeView(v.id)} title="Delete" className="p-1 text-slate-300 dark:text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Data source */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/70">
            <SectionLabel icon={Database} title="Data Source" />
            <select value={entityKey} onChange={(e) => pickEntity(e.target.value)} className={`${selectCls} mt-2`}>
              <option value="">Select an entity…</option>
              {Object.entries(groupByCategory(entities)).map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          {entity ? (
            <div className="flex-1 p-3.5 space-y-4">
              {/* Columns */}
              <Block icon={Columns3} title="Columns" hint={`${fields.length}/${entity.columns.length}`}>
                <div className="grid grid-cols-1 gap-0.5">
                  {entity.columns.map((c) => {
                    const on = fields.includes(c.key);
                    return (
                      <button key={c.key} onClick={() => setFields((p) => on ? p.filter((x) => x !== c.key) : [...p, c.key])}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors ${on ? "bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}>
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${on ? "bg-violet-600 border-violet-600" : "border-slate-300 dark:border-slate-600"}`}>{on && <Check size={10} className="text-white" />}</span>
                        {c.label}
                        <span className="ml-auto text-[9px] uppercase tracking-wide text-slate-300 dark:text-slate-600">{c.type}</span>
                      </button>
                    );
                  })}
                </div>
              </Block>

              {/* Filters */}
              <Block icon={Filter} title="Filters" right={
                conditions.length > 1 ? (
                  <div className="flex rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                    {(["and", "or"] as const).map((op) => (
                      <button key={op} onClick={() => setFilterOp(op)} className={`px-1.5 py-0.5 ${filterOp === op ? "bg-violet-600 text-white" : "bg-white dark:bg-slate-800 text-slate-500"}`}>{op === "and" ? "ALL" : "ANY"}</button>
                    ))}
                  </div>
                ) : null
              }>
                <div className="space-y-2">
                  {conditions.map((c, i) => {
                    const col = entity.columns.find((x) => x.key === c.field);
                    return (
                      <div key={i} className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 p-2 space-y-1.5">
                        <div className="flex items-center gap-1">
                          <select value={c.field} onChange={(e) => updateCond(setConditions, i, { field: e.target.value })} className={`${selectCls} flex-1 !py-1`}>
                            {entity.columns.filter((x) => x.filterable).map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                          </select>
                          <select value={c.operator} onChange={(e) => updateCond(setConditions, i, { operator: e.target.value as FilterOperator })} className={`${selectCls} w-28 !py-1`}>
                            {OPERATORS.map((op) => <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>)}
                          </select>
                          <button onClick={() => setConditions((p) => p.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-rose-500 shrink-0"><X size={13} /></button>
                        </div>
                        {!noValueOp(c.operator) && (
                          <div className="flex gap-1">
                            <input value={c.value} onChange={(e) => updateCond(setConditions, i, { value: e.target.value })} placeholder={c.operator === "in" ? "a, b, c" : "value"} type={col?.type === "number" ? "number" : col?.type === "date" ? "date" : "text"} className={inputCls} />
                            {c.operator === "between" && <input value={c.value2} onChange={(e) => updateCond(setConditions, i, { value2: e.target.value })} placeholder="to" type={col?.type === "number" ? "number" : col?.type === "date" ? "date" : "text"} className={inputCls} />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <AddButton label="Add filter" onClick={() => setConditions((p) => [...p, { field: entity.columns.find((c) => c.filterable)?.key ?? "", operator: "eq", value: "", value2: "" }])} />
                </div>
              </Block>

              {/* Group by */}
              {groupable.length > 0 && (
                <Block icon={Layers} title="Group By">
                  <div className="flex flex-wrap gap-1.5">
                    {groupable.map((c) => {
                      const on = groupBy.includes(c.key);
                      return (
                        <button key={c.key} onClick={() => setGroupBy((p) => on ? p.filter((x) => x !== c.key) : [...p, c.key])}
                          className={`px-2 py-1 rounded-full text-[11px] font-medium border transition-colors ${on ? "bg-sky-600 border-sky-600 text-white" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-300"}`}>{c.label}</button>
                      );
                    })}
                  </div>
                </Block>
              )}

              {/* Aggregations */}
              <Block icon={Sigma} title="Aggregations">
                <div className="space-y-1.5">
                  {aggs.map((a, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <select value={a.fn} onChange={(e) => updateCond(setAggs, i, { fn: e.target.value as AggFn })} className={`${selectCls} w-[5.5rem] !py-1`}>
                        {AGG_FNS.map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                      </select>
                      {a.fn !== "count" && (
                        <select value={a.field} onChange={(e) => updateCond(setAggs, i, { field: e.target.value })} className={`${selectCls} flex-1 !py-1`}>
                          <option value="">field…</option>
                          {aggregatable.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                      )}
                      <button onClick={() => setAggs((p) => p.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-rose-500 shrink-0"><X size={13} /></button>
                    </div>
                  ))}
                  <AddButton label="Add aggregation" onClick={() => setAggs((p) => [...p, { fn: "count", field: "" }])} />
                </div>
              </Block>

              {/* Sort */}
              <Block icon={ArrowUpDown} title="Sort">
                <div className="flex gap-1">
                  <select value={sortField} onChange={(e) => setSortField(e.target.value)} className={`${selectCls} flex-1`}>
                    <option value="">None</option>
                    {entity.columns.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                  {sortField && (
                    <select value={sortDir} onChange={(e) => setSortDir(e.target.value as "asc" | "desc")} className={`${selectCls} w-[4.5rem]`}>
                      <option value="asc">↑ Asc</option><option value="desc">↓ Desc</option>
                    </select>
                  )}
                </div>
              </Block>

              {/* Date range */}
              {entity.defaultDateField && (
                <Block icon={CalendarRange} title={`Date — ${labelOf(entity.defaultDateField)}`}>
                  <div className="flex gap-1">
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} />
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} />
                  </div>
                </Block>
              )}

              <Block icon={Table2} title="Row Limit">
                <input type="number" value={limit} onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || DEFAULT_LIMIT))} className={inputCls} />
              </Block>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
              <Database size={26} className="text-slate-200 dark:text-slate-700" />
              <p className="text-xs text-slate-400">Pick a data source to start building.</p>
            </div>
          )}

          {/* Sticky actions footer */}
          {entity && (
            <div className="sticky bottom-0 p-3 border-t border-slate-100 dark:border-slate-800/70 bg-white/90 dark:bg-slate-900/90 backdrop-blur flex items-center gap-2">
              <button onClick={run} disabled={running} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-violet-500/20 disabled:opacity-70 transition-colors">
                {running ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play size={13} className="fill-white" />} Run Query
              </button>
              <button onClick={resetBuilder} title="Reset" className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"><RotateCcw size={14} /></button>
              <div className="relative">
                <button onClick={() => { setSaveOpen((o) => !o); setViewName(""); }} title="Save view" className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"><Save size={14} /></button>
                {saveOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-56 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-20">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Save view as</p>
                    <input autoFocus value={viewName} onChange={(e) => setViewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirmSave()} placeholder="e.g. UG students by dept" className={inputCls} />
                    <div className="flex gap-1.5 mt-2">
                      <button onClick={confirmSave} disabled={!viewName.trim()} className="flex-1 px-2 py-1.5 bg-violet-600 text-white rounded-md text-[11px] font-bold disabled:opacity-50">Save</button>
                      <button onClick={() => setSaveOpen(false)} className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-semibold text-slate-500">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* ── Results ─────────────────────────────────────────────────── */}
        <section className="flex-1 min-w-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <Table2 size={15} className="text-slate-400 shrink-0" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {result ? <><span className="tabular-nums">{result.rowCount.toLocaleString("en-IN")}</span> {result.rowCount === 1 ? "row" : "rows"}</> : "Results"}
              </p>
              {result?.capped && <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[9px] font-bold uppercase tracking-wide">capped at {limit.toLocaleString("en-IN")}</span>}
            </div>
            {result && result.rows.length > 0 && (
              <div className="relative">
                <button onClick={() => setExportOpen((o) => !o)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Download size={12} /> Export <ChevronDown size={11} className={`transition-transform ${exportOpen ? "rotate-180" : ""}`} />
                </button>
                {exportOpen && (
                  <div className="absolute top-full right-0 mt-1.5 w-40 p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-20">
                    <ExportItem icon={Download} label="CSV (.csv)" onClick={exportCSV} />
                    <ExportItem icon={FileSpreadsheet} label="Excel (.xls)" onClick={exportExcel} />
                    <ExportItem icon={Printer} label="Print / PDF" onClick={printResults} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active-query chip bar */}
          {entity && chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-slate-100 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/40">
              {chips.map((c) => <Chip key={c.key} tone={c.tone} label={c.label} onRemove={c.onRemove} />)}
            </div>
          )}

          {/* Grid / states */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            {running ? <SkeletonGrid />
              : error ? <CenterState icon={X} title="Couldn't run that query" sub={error} tone="error" />
              : !hasRun ? <CenterState icon={Play} title={entity ? "Ready when you are" : "Pick a data source"} sub={entity ? "Configure columns and filters on the left, then Run Query." : "Choose an entity from the left panel to begin."} />
              : !result || result.rows.length === 0 ? <CenterState icon={Filter} title="No matching records" sub="Try widening your filters or date range." />
              : (
                <table className="w-full text-left text-xs border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="bg-slate-50 dark:bg-slate-800/90 backdrop-blur px-3 py-2.5 text-[10px] font-bold text-slate-400 border-b border-slate-200 dark:border-slate-700 w-10 text-right">#</th>
                      {result.columns.map((c) => (
                        <th key={c} className={`bg-slate-50 dark:bg-slate-800/90 backdrop-blur px-3 py-2.5 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] whitespace-nowrap border-b border-slate-200 dark:border-slate-700 ${typeOf(c) === "number" ? "text-right" : "text-left"}`}>{colLabel(c)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((r, i) => (
                      <tr key={i} className="group">
                        <td className="px-3 py-2 text-[10px] text-slate-300 dark:text-slate-600 text-right tabular-nums border-b border-slate-50 dark:border-slate-800/60 group-hover:bg-violet-50/40 dark:group-hover:bg-violet-950/10">{i + 1}</td>
                        {result.columns.map((c) => (
                          <td key={c} className={`px-3 py-2 whitespace-nowrap border-b border-slate-50 dark:border-slate-800/60 group-hover:bg-violet-50/40 dark:group-hover:bg-violet-950/10 ${typeOf(c) === "number" ? "text-right tabular-nums font-medium text-slate-800 dark:text-slate-200" : "text-slate-600 dark:text-slate-300"}`}>
                            <Cell value={r[c]} type={typeOf(c)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </section>
      </div>
    </Shell>
  );
}

// ── Cell rendering ───────────────────────────────────────────────────────────────
function Cell({ value, type }: { value: unknown; type: ColumnType }) {
  if (value === null || value === undefined || value === "") return <span className="text-slate-300 dark:text-slate-600">—</span>;
  if (type === "boolean" || typeof value === "boolean") {
    const on = value === true || value === "true";
    return <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${on ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>{on ? "Yes" : "No"}</span>;
  }
  if (type === "number") return <>{Number(value).toLocaleString("en-IN")}</>;
  if (type === "date") {
    const d = new Date(String(value));
    if (!isNaN(d.getTime())) return <>{d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</>;
  }
  return <>{String(value)}</>;
}

// ── Small components ────────────────────────────────────────────────────────────
const selectCls = "w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400";
const inputCls = "w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-400";

const aggAlias = (a: UiAgg) => a.fn === "count" ? "count" : `${a.fn}_${a.field}`;

function updateCond<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, i: number, patch: Partial<T>) {
  setter((p) => p.map((item, j) => (j === i ? { ...item, ...patch } : item)));
}
function groupByCategory(entities: EntityDef[]): Record<string, EntityDef[]> {
  const m: Record<string, EntityDef[]> = {};
  for (const e of entities) (m[e.category] ??= []).push(e);
  return m;
}
const normalizeCell = (v: unknown) => (v === null || v === undefined ? null : typeof v === "number" ? v : String(v));
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pt-5 pb-5 w-full flex flex-col h-[calc(100vh-56px)] min-h-0 overflow-hidden bg-slate-50/60 dark:bg-slate-950/20">
      <div className="mb-3.5 shrink-0 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-sm shadow-violet-500/25">
          <Database size={17} className="text-white" />
        </div>
        <div>
          <h1 className="text-[17px] font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">Data Explorer</h1>
          <p className="text-[11px] text-slate-500 mt-1 leading-none">Build reports across your institution — no SQL required.</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function SectionLabel({ icon: Icon, title, count }: { icon: typeof Star; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={12} className="text-slate-400" />
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</span>
      {count !== undefined && count > 0 && <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-1.5 py-px">{count}</span>}
    </div>
  );
}

function Block({ icon: Icon, title, hint, right, children }: { icon: typeof Filter; title: string; hint?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon size={12} className="text-slate-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</span>
          {hint && <span className="text-[9px] font-semibold text-slate-300 dark:text-slate-600">{hint}</span>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20 py-1.5 rounded-md border border-dashed border-violet-200 dark:border-violet-800/50 transition-colors">
      <Plus size={12} /> {label}
    </button>
  );
}

const CHIP_TONES: Record<string, string> = {
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};
function Chip({ tone, label, onRemove }: { tone: string; label: string; onRemove: () => void }) {
  return (
    <span className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[11px] font-medium ${CHIP_TONES[tone] ?? CHIP_TONES.slate}`}>
      {label}
      <button onClick={onRemove} className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5"><X size={10} /></button>
    </span>
  );
}

function ExportItem({ icon: Icon, label, onClick }: { icon: typeof Download; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left">
      <Icon size={13} className="text-slate-400" /> {label}
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="p-4 space-y-2 animate-pulse">
      <div className="flex gap-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-3 flex-1 rounded bg-slate-200 dark:bg-slate-800" />)}</div>
      {Array.from({ length: 10 }).map((_, r) => (
        <div key={r} className="flex gap-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-3 flex-1 rounded bg-slate-100 dark:bg-slate-800/60" />)}</div>
      ))}
    </div>
  );
}

function CenterState({ icon: Icon, title, sub, tone }: { icon: typeof Filter; title: string; sub?: string; tone?: "error" }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${tone === "error" ? "bg-rose-50 dark:bg-rose-950/30" : "bg-slate-100 dark:bg-slate-800/60"}`}>
        <Icon size={24} className={tone === "error" ? "text-rose-400" : "text-slate-300 dark:text-slate-600"} />
      </div>
      <div>
        <p className={`text-sm font-bold ${tone === "error" ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-200"}`}>{title}</p>
        {sub && <p className="text-xs text-slate-400 mt-1 max-w-xs">{sub}</p>}
      </div>
    </div>
  );
}
