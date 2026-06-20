"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, X, Link2, Copy, Check, Mail } from "lucide-react";
import { createParent, linkStudent, unlinkStudent, type AdminParentRow } from "@/actions/parentPortal";
import { RELATIONSHIPS, RELATIONSHIP_LABELS, type Relationship } from "@/lib/parentPortal";

type Student = { id: string; full_name: string; roll_no: string | null };

export function ParentsManager({ institutionId, students, initial }: {
  institutionId: string; students: Student[]; initial: AdminParentRow[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Link-child drawer
  const [linkFor, setLinkFor] = useState<AdminParentRow | null>(null);
  const [linkStudentId, setLinkStudentId] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("father");

  async function addParent() {
    if (!name.trim() || !email.trim()) { setError("Name and email are required."); return; }
    setBusy(true); setError(null);
    const res = await createParent({ institutionId, name, email, phone: phone || null });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setCreds({ email: res.data.email, password: res.data.password });
    setName(""); setEmail(""); setPhone("");
    router.refresh();
  }

  async function doLink() {
    if (!linkFor || !linkStudentId) return;
    setBusy(true); setError(null);
    const res = await linkStudent({ institutionId, parentId: linkFor.id, studentId: linkStudentId, relationship });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setLinkFor(null); setLinkStudentId("");
    router.refresh();
  }

  async function removeLink(linkId: string) {
    await unlinkStudent({ institutionId, linkId });
    router.refresh();
  }

  function copyCreds() {
    if (!creds) return;
    navigator.clipboard.writeText(`Email: ${creds.email}\nPassword: ${creds.password}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500";
  const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Users size={22} className="text-purple-600" /> Parents</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Create parent logins and link them to one or more children (siblings supported).</p>
        </div>
        <button onClick={() => { setAddOpen(true); setError(null); setCreds(null); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700"><Plus size={15} /> Add Parent</button>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No parent accounts yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {initial.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-slate-900 dark:text-white">{p.name}</p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1"><Mail size={11} /> {p.email}</p>
                </div>
                {p.has_login
                  ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0">Login active</span>
                  : <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 shrink-0">No login</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.children.length === 0
                  ? <span className="text-[11px] text-slate-400">No children linked</span>
                  : p.children.map((c) => (
                    <span key={c.linkId} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      {c.name} <span className="text-amber-500">· {c.relationship}</span>
                      <button onClick={() => removeLink(c.linkId)} className="hover:text-rose-600"><X size={10} /></button>
                    </span>
                  ))}
              </div>
              <button onClick={() => { setLinkFor(p); setLinkStudentId(""); setRelationship("father"); setError(null); }} className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-purple-600 hover:text-purple-700"><Link2 size={13} /> Link child</button>
            </div>
          ))}
        </div>
      )}

      {/* Add parent drawer */}
      {addOpen && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAddOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><Users size={18} className="text-purple-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Add Parent</h2></div>
              <button onClick={() => setAddOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              {creds ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-300 mb-1">Parent account created</p>
                    <p className="text-[12px] text-emerald-700 dark:text-emerald-400">Share these login credentials. They&apos;ll be asked to reset the password on first login.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-[13px] space-y-1">
                    <p className="text-slate-700 dark:text-slate-300">Email: <span className="font-semibold">{creds.email}</span></p>
                    <p className="text-slate-700 dark:text-slate-300">Password: <span className="font-semibold">{creds.password}</span></p>
                  </div>
                  <button onClick={copyCreds} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />} {copied ? "Copied!" : "Copy credentials"}
                  </button>
                  <p className="text-[11px] text-slate-400 text-center">Now close and use &quot;Link child&quot; to connect this parent to their children.</p>
                </div>
              ) : (
                <>
                  <div><label className={labelCls}>Name <span className="text-rose-500">*</span></label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div><label className={labelCls}>Email <span className="text-rose-500">*</span></label><input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div><label className={labelCls}>Phone</label><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setAddOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">{creds ? "Close" : "Cancel"}</button>
              {!creds && <button onClick={addParent} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">{busy ? "Creating…" : "Create Parent"}</button>}
            </div>
          </div>
        </div>
      )}

      {/* Link child drawer */}
      {linkFor && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setLinkFor(null)} />
          <div className="relative w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><Link2 size={18} className="text-purple-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Link Child</h2></div>
              <button onClick={() => setLinkFor(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <p className="text-[12px] text-slate-500">Linking a child to <span className="font-semibold text-slate-700 dark:text-slate-300">{linkFor.name}</span>.</p>
              <div>
                <label className={labelCls}>Student</label>
                <select className={inputCls} value={linkStudentId} onChange={(e) => setLinkStudentId(e.target.value)}>
                  <option value="">Select student</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}{s.roll_no ? ` (${s.roll_no})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Relationship</label>
                <select className={inputCls} value={relationship} onChange={(e) => setRelationship(e.target.value as Relationship)}>
                  {RELATIONSHIPS.filter((r) => r !== "parent").map((r) => <option key={r} value={r}>{RELATIONSHIP_LABELS[r]}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setLinkFor(null)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={doLink} disabled={busy || !linkStudentId} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">{busy ? "Linking…" : "Link Child"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
