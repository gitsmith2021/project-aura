"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";

// ── Live time tracker ─────────────────────────────────────────────────────────
function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function isLive(cls: { day_of_week: string; start_time: string; end_time: string }, now: Date) {
  const todayName = DAY_NAMES[now.getDay()];
  if (cls.day_of_week !== todayName) return false;
  const [sh, sm] = cls.start_time.split(":").map(Number);
  const [eh, em] = cls.end_time.split(":").map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= sh * 60 + sm && nowMins < eh * 60 + em;
}

import {
  Clock, MoreVertical, Plus, Copy, Pencil, Trash2,
  ChevronLeft, ChevronRight, Home, CalendarDays,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export type ClassEntry = {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  department_id: string;
  subject_name: string;
  staff_id: string;
  tenant_id: string | null;
  profiles: { full_name: string } | null;
};

type ViewMode = "week" | "work-week" | "day";
type Props = {
  classes: ClassEntry[];
  allInstitutionClasses: ClassEntry[]; // used for cross-dept conflict detection
  onRefresh: () => void;
  onAddSlot: (day: string, hour: number) => void;
  onEdit: (cls: ClassEntry) => void;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WORK_DAYS = ALL_DAYS.slice(0, 5);
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);
const HOUR_H = 64;

const PALETTE = [
  { bg: "bg-violet-50",  text: "text-violet-800",  border: "border-l-violet-500",  bar: "bg-violet-400"  },
  { bg: "bg-blue-50",    text: "text-blue-800",    border: "border-l-blue-500",    bar: "bg-blue-400"    },
  { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-l-emerald-500", bar: "bg-emerald-400" },
  { bg: "bg-amber-50",   text: "text-amber-800",   border: "border-l-amber-500",   bar: "bg-amber-400"   },
  { bg: "bg-rose-50",    text: "text-rose-800",    border: "border-l-rose-500",    bar: "bg-rose-400"    },
  { bg: "bg-cyan-50",    text: "text-cyan-800",    border: "border-l-cyan-500",    bar: "bg-cyan-400"    },
  { bg: "bg-pink-50",    text: "text-pink-800",    border: "border-l-pink-500",    bar: "bg-pink-400"    },
  { bg: "bg-indigo-50",  text: "text-indigo-800",  border: "border-l-indigo-500",  bar: "bg-indigo-400"  },
];
const cMap: Record<string, number> = {};
let cIdx = 0;
function getColor(name: string) {
  if (cMap[name] === undefined) cMap[name] = cIdx++ % PALETTE.length;
  return PALETTE[cMap[name]];
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function getWeekMonday(offset = 0) {
  const d = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(base.getDate() + n);
  return d;
}
function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function fmtHour(h: number) { return fmtTime(`${h}:00`); }
function isToday(d: Date) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return d.getTime() === t.getTime();
}
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Component ─────────────────────────────────────────────────────────────────
// Pending-change shape
type PendingChange = { day_of_week?: string; start_time?: string; end_time?: string };

export function ScheduleCalendar({ classes, allInstitutionClasses, onRefresh, onAddSlot, onEdit }: Props) {
  const now = useNow();
  const [items, setItems] = useState<ClassEntry[]>(classes);
  const [view, setView] = useState<ViewMode>("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayOffset, setDayOffset] = useState(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ day: string; hour: number } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ day: string; hour: number } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(items);
  const resizeRef = useRef<{ id: string; startY: number; origEndH: number; startH: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // When parent refreshes (after save/add/delete), reset items + pending
  useEffect(() => {
    setItems(classes);
    setPendingChanges(new Map());
  }, [classes]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // ── Current-time indicator ────────────────────────────────────────────────
  // Compute fractional px offset from top of grid (grid starts at 08:00)
  const nowTop = (() => {
    const h = now.getHours();
    const m = now.getMinutes();
    const totalMins = h * 60 + m;
    const gridStartMins = 8 * 60;
    return ((totalMins - gridStartMins) / 60) * HOUR_H;
  })();

  // Auto-scroll to keep the line centred in the visible area whenever time ticks
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // 44px = sticky header height
    const HEADER = 44;
    const visibleH = el.clientHeight - HEADER;
    const target = nowTop - visibleH / 2;
    el.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [nowTop]);

  const isDirty = pendingChanges.size > 0;

  // ── Conflict detection ───────────────────────────────────────────────────
  // Runs across ALL institution classes (not just current dept)
  // so cross-department double-bookings are caught correctly
  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    const byStaffDay: Record<string, ClassEntry[]> = {};
    allInstitutionClasses.forEach(c => {
      if (!c.staff_id) return;
      const key = `${c.staff_id}__${c.day_of_week}`;
      if (!byStaffDay[key]) byStaffDay[key] = [];
      byStaffDay[key].push(c);
    });
    Object.values(byStaffDay).forEach(entries => {
      entries.sort((a, b) => a.start_time.localeCompare(b.start_time));
      for (let i = 0; i < entries.length - 1; i++) {
        if (entries[i].end_time > entries[i + 1].start_time) {
          ids.add(entries[i].id);
          ids.add(entries[i + 1].id);
        }
      }
    });
    return ids;
  }, [allInstitutionClasses]);

  // Mark a change as pending (merges with any existing pending change for same id)
  const markPending = useCallback((id: string, change: PendingChange) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(id, { ...(next.get(id) ?? {}), ...change });
      return next;
    });
  }, []);

  // Save all pending changes to Supabase
  const handleSave = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    const supabase = createClient();
    await Promise.all(
      Array.from(pendingChanges.entries()).map(([id, changes]) =>
        supabase.from("schedules").update(changes).eq("id", id)
      )
    );
    setSaving(false);
    onRefresh(); // re-fetch from DB — this also clears pendingChanges via the useEffect above
  };

  // Discard: revert items to the last-fetched state
  const handleDiscard = () => {
    setItems(classes);
    setPendingChanges(new Map());
  };

  // Close menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuId]);

  // Week dates
  const monday = getWeekMonday(weekOffset);
  const weekDates = ALL_DAYS.map((_, i) => addDays(monday, i));
  const activeDays = view === "work-week" ? WORK_DAYS : view === "day" ? [ALL_DAYS[dayOffset % 6]] : ALL_DAYS;
  const activeDates = view === "day" ? [addDays(monday, dayOffset % 6)] : weekDates.slice(0, activeDays.length);

  // Header date range string
  const start = activeDates[0];
  const end = activeDates[activeDates.length - 1];
  const rangeStr = start.getMonth() === end.getMonth()
    ? `${MONTH_SHORT[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
    : `${MONTH_SHORT[start.getMonth()]} ${start.getDate()} – ${MONTH_SHORT[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;

  const supabase = createClient();

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id); e.dataTransfer.setData("text/plain", id); e.dataTransfer.effectAllowed = "move";
  };
  const onDrop = (e: React.DragEvent, day: string, hour: number) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const orig = itemsRef.current.find(c => c.id === id);
    if (!orig) return;
    const dur = parseInt(orig.end_time) - parseInt(orig.start_time);
    const ns = `${String(hour).padStart(2, "0")}:00`;
    const ne = `${String(Math.min(hour + dur, 18)).padStart(2, "0")}:00`;
    // Only mark as changed if something actually moved
    if (orig.day_of_week !== day || orig.start_time !== ns) {
      setItems(prev => prev.map(c => c.id === id ? { ...c, day_of_week: day, start_time: ns, end_time: ne } : c));
      markPending(id, { day_of_week: day, start_time: ns, end_time: ne });
    }
    setDraggingId(null); setDropTarget(null);
  };

  // ── Resize ────────────────────────────────────────────────────────────────
  const onResizeMouseDown = useCallback((e: React.MouseEvent, cls: ClassEntry) => {
    e.preventDefault(); e.stopPropagation();
    const sh = parseInt(cls.start_time);
    const origEndH = parseInt(cls.end_time);
    resizeRef.current = { id: cls.id, startY: e.clientY, origEndH, startH: sh };
    const onMove = (mv: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = mv.clientY - resizeRef.current.startY;
      const clamped = Math.min(Math.max(resizeRef.current.origEndH + Math.round(delta / HOUR_H), resizeRef.current.startH + 1), 18);
      setItems(prev => prev.map(c => c.id === resizeRef.current!.id ? { ...c, end_time: `${String(clamped).padStart(2, "0")}:00` } : c));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (!resizeRef.current) return;
      const id = resizeRef.current.id;
      const updated = itemsRef.current.find(c => c.id === id);
      if (updated && updated.end_time !== `${String(origEndH).padStart(2, "0")}:00`) {
        markPending(id, { end_time: updated.end_time });
      }
      resizeRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [markPending]);

  // ── Duplicate ─────────────────────────────────────────────────────────────
  const handleDuplicate = async (cls: ClassEntry) => {
    setOpenMenuId(null);
    const { id, profiles, ...rest } = cls;
    const { data } = await supabase.from("schedules").insert([rest]).select("id, day_of_week, start_time, end_time, department_id, subject_name, staff_id, tenant_id, profiles(full_name)").single();
    if (data) setItems(prev => [...prev, data as unknown as ClassEntry]);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setOpenMenuId(null);
    setItems(prev => prev.filter(c => c.id !== id));
    await supabase.from("schedules").delete().eq("id", id);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">

      {/* ── Navigation Bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white gap-3 flex-wrap shrink-0">
        {/* Left: Home + date range + nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setWeekOffset(0); setDayOffset(0); }}
            title="Go to today"
            className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <Home size={14} />
          </button>

          <div className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 bg-white min-w-[180px]">
            <CalendarDays size={13} className="text-violet-500 mr-1" />
            {rangeStr}
          </div>

          <button onClick={() => view === "day" ? setDayOffset(d => d - 1) : setWeekOffset(o => o - 1)}
            className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => view === "day" ? setDayOffset(d => d + 1) : setWeekOffset(o => o + 1)}
            className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Right: Save bar (when dirty) OR view toggle */}
        <div className="flex items-center gap-2">
          {isDirty && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-medium text-amber-700">
                {pendingChanges.size} unsaved change{pendingChanges.size > 1 ? "s" : ""}
              </span>
              <button
                onClick={handleDiscard}
                className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-semibold rounded transition-colors"
              >
                {saving ? (
                  <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
                ) : (
                  <>Save Changes</>
                )}
              </button>
            </div>
          )}

          <div className="flex items-center bg-slate-100 rounded-md p-0.5 gap-0.5">
            {(["day", "week", "work-week"] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors capitalize ${view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {v === "work-week" ? "Work Week" : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      <div ref={scrollRef} className="overflow-auto custom-scrollbar flex-1 relative">
        <div style={{ minWidth: view === "day" ? 400 : 700 }}>
          {/* Day headers — compact */}
          <div className="grid sticky top-0 z-10 bg-white border-b border-slate-200"
            style={{ gridTemplateColumns: `64px repeat(${activeDays.length}, 1fr)` }}>
            <div className="bg-slate-50 border-r border-slate-200" style={{ height: 44 }} />
            {activeDays.map((day, i) => {
              const date = activeDates[i];
              const today = date && isToday(date);
              return (
                <div key={day} className="flex items-center justify-center gap-2 bg-slate-50 border-r border-slate-200 last:border-r-0" style={{ height: 44 }}>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{day.slice(0, 3)}</span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${today ? "bg-violet-600 text-white" : "text-slate-700"}`}>
                    {date?.getDate() ?? "—"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hour rows */}
          <div className="flex relative">
            {/* Time labels */}
            <div className="w-16 flex-shrink-0 border-r border-slate-200 bg-slate-50">
              {HOURS.map(h => (
                <div key={h} className="flex items-start justify-end pr-2 pt-2 border-b border-slate-200" style={{ height: HOUR_H }}>
                  <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">{fmtHour(h)}</span>
                </div>
              ))}
            </div>

            {/* ── Current time indicator line ── */}
            {nowTop >= 0 && nowTop <= HOURS.length * HOUR_H && (
              <div
                className="absolute left-16 right-0 z-20 pointer-events-none flex items-center"
                style={{ top: nowTop - 3, height: 6 }}
              >
                {/* Ripple dot — peeks 5px into the time-label gutter */}
                <div className="absolute -left-[5px] flex items-center justify-center w-[6px] h-[6px]">
                  <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-violet-400 opacity-70" />
                  <span className="relative block w-[6px] h-[6px] rounded-full bg-violet-600" />
                </div>
                {/* Hairline */}
                <div className="absolute left-0 right-0 h-px bg-violet-500 opacity-50" style={{ top: "50%", transform: "translateY(-50%)" }} />
              </div>
            )}

            {/* Day columns */}
            {activeDays.map(day => {
              const dayItems = items.filter(c => c.day_of_week === day);
              return (
                <div key={day} className="flex-1 relative border-r border-slate-200 last:border-r-0"
                  style={{ height: HOURS.length * HOUR_H }}>

                  {/* Drop + hover zones */}
                  {HOURS.map(hour => {
                    const isTarget = dropTarget?.day === day && dropTarget.hour === hour;
                    const isHovered = hoveredCell?.day === day && hoveredCell.hour === hour;
                    const hasEvents = dayItems.some(c => parseInt(c.start_time) === hour);

                    return (
                      <div key={hour}
                        className={`absolute w-full border-b border-dashed border-slate-200 transition-all duration-150 ease-in-out ${
                          isTarget ? "bg-violet-100/60" : isHovered && !hasEvents ? "bg-violet-50/70" : ""
                        }`}
                        style={{ top: (hour - 8) * HOUR_H, height: HOUR_H }}
                        onMouseEnter={() => setHoveredCell({ day, hour })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onDragOver={e => { e.preventDefault(); setDropTarget({ day, hour }); }}
                        onDragLeave={() => setDropTarget(null)}
                        onDrop={e => onDrop(e, day, hour)}
                      >
                        {/* plain + icon on empty hover — no circle */}
                        {isHovered && !hasEvents && (
                          <button
                            onClick={() => onAddSlot(day, hour)}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-500 transition-colors duration-150 z-10"
                          >
                            <Plus size={16} strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Events */}
                  {dayItems.map(cls => {
                    const sh = parseInt(cls.start_time);
                    const eh = parseInt(cls.end_time);
                    const top = (sh - 8) * HOUR_H;
                    const height = Math.max((eh - sh) * HOUR_H - 4, 36);
                    const c = getColor(cls.subject_name);
                    const isDragging = draggingId === cls.id;
                    const menuOpen = openMenuId === cls.id;
                    const live = isLive(cls, now);
                    const hasConflict = conflictIds.has(cls.id);

                    return (
                      <div key={cls.id} draggable
                        onDragStart={e => onDragStart(e, cls.id)}
                        onDragEnd={() => { setDraggingId(null); setDropTarget(null); }}
                        className={`absolute left-1 right-1 rounded-md border-l-4 ${c.border} ${c.bg} cursor-grab active:cursor-grabbing group select-none ${
                          isDragging ? "opacity-30" : "shadow-sm hover:shadow-md hover:-translate-y-px"
                        } transition-all ${
                          hasConflict ? "ring-1 ring-red-400 ring-offset-0 animate-conflict-pulse bg-red-50/80" : live ? "ring-2 ring-emerald-400 ring-offset-1" : ""
                        }`}
                        style={{ top: top + 2, height, zIndex: isDragging ? 0 : menuOpen ? 30 : 2 }}
                        title={hasConflict ? `Scheduling conflict: ${cls.profiles?.full_name ?? "this staff member"} has overlapping classes on ${cls.day_of_week}` : undefined}
                      >
                        <div className="px-2 pt-1.5 pb-4 h-full flex flex-col overflow-hidden">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className={`text-[11px] font-semibold leading-tight truncate ${c.text}`}>{cls.subject_name}</p>
                            {live && (
                              <span className="flex items-center gap-0.5 px-1 py-px bg-emerald-500 text-white text-[8px] font-bold rounded uppercase tracking-wide shrink-0">
                                <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                                Live
                              </span>
                            )}
                          </div>
                          {height > 46 && (
                            <div className={`flex items-center gap-1 mt-0.5 opacity-70 ${c.text}`}>
                              <Clock size={8} />
                              <span className="text-[9px] whitespace-nowrap">{fmtTime(cls.start_time)} – {fmtTime(cls.end_time)}</span>
                            </div>
                          )}
                          {height > 62 && cls.profiles?.full_name && (
                            <p className="text-[9px] mt-0.5 text-slate-500 truncate">{cls.profiles.full_name}</p>
                          )}
                        </div>

                        {/* ⋮ menu button */}
                        <button
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => { e.stopPropagation(); setOpenMenuId(menuOpen ? null : cls.id); }}
                          className={`absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center transition-opacity ${menuOpen ? "opacity-100 bg-white/90" : "opacity-0 group-hover:opacity-100 bg-white/80"} hover:bg-white border border-slate-200 z-10`}
                        >
                          <MoreVertical size={10} className={c.text} />
                        </button>



                        {/* Context menu */}
                        {menuOpen && (
                          <div ref={menuRef}
                            className="absolute right-0 top-6 w-36 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 overflow-hidden"
                            onMouseDown={e => e.stopPropagation()}>
                            <button onClick={() => { setOpenMenuId(null); onEdit(cls); }}
                              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                              <Pencil size={12} className="text-slate-400" /> Edit
                            </button>
                            <button onClick={() => handleDuplicate(cls)}
                              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                              <Copy size={12} className="text-slate-400" /> Duplicate
                            </button>
                            <div className="border-t border-slate-100 my-0.5" />
                            <button onClick={() => handleDelete(cls.id)}
                              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 size={12} className="text-red-400" /> Delete
                            </button>
                          </div>
                        )}

                        {/* Resize handle */}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-3 cursor-s-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          onMouseDown={e => onResizeMouseDown(e, cls)}>
                          <div className={`w-10 h-[3px] rounded-full ${c.bar} opacity-60`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
