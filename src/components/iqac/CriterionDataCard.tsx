import { completenessBand, BAND_COLOR } from "@/lib/iqac";

export function CriterionDataCard({ number, title, completeness, liveWithData, total }: {
  number: number; title: string; completeness: number; liveWithData: number; total: number;
}) {
  const band = completenessBand(completeness);
  const color = BAND_COLOR[band];
  const ring = `conic-gradient(${color} ${completeness}%, rgb(226 232 240) ${completeness}%)`;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-4">
      <div className="w-16 h-16 rounded-full grid place-items-center shrink-0" style={{ background: ring }}>
        <div className="rounded-full bg-white dark:bg-slate-900 grid place-items-center" style={{ width: 48, height: 48 }}>
          <span className="text-[13px] font-bold text-slate-900 dark:text-white">{completeness}%</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Criterion {number}</p>
        <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight">{title}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{liveWithData}/{total} evidence sources populated</p>
      </div>
    </div>
  );
}
