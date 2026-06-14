"use client";

import { useEffect, useState } from "react";
import { Plus, Pin, PinOff, Trash2, X, Paperclip, CalendarOff } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { createNotice, updateNotice, deleteNotice } from "@/actions/notices";
import {
  NOTICE_TYPES, NOTICE_AUDIENCES, AUDIENCE_LABEL, noticeTypeMeta, sortNotices,
  type Notice, type NoticeType, type NoticeAudience,
} from "@/lib/notices";
import { NoticeBadge } from "./NoticeBadge";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

type Dept = { id: string; name: string };

export function NoticesManager({ institutionId, initial }: { institutionId: string; initial: Notice[] }) {
  const [notices, setNotices] = useState<Notice[]>(initial);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<NoticeType>("general");
  const [audience, setAudience] = useState<NoticeAudience>("all");
  const [deptId, setDeptId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [attachment, setAttachment] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    createClient()
      .from("departments")
      .select("id, name")
      .eq("institution_id", institutionId)
      .order("name")
      .then(({ data }) => setDepts((data ?? []) as Dept[]));
  }, [institutionId]);

  const resetForm = () => {
    setTitle(""); setBody(""); setType("general"); setAudience("all");
    setDeptId(""); setExpiresAt(""); setAttachment(""); setPinned(false);
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    const res = await createNotice({
      institution_id: institutionId,
      title, body, notice_type: type, target_audience: audience,
      department_id: deptId || null,
      attachment_url: attachment || null,
      expires_at: expiresAt || null,
      is_pinned: pinned,
    });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    setNotices((prev) => [res.data, ...prev]);
    resetForm();
    setOpen(false);
  };

  const togglePin = async (n: Notice) => {
    setBusyId(n.id);
    const res = await updateNotice(n.id, institutionId, { is_pinned: !n.is_pinned });
    setBusyId(null);
    if (res.success) setNotices((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_pinned: !x.is_pinned } : x)));
    else setError(res.error);
  };

  const remove = async (n: Notice) => {
    if (!confirm(`Delete notice "${n.title}"?`)) return;
    setBusyId(n.id);
    const res = await deleteNotice(n.id, institutionId);
    setBusyId(null);
    if (res.success) setNotices((prev) => prev.filter((x) => x.id !== n.id));
    else setError(res.error);
  };

  const sorted = sortNotices(notices);

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Notice Board</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Post announcements to students, staff or specific departments. Emergency &amp; exam notices also ping the notification bell.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 transition-colors border border-purple-700"
        >
          <Plus size={14} strokeWidth={2.5} /> New Notice
        </button>
      </div>

      {error && (
        <p className="mb-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>
      )}

      {sorted.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-16">No notices yet — post the first one.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((n) => (
            <article
              key={n.id}
              className={`rounded-xl border bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm shadow-sm p-4 ${
                n.is_pinned ? "border-violet-200 dark:border-violet-800/50" : "border-slate-200/70 dark:border-slate-700/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <NoticeBadge type={n.notice_type} />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {AUDIENCE_LABEL[n.target_audience]}{n.departments?.name ? ` · ${n.departments.name}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={busyId === n.id}
                    onClick={() => togglePin(n)}
                    title={n.is_pinned ? "Unpin" : "Pin to top"}
                    className="p-1.5 rounded-md text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors disabled:opacity-40"
                  >
                    {n.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === n.id}
                    onClick={() => remove(n)}
                    title="Delete"
                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2">{n.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">{n.body}</p>

              <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-400 dark:text-slate-500">
                <span>{fmtDate(n.created_at)}</span>
                {n.expires_at && <span className="inline-flex items-center gap-1"><CalendarOff size={10} /> expires {fmtDate(n.expires_at)}</span>}
                {n.attachment_url && (
                  <a href={n.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 hover:underline">
                    <Paperclip size={10} /> Attachment
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Create drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">New Notice</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              <Field label="Title">
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Semester exams begin July 1" />
              </Field>
              <Field label="Message">
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className={textareaCls} placeholder="Details…" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <select value={type} onChange={(e) => setType(e.target.value as NoticeType)} className={inputCls}>
                    {NOTICE_TYPES.map((t) => <option key={t} value={t}>{noticeTypeMeta(t).label}</option>)}
                  </select>
                </Field>
                <Field label="Audience">
                  <select value={audience} onChange={(e) => setAudience(e.target.value as NoticeAudience)} className={inputCls}>
                    {NOTICE_AUDIENCES.map((a) => <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Department (optional — leave blank for institution-wide)">
                <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className={inputCls}>
                  <option value="">Institution-wide</option>
                  {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Expires on (optional)">
                  <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Attachment URL (optional)">
                  <input value={attachment} onChange={(e) => setAttachment(e.target.value)} className={inputCls} placeholder="https://…" />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 pt-1">
                <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="rounded border-slate-300" />
                Pin to top of the board
              </label>
              {(type === "emergency" || type === "exam") && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
                  This {noticeTypeMeta(type).label.toLowerCase()} notice will also push a notification to the selected audience.
                </p>
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
              <button
                type="button"
                onClick={submit}
                disabled={saving || !title.trim() || !body.trim()}
                className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Posting…" : "Post notice"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";
const textareaCls =
  "w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
