"use client";

import { useEffect, useState } from "react";
import { Library, Loader2, Plus, Trash2, Search, RefreshCw } from "lucide-react";
import { useInstitution } from "@/context/InstitutionContext";
import {
  getSemanticOverview, listAliases, addAlias, deleteAlias, inspectMatches, rebuildIndex,
  type SemanticOverview, type AliasRow, type MatchInspection,
} from "@/actions/intelligenceCatalog";

// CF-3.1 WS7 — Semantic Catalog Manager UI. SUPER_ADMIN only.

export function SemanticCatalog() {
  const { selectedId } = useInstitution();
  const [ov, setOv] = useState<SemanticOverview | null>(null);
  const [aliases, setAliases] = useState<AliasRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };
  async function refresh() {
    const [o, a] = await Promise.all([getSemanticOverview(), listAliases()]);
    if (o.ok) setOv(o.data); else setErr(o.error);
    if (a.ok) setAliases(a.data);
  }
  useEffect(() => { refresh(); }, []);

  // add alias
  const [entity, setEntity] = useState(""); const [alias, setAlias] = useState(""); const [adding, setAdding] = useState(false);
  async function onAdd() {
    if (!entity || alias.trim().length < 2) return;
    setAdding(true); const r = await addAlias(entity, alias); setAdding(false);
    if (r.ok) { setAlias(""); flash("Alias added — routing updates immediately."); refresh(); } else flash(r.error);
  }
  async function onDelete(id: string) { const r = await deleteAlias(id); if (r.ok) refresh(); else flash(r.error); }

  // inspector
  const [q, setQ] = useState(""); const [insp, setInsp] = useState<MatchInspection | null>(null); const [inspecting, setInspecting] = useState(false);
  async function onInspect(query: string) {
    setQ(query); if (!query.trim()) return;
    setInspecting(true); const r = await inspectMatches(selectedId ?? "", query); setInspecting(false);
    if (r.ok) setInsp(r.data); else flash(r.error);
  }

  const [rebuilding, setRebuilding] = useState(false);
  async function onRebuild() {
    if (!selectedId) { flash("Select an institution in the top bar first."); return; }
    setRebuilding(true); const r = await rebuildIndex(selectedId); setRebuilding(false);
    if (r.ok) { flash(`Index rebuilt: ${r.data.terms} terms, ${r.data.values} values${r.data.embedded ? " (with embeddings)" : " (trigram only — embed fn not deployed)"}.`); refresh(); }
    else flash(r.error);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/15 text-violet-600"><Library size={18} /></div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-slate-100">Aura Intelligence — Semantic Catalog</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Tune routing without code changes · SUPER_ADMIN.</p>
        </div>
        <button onClick={onRebuild} disabled={rebuilding} className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-bold">
          {rebuilding ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Rebuild index
        </button>
      </div>

      {err && <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{err}</div>}

      {ov && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat label="Entities" value={ov.entities.length} />
          <Stat label="Aliases" value={ov.aliasCount} />
          <Stat label="Catalog terms" value={ov.termsCount} sub={`${ov.embeddedTerms} embedded`} />
          <Stat label="Value index" value={ov.valueCount} sub={`${ov.embeddedValues} embedded`} />
          <Stat label="Unaddressed" value={ov.unrecognized.length} sub="unrecognized" />
          <Stat label="Vector tier" value={ov.embeddedValues + ov.embeddedTerms > 0 ? "On" : "Off"} />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Aliases */}
        <Panel title="Entity aliases">
          <div className="flex gap-2 mb-3">
            <select value={entity} onChange={(e) => setEntity(e.target.value)} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 py-1.5 text-slate-700 dark:text-slate-200">
              <option value="">Entity…</option>
              {ov?.entities.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
            </select>
            <input value={alias} onChange={(e) => setAlias(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onAdd()} placeholder="alias phrase" className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2.5 py-1.5 text-slate-700 dark:text-slate-200" />
            <button onClick={onAdd} disabled={adding || !entity || alias.trim().length < 2} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-bold"><Plus size={13} /> Add</button>
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto custom-scrollbar">
            {aliases.length === 0 && <p className="text-xs text-slate-400">No custom aliases yet — built-in synonyms still apply.</p>}
            {aliases.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs py-1 border-b border-slate-50 dark:border-slate-800/50">
                <span className="font-mono text-slate-400 w-28 shrink-0">{a.entity_key}</span>
                <span className="text-slate-700 dark:text-slate-200 flex-1">{a.alias}</span>
                <button onClick={() => onDelete(a.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </Panel>

        {/* Inspector */}
        <Panel title="Match inspector">
          <form onSubmit={(e) => { e.preventDefault(); onInspect(q); }} className="relative mb-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Inspect a phrase (e.g. 'commerce')…" className="w-full pl-3 pr-10 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200" />
            <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-violet-600">{inspecting ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}</button>
          </form>
          {ov && ov.unrecognized.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {ov.unrecognized.map((u) => <button key={u} onClick={() => onInspect(u)} className="px-2 py-0.5 rounded-full text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">{u}</button>)}
            </div>
          )}
          {insp && (
            <div className="space-y-2 text-xs">
              <Row k="Routes to" v={insp.routing.entity ? `${insp.routing.entity} (${insp.routing.responseHint}, conf ${Math.round((insp.routing.confidence ?? 0) * 100)}%)` : "— no entity matched"} />
              <Group title="Trigram · departments" items={insp.trigramDepartments.map((d) => `${d.raw} — ${d.score} (${d.via})`)} />
              <Group title="Trigram · value index" items={insp.trigramValues.map((d) => `${d.raw} — ${d.score} (${d.via})`)} />
              <Group title="Vector · catalog terms" items={insp.vectorTerms ? insp.vectorTerms.map((t) => `${t.entity_key}.${t.column_key ?? "*"} — d ${t.distance}`) : ["vector tier off (deploy embed fn + rebuild)"]} />
            </div>
          )}
        </Panel>
      </div>

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 text-white px-4 py-3 text-sm shadow-lg max-w-sm">{toast}</div>}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-lg font-black mt-0.5 text-slate-900 dark:text-slate-100 tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">{title}</p>{children}</div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex gap-2"><span className="text-slate-400 w-20 shrink-0">{k}</span><span className="text-slate-700 dark:text-slate-200 font-medium">{v}</span></div>;
}
function Group({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">{title}</p>
      {items.length === 0 ? <p className="text-slate-400">none</p> : <ul className="mt-0.5 space-y-0.5">{items.map((it, i) => <li key={i} className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">{it}</li>)}</ul>}
    </div>
  );
}
