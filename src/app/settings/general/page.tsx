"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useInstitution } from "@/context/InstitutionContext";
import { createClient } from "@/utils/supabase/client";
import { LocalizationSettings } from "@/components/settings/LocalizationSettings";
import { Building2, Save, SlidersHorizontal, CreditCard, ArrowRight } from "lucide-react";

// Settings → General. The genuinely real, persisted institution settings
// (profile + localization). Behaviour toggles that used to be mock here now
// live in Settings → App Config (CF-1), so nothing on this page is a dummy
// control — it all saves.
type Inst = {
  id: string;
  name: string;
  college_type: string | null;
  subdomain: string | null;
  currency: string | null;
  locale: string | null;
  timezone: string | null;
};

const inputCls =
  "w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500/30 focus:border-purple-500 text-xs";

export default function GeneralSettingsPage() {
  const { selectedId } = useInstitution();
  const [inst, setInst] = useState<Inst | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    createClient()
      .from("institutions")
      .select("id, name, college_type, subdomain, currency, locale, timezone")
      .eq("id", selectedId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setInst(data as Inst);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedId]);

  async function save() {
    if (!inst) return;
    setSaving(true);
    setError(null);
    const { error: e } = await createClient()
      .from("institutions")
      .update({ name: inst.name, college_type: inst.college_type })
      .eq("id", inst.id);
    if (e) setError(e.message);
    else setSavedAt(Date.now());
    setSaving(false);
  }

  return (
    <DashboardLayout>
      <div className="px-6 pt-6 pb-6 w-full bg-slate-50/50 dark:bg-slate-950/20 min-h-[calc(100vh-56px)]">
        <div className="max-w-2xl mx-auto">
          <div className="mb-5">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">General Settings</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">Institution profile and localization for the selected institution.</p>
          </div>

          {!selectedId ? (
            <Empty msg="Select an institution to manage its settings." />
          ) : loading ? (
            <Empty msg="Loading…" />
          ) : !inst ? (
            <Empty msg="Institution not found." />
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="px-3 py-2 rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">{error}</div>
              )}

              {/* Institution profile (real, persisted) */}
              <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-4">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Building2 size={15} className="text-purple-600 dark:text-purple-400" /> Institution Profile
                  </h2>
                  <button
                    onClick={save}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-xs font-semibold disabled:opacity-70"
                  >
                    {saving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                    {savedAt && !saving ? "Saved" : "Save"}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Institution Name">
                    <input
                      type="text"
                      value={inst.name}
                      onChange={(e) => setInst({ ...inst, name: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="College Type">
                    <select
                      value={inst.college_type ?? ""}
                      onChange={(e) => setInst({ ...inst, college_type: e.target.value })}
                      className={inputCls}
                    >
                      <option value="Arts & Science">Arts &amp; Science</option>
                      <option value="Arts">Arts</option>
                      <option value="Health">Health</option>
                      <option value="Nursing">Nursing</option>
                      <option value="Engineering">Engineering</option>
                    </select>
                  </Field>
                  <Field label="Subdomain">
                    <div className="flex items-stretch rounded-md">
                      <input type="text" readOnly value={inst.subdomain ?? ""} className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-md text-xs text-slate-500 cursor-not-allowed" />
                      <span className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-r-md text-slate-400 text-xs flex items-center">.aura.edu</span>
                    </div>
                  </Field>
                </div>
              </section>

              {/* Localization (real, persisted via its own action) */}
              <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <LocalizationSettings
                  institutionId={inst.id}
                  initial={{ currency: inst.currency ?? undefined, locale: inst.locale ?? undefined, timezone: inst.timezone ?? undefined }}
                />
              </section>

              {/* Pointer: behaviour settings moved to App Config */}
              <Link href="/settings/app-config" className="block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center shrink-0">
                    <SlidersHorizontal size={16} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">App Config</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Notifications, security, attendance, portals, feature flags and more — all configurable, no code changes.</p>
                  </div>
                  <ArrowRight size={16} className="text-slate-400 shrink-0" />
                </div>
              </Link>

              {/* Pointer: billing lives in the admin console */}
              <Link href="/admin/billing" className="block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                    <CreditCard size={16} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Billing &amp; Plans</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Subscription, plan and invoices (super-admin console).</p>
                  </div>
                  <ArrowRight size={16} className="text-slate-400 shrink-0" />
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</label>
      {children}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="flex items-center justify-center h-40 text-xs text-slate-400">{msg}</div>;
}
