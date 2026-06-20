"use client";

import { useMemo, useState, useTransition } from "react";
import { Globe, Check, Loader2, Coins, Clock, Languages } from "lucide-react";
import {
  SUPPORTED_CURRENCIES, SUPPORTED_LOCALES, COMMON_TIMEZONES,
  formatCurrency, formatDateTime, withLocalizationDefaults, type Localization,
} from "@/lib/locale";
import { updateInstitutionLocalization } from "@/actions/institutionSettings";

type Props = {
  institutionId: string;
  initial: Partial<Localization> | null;
};

const inputCls =
  "w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 transition-colors";

/**
 * Arch A6 — embeddable Localization card (currency / locale / timezone) for an
 * institution. Self-contained: loads from `initial`, saves via the server action
 * (validated + audited), with a live preview.
 */
export function LocalizationSettings({ institutionId, initial }: Props) {
  const start = withLocalizationDefaults(initial);
  const [currency, setCurrency] = useState(start.currency);
  const [locale, setLocale] = useState(start.locale);
  const [timezone, setTimezone] = useState(start.timezone);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const loc = useMemo(() => ({ currency, locale, timezone }), [currency, locale, timezone]);
  const dirty = currency !== start.currency || locale !== start.locale || timezone !== start.timezone;

  // Always include the institution's current timezone even if outside the curated list.
  const timezoneOptions = useMemo(() => {
    const set = new Set<string>(COMMON_TIMEZONES);
    if (timezone) set.add(timezone);
    return Array.from(set).sort();
  }, [timezone]);

  const save = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await updateInstitutionLocalization(institutionId, { currency, locale, timezone });
      setMsg(res.success ? { kind: "ok", text: "Localization saved." } : { kind: "err", text: res.error });
    });
  };

  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
        <Globe size={12} /> Localization
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-350">
            <Coins size={12} /> Currency
          </label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.label} ({c.symbol})</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-350">
            <Languages size={12} /> Locale
          </label>
          <select value={locale} onChange={(e) => setLocale(e.target.value)} className={inputCls}>
            {SUPPORTED_LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label} ({l.code})</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-350">
            <Clock size={12} /> Timezone
          </label>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputCls}>
            {timezoneOptions.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-3 py-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Preview</span>
        <span className="text-slate-500">Amount <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(1234567.5, loc, { decimals: 2 })}</span></span>
        <span className="text-slate-500">Now <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDateTime(new Date(), loc)}</span></span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-slate-400">Display-only — amounts stay raw, timestamps stay UTC.</p>
        <div className="flex items-center gap-3">
          {msg && (
            <span className={`text-xs ${msg.kind === "ok" ? "text-emerald-600 flex items-center gap-1" : "text-rose-600"}`}>
              {msg.kind === "ok" && <Check size={13} />} {msg.text}
            </span>
          )}
          <button
            type="button" onClick={save} disabled={!dirty || isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : null}
            Save localization
          </button>
        </div>
      </div>
    </div>
  );
}
