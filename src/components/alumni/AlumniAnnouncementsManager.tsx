"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Megaphone, Plus, X, Trash2, ChevronLeft, Users } from "lucide-react";
import { announcementAudienceLabel, type AlumniAnnouncement } from "@/lib/alumni";
import { sendAlumniAnnouncement, deleteAlumniAnnouncement } from "@/actions/alumni";

export function AlumniAnnouncementsManager({
  institutionId,
  instSlug,
  initial,
}: {
  institutionId: string;
  instSlug: string;
  initial: AlumniAnnouncement[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [gradYear, setGradYear] = useState<string>("");
  const [program, setProgram] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!body.trim()) { setError("Message body is required."); return; }
    setBusy(true);
    setError(null);
    const res = await sendAlumniAnnouncement({
      institutionId,
      title,
      body,
      graduationYear: gradYear ? Number(gradYear) : null,
      program: program || null,
    });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setTitle(""); setBody(""); setGradYear(""); setProgram("");
    setOpen(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    await deleteAlumniAnnouncement({ institutionId, id });
    router.refresh();
  }

  const inputCls =
    "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500";
  const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/institutions/${instSlug}/alumni`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-purple-600 mb-1">
            <ChevronLeft size={13} /> Alumni
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone size={22} className="text-purple-600" /> Alumni Announcements
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            Broadcast updates to all alumni or target a specific batch.
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700">
          <Plus size={15} /> New Announcement
        </button>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">
          No announcements yet. Create one to reach your alumni.
        </div>
      ) : (
        <div className="space-y-3">
          {initial.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                  <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{a.body}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-300">
                      <Users size={11} /> {announcementAudienceLabel(a.graduation_year, a.program)}
                    </span>
                    <span>{new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(a.id)} title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create drawer */}
      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-purple-500" />
                <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">New Announcement</h2>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <div>
                <label className={labelCls}>Title <span className="text-rose-500">*</span></label>
                <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Annual Alumni Reunion 2026" />
              </div>
              <div>
                <label className={labelCls}>Message <span className="text-rose-500">*</span></label>
                <textarea className={`${inputCls} min-h-[120px]`} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your announcement…" />
              </div>
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800" />
              <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300">Target audience <span className="text-slate-400 font-normal">(leave blank = all alumni)</span></p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Graduation year</label>
                  <input type="number" className={inputCls} value={gradYear} onChange={(e) => setGradYear(e.target.value)} placeholder="Any" min={1900} max={new Date().getFullYear() + 1} />
                </div>
                <div>
                  <label className={labelCls}>Programme</label>
                  <select className={inputCls} value={program} onChange={(e) => setProgram(e.target.value)}>
                    <option value="">Any</option>
                    <option value="UG">UG</option>
                    <option value="PG">PG</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Will reach: <span className="font-medium text-purple-600 dark:text-purple-300">{announcementAudienceLabel(gradYear ? Number(gradYear) : null, program || null)}</span>
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button onClick={handleSend} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                {busy ? "Sending…" : "Send Announcement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
