"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Plus, X, Pencil, Trash2, ArrowLeft, Users, Calendar } from "lucide-react";
import { logInteraction, deleteInteraction, type InteractionRow } from "@/actions/industryConnect";
import { INTERACTION_TYPES, INTERACTION_TYPE_LABELS, type InteractionType } from "@/lib/industryConnect";

const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500";
const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

type PartnerOpt = { id: string; partnerName: string };

function fmt(d: string) { return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }

export function InteractionsManager({ institutionId, initial, partners }: {
  institutionId: string; initial: InteractionRow[]; partners: PartnerOpt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [mouPartnerId, setMouPartnerId] = useState("");
  const [interactionType, setInteractionType] = useState<InteractionType>("guest_lecture");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [studentsBenefited, setStudentsBenefited] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setEditId(null); setMouPartnerId(""); setInteractionType("guest_lecture"); setTitle(""); setDate(""); setStudentsBenefited(""); setDescription(""); setError(null); setOpen(true);
  }
  function openEdit(i: InteractionRow) {
    setEditId(i.id); setMouPartnerId(i.mouPartnerId ?? ""); setInteractionType(i.interactionType); setTitle(i.title);
    setDate(i.date); setStudentsBenefited(i.studentsBenefited !== null ? String(i.studentsBenefited) : ""); setDescription(i.description ?? ""); setError(null); setOpen(true);
  }

  async function save() {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!date) { setError("Date is required."); return; }
    setBusy(true); setError(null);
    const res = await logInteraction({
      institutionId, id: editId, mouPartnerId: mouPartnerId || null, interactionType, title, date,
      studentsBenefited: studentsBenefited === "" ? null : Math.max(0, Number(studentsBenefited) || 0),
      description: description || null,
    });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOpen(false); router.refresh();
  }
  async function remove(i: InteractionRow) {
    if (!confirm(`Delete "${i.title}"?`)) return;
    const res = await deleteInteraction({ institutionId, id: i.id });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <Link href={`/institutions/${institutionId}/industry-connect`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-teal-600 mb-2"><ArrowLeft size={13} /> MOUs</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Activity size={22} className="text-teal-600" /> Industry Activities</h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Log internships, workshops, guest lectures and drives run with partners.</p>
          </div>
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700"><Plus size={15} /> Log Activity</button>
        </div>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No activities logged yet.</div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-2.5 font-medium">Activity</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Partner</th>
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Students</th>
              <th className="px-4 py-2.5"></th>
            </tr></thead>
            <tbody>
              {initial.map((i) => (
                <tr key={i.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{i.title}{i.description && <p className="text-[11px] text-slate-400 font-normal line-clamp-1">{i.description}</p>}</td>
                  <td className="px-4 py-2.5"><span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300">{INTERACTION_TYPE_LABELS[i.interactionType]}</span></td>
                  <td className="px-4 py-2.5 text-slate-500">{i.partnerName ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500"><span className="inline-flex items-center gap-1"><Calendar size={11} className="text-slate-400" /> {fmt(i.date)}</span></td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{i.studentsBenefited !== null ? <span className="inline-flex items-center gap-1"><Users size={11} className="text-slate-400" /> {i.studentsBenefited}</span> : "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(i)} className="p-1.5 rounded-md text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30"><Pencil size={14} /></button>
                      <button onClick={() => remove(i)} className="p-1.5 rounded-md text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><Activity size={18} className="text-teal-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{editId ? "Edit Activity" : "Log Activity"}</h2></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <div><label className={labelCls}>Title <span className="text-rose-500">*</span></label><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Type</label>
                  <select className={inputCls} value={interactionType} onChange={(e) => setInteractionType(e.target.value as InteractionType)}>
                    {INTERACTION_TYPES.map((t) => <option key={t} value={t}>{INTERACTION_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Date <span className="text-rose-500">*</span></label><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></div>
              </div>
              <div><label className={labelCls}>Partner (MOU)</label>
                <select className={inputCls} value={mouPartnerId} onChange={(e) => setMouPartnerId(e.target.value)}>
                  <option value="">— Not linked —</option>
                  {partners.map((p) => <option key={p.id} value={p.id}>{p.partnerName}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Students benefited</label><input type="number" min={0} className={inputCls} value={studentsBenefited} onChange={(e) => setStudentsBenefited(e.target.value)} /></div>
              <div><label className={labelCls}>Description</label><textarea className={inputCls + " h-20 resize-none"} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={save} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">{busy ? "Saving…" : editId ? "Save" : "Log Activity"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
