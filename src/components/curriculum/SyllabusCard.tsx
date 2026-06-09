"use client";

import { useState } from "react";
import {
  ChevronDown, ChevronUp, BookOpen, CheckCircle2,
  Circle, Clock, Pencil, Trash2, Loader2,
} from "lucide-react";
import type { CurriculumUnit, SyllabusCompletion } from "@/actions/curriculum";

interface Props {
  unit: CurriculumUnit;
  completion?: SyllabusCompletion | null;
  canComplete?: boolean;
  canEdit?: boolean;
  onToggleComplete?: (unitId: string, current: boolean) => Promise<void>;
  onEdit?: (unit: CurriculumUnit) => void;
  onDelete?: (unitId: string) => Promise<void>;
}

export function SyllabusCard({
  unit, completion, canComplete, canEdit,
  onToggleComplete, onEdit, onDelete,
}: Props) {
  const [open,     setOpen]     = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isCompleted = completion?.is_completed ?? false;

  const handleToggle = async () => {
    if (!onToggleComplete) return;
    setToggling(true);
    await onToggleComplete(unit.id, isCompleted);
    setToggling(false);
  };

  const handleDelete = async () => {
    if (!onDelete || !confirm("Delete this unit and all its completion records?")) return;
    setDeleting(true);
    await onDelete(unit.id);
    setDeleting(false);
  };

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      isCompleted ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white"
    }`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Completion toggle */}
        {canComplete ? (
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="shrink-0 text-slate-300 hover:text-emerald-500 transition-colors disabled:opacity-50"
          >
            {toggling
              ? <Loader2 size={18} className="animate-spin text-emerald-400" />
              : isCompleted
              ? <CheckCircle2 size={18} className="text-emerald-500" />
              : <Circle size={18} />
            }
          </button>
        ) : (
          <div className="shrink-0">
            {isCompleted
              ? <CheckCircle2 size={16} className="text-emerald-500" />
              : <Circle size={16} className="text-slate-300" />
            }
          </div>
        )}

        {/* Unit number badge */}
        <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-violet-100 text-violet-700 text-xs font-bold">
          {unit.unit_number}
        </span>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm truncate ${isCompleted ? "text-emerald-700 line-through decoration-emerald-300" : "text-slate-800"}`}>
            {unit.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
            <Clock size={10} />
            <span>{unit.hours_allocated} hrs</span>
            {unit.topics?.length ? <span>· {unit.topics.length} topics</span> : null}
            {completion?.completed_at && (
              <span className="text-emerald-500">· Done {completion.completed_at}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {canEdit && (
            <>
              <button
                onClick={() => onEdit?.(unit)}
                className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              </button>
            </>
          )}
          <button
            onClick={() => setOpen(o => !o)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {open && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3">
          {unit.description && (
            <p className="text-xs text-slate-600 leading-relaxed">{unit.description}</p>
          )}

          {unit.topics?.length ? (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Topics</p>
              <ul className="space-y-1">
                {unit.topics.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="w-1 h-1 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {unit.reference_books?.length ? (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                <BookOpen size={10} className="inline mr-1" />Reference Books
              </p>
              <ul className="space-y-1">
                {unit.reference_books.map((b, i) => (
                  <li key={i} className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">{b.title}</span>
                    {b.author && <span className="text-slate-400"> — {b.author}</span>}
                    {b.isbn && <span className="text-slate-400 font-mono"> · {b.isbn}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {completion?.completion_notes && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-0.5">Completion Note</p>
              <p className="text-xs text-emerald-700">{completion.completion_notes}</p>
            </div>
          )}

          {!unit.description && !unit.topics?.length && !unit.reference_books?.length && !completion?.completion_notes && (
            <p className="text-xs text-slate-400 italic">No additional details.</p>
          )}
        </div>
      )}
    </div>
  );
}
