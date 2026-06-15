"use client";

import { useState } from "react";
import { Plus, X, Trash2, Megaphone } from "lucide-react";
import { postHostelAnnouncement, deleteHostelAnnouncement, type HostelAnnouncement } from "@/actions/hostelAnnouncements";

const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function AnnouncementsManager({ institutionId, hostelId, initial }: { institutionId: string; hostelId: string; initial: HostelAnnouncement[] }) {
  const [items, setItems] = useState<HostelAnnouncement[]>(initial);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setError(null);
    const res = await postHostelAnnouncement({ hostelId, institutionId, title, body });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    setItems((p) => [res.data, ...p]);
    setTitle(""); setBody(""); setOpen(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    setBusyId(id);
    const res = await deleteHostelAnnouncement(id, hostelId, institutionId);
    setBusyId(null);
    if (res.success) setItems((p) => p.filter((x) => x.id !== id));
    else setError(res.error);
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 border border-purple-700">
          <Plus size={14} strokeWidth={2.5} /> Post Announcement
        </button>
      </div>
      {error && <p className="mb-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-14 text-slate-400 dark:text-slate-500">
          <Megaphone size={26} className="opacity-30" /><p className="text-xs">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <article key={a.id} className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{a.title}</p>
                <button type="button" disabled={busyId === a.id} onClick={() => remove(a.id)} className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-40"><Trash2 size={13} /></button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">{a.body}</p>
              <p className="text-[10px] text-slate-400 mt-2">{fmt(a.created_at)}</p>
            </article>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">New Announcement</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 p-4 space-y-3">
              <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500" /></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Message</label><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y" /></div>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
              <button type="button" onClick={submit} disabled={saving || !title.trim() || !body.trim()} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Posting…" : "Post"}</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
