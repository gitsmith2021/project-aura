"use client";

import { Radio, Smartphone, X } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function AttendanceSlideOver({ isOpen, onClose }: Props) {
  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-200 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      <div
        className={`fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative h-full w-full max-w-sm flex flex-col border-l border-slate-200 bg-white shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-panel-title"
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100">
              <Radio className="h-4 w-4 text-violet-600" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2 id="attendance-panel-title" className="text-sm font-semibold text-slate-900 tracking-tight">
                Attendance
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">Mobile NFC gateway & sync activity</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors shrink-0"
            aria-label="Close attendance panel"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 p-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-[0_8px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-8 -top-12 h-28 w-28 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-4 -left-6 h-20 w-20 rounded-full bg-teal-400/15 blur-2xl" />

            <div className="relative z-10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 shadow-inner shadow-emerald-500/10">
                    <Radio className="h-5 w-5 text-emerald-600" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600/90">
                      NFC Gateway
                    </p>
                    <p className="text-sm font-semibold text-slate-800">Mobile attendance</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.85)]" />
                  </span>
                  <span className="text-[10px] font-bold tracking-wide text-emerald-700">Gateway Active</span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200/70 bg-white/50 p-3 backdrop-blur-md">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Recent Mobile Syncs
                  </span>
                  <Smartphone className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
                </div>
                <ul className="space-y-2">
                  <li className="rounded-lg border border-dashed border-slate-200/90 bg-slate-50/80 px-3 py-6 text-center">
                    <p className="text-[11px] font-medium text-slate-500">No sync events yet</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Taps from registered phones will appear here.
                    </p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
