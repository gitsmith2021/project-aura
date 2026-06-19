"use client";

import { FileText, Presentation, Video, Package, FileQuestion, Link2, ExternalLink, Download, Eye, EyeOff, Trash2 } from "lucide-react";
import { MATERIAL_TYPE_LABELS, type MaterialType } from "@/lib/lms";
import type { MaterialRow } from "@/actions/studyMaterials";

const ICONS: Record<MaterialType, typeof FileText> = {
  notes: FileText,
  slides: Presentation,
  video_link: Video,
  scorm_package: Package,
  question_paper: FileQuestion,
  reference: Link2,
};
const ICON_TINT: Record<MaterialType, string> = {
  notes: "text-sky-600 bg-sky-100 dark:bg-sky-950/40",
  slides: "text-amber-600 bg-amber-100 dark:bg-amber-950/40",
  video_link: "text-rose-600 bg-rose-100 dark:bg-rose-950/40",
  scorm_package: "text-violet-600 bg-violet-100 dark:bg-violet-950/40",
  question_paper: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40",
  reference: "text-slate-600 bg-slate-100 dark:bg-slate-800",
};

export function MaterialCard({ material, manage }: {
  material: MaterialRow;
  manage?: { onTogglePublish: () => void; onDelete: () => void };
}) {
  const Icon = ICONS[material.materialType];
  const href = material.externalUrl || material.fileUrl || "#";
  const isExternal = !!material.externalUrl;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col">
      <div className="flex items-start gap-3">
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ICON_TINT[material.materialType]}`}><Icon size={17} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{material.title}</p>
          <p className="text-[11px] text-slate-400">{MATERIAL_TYPE_LABELS[material.materialType]}{material.uploadedByName ? ` · ${material.uploadedByName}` : ""}</p>
        </div>
        {manage && (material.isPublished
          ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0">Published</span>
          : <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 shrink-0">Draft</span>)}
      </div>

      {material.unitNumber !== null && (
        <span className="mt-2 self-start text-[10px] px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300">Unit {material.unitNumber}{material.unitTitle ? ` · ${material.unitTitle}` : ""}</span>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-violet-600 hover:text-violet-700">
          {isExternal ? <><ExternalLink size={13} /> Open</> : <><Download size={13} /> Download</>}
        </a>
        {manage && (
          <div className="ml-auto flex items-center gap-1">
            <button onClick={manage.onTogglePublish} title={material.isPublished ? "Unpublish" : "Publish"} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">{material.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            <button onClick={manage.onDelete} title="Delete" className="p-1.5 rounded-md text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
