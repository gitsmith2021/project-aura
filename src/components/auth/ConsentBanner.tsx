"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Loader2, LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getConsentStatus, recordConsents } from "@/actions/privacy";
import { CONSENT_TYPE_META, type ConsentType } from "@/lib/dataRetention";

// Pages where the banner must never appear: the user either isn't signed in
// yet or is reading the policy the banner links to.
const SKIP_PATHS = ["/login", "/privacy-policy"];

/**
 * DPDP Act 2023 first-login consent capture. Mounted once in the root layout;
 * checks consent state after sign-in and blocks the UI with a consent modal
 * until the required consents are recorded.
 */
export function ConsentBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [types, setTypes] = useState<ConsentType[]>([]);
  const [checked, setChecked] = useState<Set<ConsentType>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (SKIP_PATHS.includes(pathname)) return;
    let cancelled = false;
    getConsentStatus().then((res) => {
      if (cancelled || !res.success || !res.data.needsConsent) return;
      setTypes(res.data.bannerTypes);
      // Pre-tick consents the user already granted (e.g. only terms missing)
      setChecked(
        new Set(res.data.bannerTypes.filter((t) => res.data.status[t]?.consented))
      );
      setVisible(true);
    });
    return () => { cancelled = true; };
    // Re-check on path change only while hidden — once visible it stays until resolved
     
  }, [pathname, visible]);

  if (!visible) return null;

  const requiredMissing = types.some(
    (t) => CONSENT_TYPE_META[t].required && !checked.has(t)
  );

  function toggle(t: ConsentType) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }

  async function handleAccept() {
    setSaving(true);
    setError("");
    const res = await recordConsents(
      types.map((t) => ({ consent_type: t, consented: checked.has(t) }))
    );
    if (!res.success) {
      setError(res.error);
      setSaving(false);
      return;
    }
    setVisible(false);
    setSaving(false);
  }

  async function handleDecline() {
    await createClient().auth.signOut();
    document.cookie = "aura-role=; path=/; max-age=0";
    window.location.href = "/login";
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
            <ShieldCheck size={18} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Your data, your choice</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Consent required under the DPDP Act 2023 ·{" "}
              <Link href="/privacy-policy" target="_blank" className="text-violet-600 dark:text-violet-400 hover:underline">
                Read the privacy policy
              </Link>
            </p>
          </div>
        </div>

        {/* Choices */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {types.map((t) => {
            const meta = CONSENT_TYPE_META[t];
            return (
              <label
                key={t}
                className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checked.has(t)}
                  onChange={() => toggle(t)}
                  className="mt-0.5 w-4 h-4 rounded accent-violet-600 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {meta.label}
                    {meta.required ? (
                      <span className="ml-1.5 text-[9px] font-bold text-violet-600 dark:text-violet-400 uppercase">required</span>
                    ) : (
                      <span className="ml-1.5 text-[9px] font-medium text-slate-400 uppercase">optional</span>
                    )}
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                    {meta.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        {error && <p className="px-6 pb-2 text-xs text-red-600 shrink-0">{error}</p>}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            onClick={handleDecline}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut size={13} /> Decline &amp; sign out
          </button>
          <button
            onClick={handleAccept}
            disabled={saving || requiredMissing}
            title={requiredMissing ? "Tick the required consents to continue" : undefined}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            Save my choices
          </button>
        </div>
      </div>
    </div>
  );
}
