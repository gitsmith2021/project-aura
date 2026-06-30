"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Building2, Nfc, RadioTower, Ban, RefreshCw, X, Pencil } from "lucide-react";
import {
  createClassroom, updateClassroom, assignNfcTag, assignCardReader, deactivateTag, replaceTag,
} from "@/actions/classrooms";
import {
  ROOM_TYPE_LABELS, READER_VENDOR_LABELS, classroomStats, isStale,
  type Classroom, type RoomType, type ReaderVendor,
} from "@/lib/classrooms";
import { isValidUid } from "@/lib/smartCards";

type Department = { id: string; name: string };

const ROOM_TYPES = Object.keys(ROOM_TYPE_LABELS) as RoomType[];
const READER_VENDORS = Object.keys(READER_VENDOR_LABELS) as ReaderVendor[];

export function ClassroomsManager({ institutionId, initial, departments }: {
  institutionId: string; initial: Classroom[]; departments: Department[];
}) {
  const [rooms, setRooms] = useState<Classroom[]>(initial);
  const [search, setSearch] = useState("");
  const [formFor, setFormFor] = useState<Classroom | "new" | null>(null);
  const [tagFor, setTagFor] = useState<Classroom | null>(null);
  const [readerFor, setReaderFor] = useState<Classroom | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => classroomStats(rooms), [rooms]);
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return rooms;
    return rooms.filter((r) =>
      `${r.building} ${r.floor ?? ""} ${r.room_number}`.toUpperCase().includes(q) ||
      r.nfc_tag?.tag_uid.includes(q) ||
      r.card_reader?.reader_uid.includes(q)
    );
  }, [rooms, search]);

  const patchRoom = (id: string, patch: Partial<Classroom>) =>
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Classrooms</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Smart Campus room registry — assign an NFC tag (staff attendance) and a card reader (student attendance) per room.</p>
        </div>
        <button type="button" onClick={() => setFormFor("new")} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 border border-purple-700">
          <Plus size={14} strokeWidth={2.5} /> Add Classroom
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Stat label="Total rooms" value={stats.total} tone="slate" />
        <Stat label="NFC-tagged" value={stats.withTag} tone="emerald" />
        <Stat label="Reader-equipped" value={stats.withReader} tone="emerald" />
        <Stat label="Unconfigured" value={stats.unconfigured} tone="rose" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search room or UID…" className="h-8 w-full pl-8 pr-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 dark:text-slate-100" />
        </div>
        <span className="text-[11px] text-slate-400 ml-auto">{filtered.length} of {rooms.length}</span>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2 mb-3">{error}</p>}

      {filtered.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-16">No classrooms found.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-2.5 font-semibold">Room</th>
                <th className="px-3 py-2.5 font-semibold">Department</th>
                <th className="px-3 py-2.5 font-semibold">NFC Tag</th>
                <th className="px-3 py-2.5 font-semibold">Card Reader</th>
                <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Building2 size={14} className="text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{r.building} · {r.room_number}{r.floor ? ` (Floor ${r.floor})` : ""}</p>
                        <p className="text-[10px] text-slate-400">{ROOM_TYPE_LABELS[r.room_type]}{r.capacity ? ` · ${r.capacity} seats` : ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{r.department_id ? deptMap.get(r.department_id) ?? "—" : "—"}</td>
                  <td className="px-3 py-2.5">
                    {r.nfc_tag ? (
                      <button type="button" onClick={() => setTagFor(r)} className="text-left group">
                        <span className="font-mono text-slate-600 dark:text-slate-300 group-hover:underline">{r.nfc_tag.tag_uid}</span>
                        {isStale(r.nfc_tag.last_seen_at) && <span className="ml-1.5 px-1 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">stale</span>}
                      </button>
                    ) : (
                      <button type="button" onClick={() => setTagFor(r)} className="px-2 py-1 text-[11px] font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">Assign</button>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {r.card_reader ? (
                      <button type="button" onClick={() => setReaderFor(r)} className="text-left group">
                        <span className="font-mono text-slate-600 dark:text-slate-300 group-hover:underline">{r.card_reader.reader_uid}</span>
                        <span className="ml-1.5 text-[10px] text-slate-400">{READER_VENDOR_LABELS[r.card_reader.vendor]}</span>
                      </button>
                    ) : (
                      <button type="button" onClick={() => setReaderFor(r)} className="px-2 py-1 text-[11px] font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">Assign</button>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button type="button" onClick={() => setFormFor(r)} title="Edit" className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formFor && (
        <ClassroomFormDrawer
          institutionId={institutionId}
          classroom={formFor === "new" ? null : formFor}
          departments={departments}
          onClose={() => setFormFor(null)}
          onSaved={(room) => {
            setRooms((prev) => (formFor === "new" ? [room, ...prev] : prev.map((r) => (r.id === room.id ? { ...r, ...room } : r))));
          }}
          onError={setError}
        />
      )}

      {tagFor && (
        <TagModal
          institutionId={institutionId}
          classroom={tagFor}
          onClose={() => setTagFor(null)}
          onChanged={(tag) => patchRoom(tagFor.id, { nfc_tag: tag })}
          onError={setError}
        />
      )}

      {readerFor && (
        <ReaderModal
          institutionId={institutionId}
          classroom={readerFor}
          onClose={() => setReaderFor(null)}
          onChanged={(reader) => patchRoom(readerFor.id, { card_reader: reader })}
          onError={setError}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "slate" | "emerald" | "rose" }) {
  const color = tone === "emerald" ? "text-emerald-600 dark:text-emerald-400" : tone === "rose" ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100";
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
      <p className={`text-base font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{title}</h2>
            {subtitle && <p className="text-[11px] text-slate-400 font-mono">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls = "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";
const labelCls = "block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1";

function ClassroomFormDrawer({ institutionId, classroom, departments, onClose, onSaved, onError }: {
  institutionId: string; classroom: Classroom | null; departments: Department[];
  onClose: () => void; onSaved: (room: Classroom) => void; onError: (e: string) => void;
}) {
  const [building, setBuilding] = useState(classroom?.building ?? "");
  const [floor, setFloor] = useState(classroom?.floor ?? "");
  const [roomNumber, setRoomNumber] = useState(classroom?.room_number ?? "");
  const [roomType, setRoomType] = useState<RoomType>(classroom?.room_type ?? "classroom");
  const [departmentId, setDepartmentId] = useState(classroom?.department_id ?? "");
  const [capacity, setCapacity] = useState(classroom?.capacity?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const payload = {
      institutionId,
      departmentId: departmentId || null,
      building,
      floor: floor || null,
      roomNumber,
      roomType,
      capacity: capacity ? Number(capacity) : null,
    };
    if (classroom) {
      const res = await updateClassroom({ ...payload, classroomId: classroom.id });
      setSaving(false);
      if (!res.success) { onError(res.error); return; }
      onSaved({ ...classroom, department_id: payload.departmentId, building: payload.building, floor: payload.floor, room_number: payload.roomNumber, room_type: payload.roomType, capacity: payload.capacity });
    } else {
      const res = await createClassroom(payload);
      setSaving(false);
      if (!res.success) { onError(res.error); return; }
      onSaved(res.data);
    }
    onClose();
  };

  return (
    <ModalShell title={classroom ? "Edit classroom" : "Add classroom"} onClose={onClose}>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Building</label>
            <input value={building} onChange={(e) => setBuilding(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Floor (optional)</label>
            <input value={floor} onChange={(e) => setFloor(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Room number</label>
            <input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Capacity (optional)</label>
            <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Room type</label>
          <select value={roomType} onChange={(e) => setRoomType(e.target.value as RoomType)} className={inputCls}>
            {ROOM_TYPES.map((t) => <option key={t} value={t}>{ROOM_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Department (optional)</label>
          <select value={departmentId ?? ""} onChange={(e) => setDepartmentId(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>
      <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
        <button type="button" onClick={submit} disabled={saving || !building.trim() || !roomNumber.trim()} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
      </div>
    </ModalShell>
  );
}

function TagModal({ institutionId, classroom, onClose, onChanged, onError }: {
  institutionId: string; classroom: Classroom; onClose: () => void;
  onChanged: (tag: Classroom["nfc_tag"]) => void; onError: (e: string) => void;
}) {
  const [uid, setUid] = useState("");
  const [busy, setBusy] = useState(false);
  const existing = classroom.nfc_tag;

  const assign = async () => {
    setBusy(true);
    const res = await assignNfcTag({ institutionId, classroomId: classroom.id, tagUid: uid });
    setBusy(false);
    if (!res.success) { onError(res.error); return; }
    onChanged(res.data);
    onClose();
  };
  const replace = async () => {
    if (!existing) return;
    setBusy(true);
    const res = await replaceTag({ institutionId, oldTagId: existing.id, newTagUid: uid });
    setBusy(false);
    if (!res.success) { onError(res.error); return; }
    onChanged(res.data);
    onClose();
  };
  const deactivate = async () => {
    if (!existing) return;
    setBusy(true);
    const res = await deactivateTag(institutionId, existing.id);
    setBusy(false);
    if (!res.success) { onError(res.error); return; }
    onChanged(null);
    onClose();
  };

  return (
    <ModalShell title={`NFC tag — ${classroom.building} ${classroom.room_number}`} subtitle={existing ? `current: ${existing.tag_uid}` : undefined} onClose={onClose}>
      <div className="p-4 space-y-3">
        <div>
          <label className={labelCls}>{existing ? "New tag UID (replace)" : "Tag UID"}</label>
          <div className="relative">
            <Nfc className="pointer-events-none absolute left-2.5 top-2.5 text-slate-400 w-3.5 h-3.5" />
            <input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="Scan or type UID" className={`${inputCls} pl-8 font-mono`} />
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-between gap-2">
        {existing ? (
          <button type="button" onClick={deactivate} disabled={busy} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md disabled:opacity-50"><Ban size={13} /> Deactivate</button>
        ) : <span />}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
          <button type="button" onClick={existing ? replace : assign} disabled={busy || !isValidUid(uid)} className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">
            {existing && <RefreshCw size={13} />} {busy ? "Saving…" : existing ? "Replace" : "Assign"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ReaderModal({ institutionId, classroom, onClose, onChanged, onError }: {
  institutionId: string; classroom: Classroom; onClose: () => void;
  onChanged: (reader: Classroom["card_reader"]) => void; onError: (e: string) => void;
}) {
  const [uid, setUid] = useState("");
  const [vendor, setVendor] = useState<ReaderVendor>(classroom.card_reader?.vendor ?? "rfid");
  const [busy, setBusy] = useState(false);
  const existing = classroom.card_reader;

  const assign = async () => {
    setBusy(true);
    const res = await assignCardReader({ institutionId, classroomId: classroom.id, readerUid: uid, vendor });
    setBusy(false);
    if (!res.success) { onError(res.error); return; }
    onChanged(res.data);
    onClose();
  };

  return (
    <ModalShell title={`Card reader — ${classroom.building} ${classroom.room_number}`} subtitle={existing ? `current: ${existing.reader_uid}` : undefined} onClose={onClose}>
      <div className="p-4 space-y-3">
        <div>
          <label className={labelCls}>Vendor</label>
          <select value={vendor} onChange={(e) => setVendor(e.target.value as ReaderVendor)} className={inputCls}>
            {READER_VENDORS.map((v) => <option key={v} value={v}>{READER_VENDOR_LABELS[v]}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>{existing ? "New reader UID (reassign)" : "Reader UID"}</label>
          <div className="relative">
            <RadioTower className="pointer-events-none absolute left-2.5 top-2.5 text-slate-400 w-3.5 h-3.5" />
            <input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="Scan or type UID" className={`${inputCls} pl-8 font-mono`} />
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
        <button type="button" onClick={assign} disabled={busy || !isValidUid(uid)} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{busy ? "Saving…" : existing ? "Reassign" : "Assign"}</button>
      </div>
    </ModalShell>
  );
}
