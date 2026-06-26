"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Database, Play, Save, Trash2, Star, Plus, X, Download, FileSpreadsheet, Printer, Filter,
} from "lucide-react";
import { useInstitution } from "@/context/InstitutionContext";
import {
  listExplorerEntities, runQuery, listSavedViews, saveView, deleteSavedView, toggleViewFavourite,
  type RunResult, type SavedView,
} from "@/actions/dataExplorer";
import { toCSV, OPERATOR_LABELS, DEFAULT_LIMIT, type EntityDef, type FilterOperator, type AggFn, type QueryModel } from "@/lib/dataExplorer";
import { downloadWorkbook } from "@/lib/excelXml";

// CF-2 Data Explorer — the Visual Builder. Builds a Query Model from UI state and
// runs it through the server action (read-only, RLS-scoped). No SQL.

type UiCondition = { field: string; operator: FilterOperator; value: string; value2: string };
type UiAgg = { fn: AggFn; field: string };

const OPERATORS: FilterOperator[] = ["eq", "neq", "gt", "gte", "lt", "lte", "ilike", "like", "in", "between", "is_null", "not_null"];
const AGG_FNS: AggFn[] = ["count", "sum", "avg", "min", "max"];
const noValueOp = (op: FilterOperator) => op === "is_null" || op === "not_null";

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
  const [error, setError] = useState<string | null>(null);
  const [views, setViews] = useState<SavedView[]>([]);

  const entity = useMemo(() => entities.find((e) => e.key === entityKey) ?? null, [entities, entityKey]);

  // Load registry + saved views per institution.
  useEffect(() => {
    if (!selectedId) return;
    listExplorerEntities(selectedId).then((r) => { if (r.success) setEntities(r.data); });
    listSavedViews(selectedId).then((r) => { if (r.success) setViews(r.data); });
  }, [selectedId]);

  // Reset builder state when the entity changes.
  function pickEntity(key: string) {
    setEntityKey(key);
    const e = entities.find((x) => x.key === key);
    setFields(e ? e.columns.slice(0, Math.min(5, e.columns.length)).map((c) => c.key) : []);
    setConditions([]); setGroupBy([]); setAggs([]); setSortField(""); setDateFrom(""); setDateTo(""); setResult(null); setError(null);
  }

  const colLabel = (key: string): string => {
    if (key === "count") return "Count";
    const agg = aggs.find((a) => aggAlias(a) === key);
    if (agg) return `${agg.fn.toUpperCase()}(${agg.fn === "count" ? "*" : labelOf(agg.field)})`;
    return labelOf(key);
  };
  const labelOf = (key: string) => entity?.columns.find((c) => c.key === key)?.label ?? key;

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
    setRunning(true); setError(null);
    const res = await runQuery(selectedId, buildModel());
    if (res.success) setResult(res.data);
    else { setError(res.error); setResult(null); }
    setRunning(false);
  }

  async function onSave() {
    if (!selectedId || !entityKey) return;
    const name = window.prompt("Save this view as:");
    if (!name) return;
    const res = await saveView({ institutionId: selectedId, name, queryModel: buildModel() });
    if (res.success) { const v = await listSavedViews(selectedId); if (v.success) setViews(v.data); }
    else setError(res.error);
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
    setResult(null);
  }

  async function removeView(id: string) {
    if (!selectedId) return;
    await deleteSavedView({ institutionId: selectedId, id });
    const v = await listSavedViews(selectedId); if (v.success) setViews(v.data);
  }
  async function favView(v: SavedView) {
    if (!selectedId) return;
    await toggleViewFavourite({ institutionId: selectedId, id: v.id, isFavourite: !v.isFavourite });
    const r = await listSavedViews(selectedId); if (r.success) setViews(r.data);
  }

  function exportCSV() {
    if (!result) return;
    const csv = toCSV(result.rows, result.columns);
    downloadBlob(`${entityKey}-export.csv`, new Blob([csv], { type: "text/csv;charset=utf-8" }));
  }
  function exportExcel() {
    if (!result) return;
    downloadWorkbook(`${entityKey}-export`, [{
      name: entity?.label ?? "Data",
      rows: [result.columns.map(colLabel), ...result.rows.map((r) => result.columns.map((c) => normalizeCell(r[c])))],
    }]);
  }
  function printResults() {
    if (!result) return;
    const head = result.columns.map((c) => `<th style="text-align:left;border-bottom:2px solid #333;padding:6px">${escapeHtml(colLabel(c))}</th>`).join("");
    const body = result.rows.map((r) => `<tr>${result.columns.map((c) => `<td style="padding:6px;border-bottom:1px solid #ddd">${escapeHtml(String(r[c] ?? ""))}</td>`).join("")}</tr>`).join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${escapeHtml(entity?.label ?? "Report")}</title></head><body style="font-family:sans-serif"><h2>${escapeHtml(entity?.label ?? "Report")}</h2><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  }

  if (!selectedId) return <Shell><Empty msg="Select an institution to explore its data." /></Shell>;

  const aggregatable = entity?.columns.filter((c) => c.aggregatable) ?? [];
  const groupable = entity?.columns.filter((c) => c.groupable) ?? [];

  return (
    <Shell>
      <div className="flex flex-1 min-h-0 overflow-hidden gap-4">
        {/* Builder panel */}
        <div className="w-80 shrink-0 overflow-y-auto custom-scrollbar rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
          {/* Saved views */}
          {views.length > 0 && (
            <Block title="Saved Views">
              <div className="space-y-1">
                {views.map((v) => (
                  <div key={v.id} className="flex items-center gap-1.5 group">
                    <button onClick={() => loadView(v)} className="flex-1 text-left text-xs px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 truncate">{v.name}</button>
                    <button onClick={() => favView(v)} title="Favourite" className="p-1 text-slate-300 hover:text-amber-500"><Star size={13} className={v.isFavourite ? "fill-amber-400 text-amber-400" : ""} /></button>
                    <button onClick={() => removeView(v.id)} title="Delete" className="p-1 text-slate-300 hover:text-rose-500"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            </Block>
          )}

          {/* Entity */}
          <Block title="Data Source">
            <select value={entityKey} onChange={(e) => pickEntity(e.target.value)} className={selectCls}>
              <option value="">Select an entity…</option>
              {Object.entries(groupByCategory(entities)).map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
                </optgroup>
              ))}
            </select>
          </Block>

          {entity && (
            <>
              {/* Columns */}
              <Block title="Columns">
                <div className="grid grid-cols-1 gap-1">
                  {entity.columns.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <input type="checkbox" checked={fields.includes(c.key)} onChange={(e) => setFields((p) => e.target.checked ? [...p, c.key] : p.filter((x) => x !== c.key))} className="accent-purple-600" />
                      {c.label}
                    </label>
                  ))}
                </div>
              </Block>

              {/* Filters */}
              <Block title="Filters" right={
                <select value={filterOp} onChange={(e) => setFilterOp(e.target.value as "and" | "or")} className="text-[10px] font-bold border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-800">
                  <option value="and">Match ALL</option>
                  <option value="or">Match ANY</option>
                </select>
              }>
                <div className="space-y-2">
                  {conditions.map((c, i) => {
                    const col = entity.columns.find((x) => x.key === c.field);
                    return (
                      <div key={i} className="space-y-1 p-2 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center gap-1">
                          <select value={c.field} onChange={(e) => updateCond(setConditions, i, { field: e.target.value })} className={`${selectCls} flex-1`}>
                            {entity.columns.filter((x) => x.filterable).map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                          </select>
                          <button onClick={() => setConditions((p) => p.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-rose-500"><X size={13} /></button>
                        </div>
                        <select value={c.operator} onChange={(e) => updateCond(setConditions, i, { operator: e.target.value as FilterOperator })} className={selectCls}>
                          {OPERATORS.map((op) => <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>)}
                        </select>
                        {!noValueOp(c.operator) && (
                          <div className="flex gap-1">
                            <input value={c.value} onChange={(e) => updateCond(setConditions, i, { value: e.target.value })} placeholder={c.operator === "in" ? "a, b, c" : "value"} type={col?.type === "number" ? "number" : col?.type === "date" ? "date" : "text"} className={inputCls} />
                            {c.operator === "between" && <input value={c.value2} onChange={(e) => updateCond(setConditions, i, { value2: e.target.value })} placeholder="to" type={col?.type === "number" ? "number" : col?.type === "date" ? "date" : "text"} className={inputCls} />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button onClick={() => setConditions((p) => [...p, { field: entity.columns.find((c) => c.filterable)?.key ?? "", operator: "eq", value: "", value2: "" }])} className="flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-500">
                    <Plus size={12} /> Add filter
                  </button>
                </div>
              </Block>

              {/* Group by + aggregations */}
              {groupable.length > 0 && (
                <Block title="Group By">
                  <div className="grid grid-cols-1 gap-1">
                    {groupable.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <input type="checkbox" checked={groupBy.includes(c.key)} onChange={(e) => setGroupBy((p) => e.target.checked ? [...p, c.key] : p.filter((x) => x !== c.key))} className="accent-purple-600" />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </Block>
              )}

              <Block title="Aggregations">
                <div className="space-y-2">
                  {aggs.map((a, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <select value={a.fn} onChange={(e) => updateCond(setAggs, i, { fn: e.target.value as AggFn })} className={`${selectCls} w-24`}>
                        {AGG_FNS.map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                      </select>
                      {a.fn !== "count" && (
                        <select value={a.field} onChange={(e) => updateCond(setAggs, i, { field: e.target.value })} className={`${selectCls} flex-1`}>
                          <option value="">field…</option>
                          {aggregatable.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                      )}
                      <button onClick={() => setAggs((p) => p.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-rose-500"><X size={13} /></button>
                    </div>
                  ))}
                  <button onClick={() => setAggs((p) => [...p, { fn: "count", field: "" }])} className="flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-500">
                    <Plus size={12} /> Add aggregation
                  </button>
                </div>
              </Block>

              {/* Sort + date + limit */}
              <Block title="Sort">
                <div className="flex gap-1">
                  <select value={sortField} onChange={(e) => setSortField(e.target.value)} className={`${selectCls} flex-1`}>
                    <option value="">None</option>
                    {entity.columns.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                  <select value={sortDir} onChange={(e) => setSortDir(e.target.value as "asc" | "desc")} className={`${selectCls} w-20`}>
                    <option value="asc">Asc</option><option value="desc">Desc</option>
                  </select>
                </div>
              </Block>

              {entity.defaultDateField && (
                <Block title="Date Range">
                  <div className="flex gap-1">
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} />
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} />
                  </div>
                </Block>
              )}

              <Block title="Row Limit">
                <input type="number" value={limit} onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || DEFAULT_LIMIT))} className={inputCls} />
              </Block>

              <div className="flex gap-2 pt-1">
                <button onClick={run} disabled={running} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-bold disabled:opacity-70">
                  {running ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play size={13} />} Run
                </button>
                <button onClick={onSave} title="Save view" className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><Save size={14} /></button>
              </div>
            </>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 min-w-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {result ? `${result.rowCount} row${result.rowCount === 1 ? "" : "s"}` : "Results"}
              {result?.capped && <span className="ml-2 text-[10px] font-semibold text-amber-600 dark:text-amber-400">· capped at limit</span>}
            </p>
            {result && result.rows.length > 0 && (
              <div className="flex items-center gap-1.5">
                <ExportBtn icon={Download} label="CSV" onClick={exportCSV} />
                <ExportBtn icon={FileSpreadsheet} label="Excel" onClick={exportExcel} />
                <ExportBtn icon={Printer} label="PDF" onClick={printResults} />
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            {error ? <Empty msg={error} tone="error" />
              : !result ? <Empty msg="Build a query and hit Run." icon={Filter} />
              : result.rows.length === 0 ? <Empty msg="No rows match." />
              : (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/80 backdrop-blur">
                    <tr>{result.columns.map((c) => <th key={c} className="px-3 py-2 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap text-[10px]">{colLabel(c)}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {result.rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        {result.columns.map((c) => <td key={c} className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">{String(r[c] ?? "—")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ── helpers / subcomponents ─────────────────────────────────────────────────────
const selectCls = "w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500/30";
const inputCls = "w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500/30";

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
    <div className="px-6 pt-6 pb-6 w-full flex flex-col h-[calc(100vh-56px)] min-h-0 overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
      <div className="mb-3 shrink-0 flex items-center gap-2">
        <Database size={18} className="text-purple-600 dark:text-purple-400" />
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">Data Explorer</h1>
          <p className="text-[11px] text-slate-500 leading-snug">Build reports across your institution's data — no SQL required.</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Block({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</p>
        {right}
      </div>
      {children}
    </div>
  );
}

function ExportBtn({ icon: Icon, label, onClick }: { icon: typeof Download; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
      <Icon size={12} /> {label}
    </button>
  );
}

function Empty({ msg, tone, icon: Icon }: { msg: string; tone?: "error"; icon?: typeof Filter }) {
  return (
    <div className={`flex flex-col items-center justify-center h-full gap-2 text-xs ${tone === "error" ? "text-rose-500" : "text-slate-400"}`}>
      {Icon && <Icon size={22} className="text-slate-300 dark:text-slate-600" />}
      {msg}
    </div>
  );
}
