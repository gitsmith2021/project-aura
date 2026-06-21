"use client";

import { useState } from "react";
import { X, Check, FolderPlus, Loader2 } from "lucide-react";
import type { Collection } from "@/actions/knowledgeHub";

type Props = {
  isOpen: boolean;
  resourceTitle: string;
  myCollections: Collection[];
  isInCollection: (collectionId: string) => boolean;
  onToggle: (collectionId: string, present: boolean) => void;
  onCreate: (name: string) => Promise<void>;
  onClose: () => void;
};

// KH-3 — pick which of MY collections a resource belongs to (+ quick create).
export function AddToCollectionDrawer({ isOpen, resourceTitle, myCollections, isInCollection, onToggle, onCreate, onClose }: Props) {
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    await onCreate(newName.trim());
    setNewName("");
    setBusy(false);
  };

  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-200 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div className={`fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div className={`relative w-full max-w-sm h-full bg-white dark:bg-slate-900 flex flex-col border-l border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Add to collection</h2>
            <p className="text-xs text-slate-500 truncate">{resourceTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {myCollections.length === 0 ? (
            <p className="text-xs text-slate-500">You have no collections yet. Create one below.</p>
          ) : (
            myCollections.map((c) => {
              const inIt = isInCollection(c.id);
              return (
                <button key={c.id} onClick={() => onToggle(c.id, !inIt)}
                  className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${inIt ? "border-violet-300 bg-violet-50 dark:bg-violet-950/30" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{c.name}</span>
                    <span className="block text-[11px] text-slate-400">{c.resourceIds.length} item{c.resourceIds.length === 1 ? "" : "s"} · {c.is_public ? "public" : "private"}</span>
                  </span>
                  {inIt && <Check size={16} className="text-violet-600 shrink-0" />}
                </button>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New collection name"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); create(); } }}
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
            <button onClick={create} disabled={busy || !newName.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <FolderPlus size={14} />} Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
