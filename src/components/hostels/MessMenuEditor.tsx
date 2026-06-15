"use client";

import { useEffect, useState } from "react";
import { X, Pencil } from "lucide-react";
import { getMessMenu, updateMessMenu, type MenuCell } from "@/actions/mess";
import { DAYS_OF_WEEK, MEAL_TYPES, MEAL_LABEL, type DayOfWeek, type MealType } from "@/lib/messMaintenance";

type HostelOpt = { id: string; name: string };
const keyOf = (d: string, m: string) => `${d}|${m}`;

export function MessMenuEditor({ institutionId, hostels }: { institutionId: string; hostels: HostelOpt[] }) {
  const [hostelId, setHostelId] = useState(hostels[0]?.id ?? "");
  const [menu, setMenu] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<{ day: DayOfWeek; meal: MealType } | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hostelId) return;
    setLoading(true);
    getMessMenu(hostelId).then((res) => {
      const m = new Map<string, string[]>();
      if (res.success) for (const c of res.data as MenuCell[]) m.set(keyOf(c.day_of_week, c.meal_type), c.menu_items ?? []);
      setMenu(m);
      setLoading(false);
    });
  }, [hostelId]);

  const openEdit = (day: DayOfWeek, meal: MealType) => {
    setEdit({ day, meal });
    setDraft((menu.get(keyOf(day, meal)) ?? []).join(", "));
  };

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    const items = draft.split(",").map((s) => s.trim()).filter(Boolean);
    const res = await updateMessMenu({ hostelId, institutionId, day: edit.day, meal: edit.meal, items });
    setSaving(false);
    if (res.success) {
      setMenu((prev) => new Map(prev).set(keyOf(edit.day, edit.meal), items));
      setEdit(null);
    }
  };

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Cafeteria Menu</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Weekly mess menu — click a cell to edit dishes.</p>
        </div>
        <select value={hostelId} onChange={(e) => setHostelId(e.target.value)} className="h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200">
          {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>

      {hostels.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-16">Add a hostel first to set up its mess menu.</p>
      ) : loading ? (
        <p className="text-xs text-slate-400 py-10 text-center">Loading menu…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2.5 font-semibold text-slate-900 dark:text-slate-100 w-24">Day</th>
                {MEAL_TYPES.map((m) => <th key={m} className="px-3 py-2.5 font-semibold text-slate-900 dark:text-slate-100">{MEAL_LABEL[m]}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {DAYS_OF_WEEK.map((day) => (
                <tr key={day} className="align-top">
                  <td className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-200">{day.slice(0, 3)}</td>
                  {MEAL_TYPES.map((meal) => {
                    const items = menu.get(keyOf(day, meal)) ?? [];
                    return (
                      <td key={meal} className="px-3 py-2">
                        <button type="button" onClick={() => openEdit(day, meal)} className="group w-full text-left rounded-md p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                          {items.length === 0 ? (
                            <span className="text-[11px] text-slate-300 dark:text-slate-600 inline-flex items-center gap-1"><Pencil size={10} /> add</span>
                          ) : (
                            <span className="flex flex-wrap gap-1">
                              {items.map((it, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300">{it}</span>)}
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setEdit(null)} />
          <aside className="relative h-full w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{edit.day} · {MEAL_LABEL[edit.meal]}</h2>
              <button type="button" onClick={() => setEdit(null)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 p-4">
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Dishes (comma-separated)</label>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5} className="w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y" placeholder="Idli, Sambar, Chutney, Tea" />
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setEdit(null)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
