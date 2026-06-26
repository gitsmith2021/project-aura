"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useInstitution } from "@/context/InstitutionContext";
import { createClient } from "@/utils/supabase/client";
import { LocalizationSettings } from "@/components/settings/LocalizationSettings";
import { listInstitutionSettings, setSetting } from "@/actions/config";
import { getInstitutionPlan, type InstitutionPlan } from "@/actions/subscriptions";
import { isEnforced, isDeferred, type ResolvedSetting, type SettingValue } from "@/lib/config";
import { STATUS_LABELS, STATUS_STYLES, formatINR, type SubStatus } from "@/lib/subscriptions";
import {
  Building2, Bell, ShieldCheck, CreditCard, Save, Globe, Server,
  Mail, Smartphone, MessageCircle, Lock, Clock, KeyRound, type LucideIcon,
} from "lucide-react";

// Settings → General. The polished tabbed layout, but every control binds to
// real data — Institution profile + localization persist; Notifications/Security
// toggles read & write the App Config store (same source as App Config); Billing
// shows the real 7E subscription. Honest Live/Planned/Advisory badge per control.

type Inst = { id: string; name: string; college_type: string | null; subdomain: string | null; currency: string | null; locale: string | null; timezone: string | null };
type TabId = "institution" | "notifications" | "security" | "billing";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "institution",  label: "Institution",   icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security",      label: "Security",      icon: ShieldCheck },
  { id: "billing",       label: "Billing & Plan", icon: CreditCard },
];

// Per-setting icon for the styled cards.
const SETTING_ICON: Record<string, LucideIcon> = {
  "notifications.email_enabled": Mail,
  "notifications.sms_enabled": Smartphone,
  "notifications.whatsapp_enabled": MessageCircle,
  "security.enforce_2fa": ShieldCheck,
  "security.strict_password": Lock,
  "security.session_timeout_min": Clock,
};

export default function GeneralSettingsPage() {
  const { selectedId } = useInstitution();
  const [tab, setTab] = useState<TabId>("institution");
  const [inst, setInst] = useState<Inst | null>(null);
  const [settings, setSettings] = useState<ResolvedSetting[]>([]);
  const [plan, setPlan] = useState<InstitutionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      createClient().from("institutions").select("id, name, college_type, subdomain, currency, locale, timezone").eq("id", selectedId).maybeSingle(),
      listInstitutionSettings(selectedId),
      getInstitutionPlan(selectedId),
    ]).then(([instRes, settingsRes, planRes]) => {
      if (cancelled) return;
      if (instRes.data) setInst(instRes.data as Inst);
      if (settingsRes.success) setSettings(settingsRes.data);
      if (planRes.success) setPlan(planRes.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedId]);

  const byCategory = useMemo(() => {
    const m = new Map<string, ResolvedSetting[]>();
    for (const s of settings) { const a = m.get(s.category) ?? []; a.push(s); m.set(s.category, a); }
    for (const a of m.values()) a.sort((x, y) => x.sortOrder - y.sortOrder);
    return m;
  }, [settings]);

  async function saveProfile() {
    if (!inst) return;
    setSaving(true); setError(null);
    const { error: e } = await createClient().from("institutions").update({ name: inst.name, college_type: inst.college_type }).eq("id", inst.id);
    if (e) setError(e.message); else setSavedAt(Date.now());
    setSaving(false);
  }

  async function changeSetting(key: string, value: SettingValue) {
    if (!selectedId) return;
    setBusyKey(key);
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value, isOverridden: true } : s));
    const res = await setSetting({ institutionId: selectedId, key, value });
    if (!res.success) {
      setError(res.error);
      const fresh = await listInstitutionSettings(selectedId);
      if (fresh.success) setSettings(fresh.data);
    }
    setBusyKey(null);
  }

  return (
    <DashboardLayout>
      <div className="px-6 pt-6 pb-6 w-full flex flex-col h-[calc(100vh-56px)] min-h-0 overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
        <div className="mb-3 shrink-0">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">General Settings</h1>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Profile, localization, notifications, security and billing for the selected institution.</p>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          {/* Tab sidebar */}
          <div className="w-56 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0 p-3">
            <div className="space-y-0.5">
              {TABS.map(t => {
                const active = tab === t.id;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${active ? "bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                    <t.icon size={16} className={active ? "text-purple-600 dark:text-purple-400" : "text-slate-400"} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white dark:bg-slate-900">
            <div className="max-w-2xl">
              {error && <div className="mb-4 px-3 py-2 rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">{error}</div>}

              {!selectedId ? <Empty msg="Select an institution." />
                : loading ? <Empty msg="Loading…" />
                : tab === "institution" ? (
                  <InstitutionTab inst={inst} setInst={setInst} onSave={saveProfile} saving={saving} savedAt={savedAt} />
                ) : tab === "billing" ? (
                  <BillingTab plan={plan} />
                ) : (
                  <SettingsTab
                    title={tab === "notifications" ? "Communication" : "Security Policies"}
                    blurb={tab === "notifications"
                      ? "Channels used for alerts across this institution. Provider credentials (Resend/SMS/WhatsApp) are configured via environment secrets."
                      : "Account-security policies for this institution."}
                    items={byCategory.get(tab === "notifications" ? "Notifications" : "Security") ?? []}
                    busyKey={busyKey}
                    onChange={changeSetting}
                  />
                )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ── Tabs ────────────────────────────────────────────────────────────────────────

const inputCls = "w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500/30 focus:border-purple-500 text-xs";

function InstitutionTab({ inst, setInst, onSave, saving, savedAt }: { inst: Inst | null; setInst: (i: Inst) => void; onSave: () => void; saving: boolean; savedAt: number | null }) {
  if (!inst) return <Empty msg="Institution not found." />;
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Institution Profile</h2>
          <button onClick={onSave} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-xs font-semibold disabled:opacity-70">
            {saving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
            {savedAt && !saving ? "Saved" : "Save"}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Institution Name">
            <input type="text" value={inst.name} onChange={e => setInst({ ...inst, name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="College Type">
            <select value={inst.college_type ?? ""} onChange={e => setInst({ ...inst, college_type: e.target.value })} className={inputCls}>
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
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2">
          <Globe size={15} className="text-purple-600 dark:text-purple-400" /> Localization
        </h2>
        <LocalizationSettings institutionId={inst.id} initial={{ currency: inst.currency ?? undefined, locale: inst.locale ?? undefined, timezone: inst.timezone ?? undefined }} />
      </div>
    </div>
  );
}

function SettingsTab({ title, blurb, items, busyKey, onChange }: { title: string; blurb: string; items: ResolvedSetting[]; busyKey: string | null; onChange: (k: string, v: SettingValue) => void }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div>
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{blurb}</p>
      </div>
      <div className="space-y-2.5">
        {items.length === 0 ? <Empty msg="No settings." /> : items.map(s => {
          const Icon = SETTING_ICON[s.key] ?? KeyRound;
          return (
            <div key={s.key} className="flex items-start justify-between gap-4 p-3.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-md bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{s.label}</p>
                    <Badge settingKey={s.key} />
                  </div>
                  {s.description && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{s.description}</p>}
                </div>
              </div>
              <div className="shrink-0 pt-0.5"><Control setting={s} disabled={busyKey === s.key} onChange={v => onChange(s.key, v)} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BillingTab({ plan }: { plan: InstitutionPlan | null }) {
  const status = (plan?.status ?? "none") as SubStatus | "none";
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">Current Subscription</h2>
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-lg p-5 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none"><Server size={120} className="-mt-8 -mr-8" /></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold mb-3 border border-white/10 backdrop-blur-sm">
            {plan?.planName ?? "No plan assigned"}
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-2xl font-bold capitalize">{status === "none" ? "Unsubscribed" : STATUS_LABELS[status as SubStatus]}</span>
            {status !== "none" && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[status as SubStatus]}`}>{STATUS_LABELS[status as SubStatus]}</span>}
          </div>
          <p className="text-xs text-purple-200 max-w-xs">
            {plan?.expiresAt ? `Renews / expires ${new Date(plan.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : "No active billing period."}
          </p>
          <a href="/admin/billing" className="inline-block mt-4 px-3 py-1.5 bg-white text-purple-900 rounded-md text-xs font-semibold hover:bg-slate-50 transition-colors">Manage in Admin Console</a>
        </div>
      </div>
      {plan && plan.features.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Included modules</p>
          <div className="flex flex-wrap gap-1.5">
            {plan.features.map(f => <span key={f} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">{f}</span>)}
          </div>
        </div>
      )}
      <p className="text-[11px] text-slate-400">Plan amounts and invoices live in the super-admin Billing console.</p>
    </div>
  );
}

// ── Shared ──────────────────────────────────────────────────────────────────────

function Control({ setting, disabled, onChange }: { setting: ResolvedSetting; disabled: boolean; onChange: (v: SettingValue) => void }) {
  if (setting.type === "toggle") {
    const on = setting.value === true;
    return (
      <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-60 ${on ? "bg-purple-600" : "bg-slate-200 dark:bg-slate-700"}`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${on ? "translate-x-4" : "translate-x-1"}`} />
      </button>
    );
  }
  if (setting.type === "select") {
    return (
      <select value={String(setting.value)} disabled={disabled} onChange={e => onChange(e.target.value)} className={`${inputCls} min-w-[9rem]`}>
        {(setting.options ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (setting.type === "number") {
    return <input type="number" defaultValue={Number(setting.value)} disabled={disabled} onBlur={e => { const n = Number(e.target.value); if (Number.isFinite(n) && n !== setting.value) onChange(n); }} className={`${inputCls} w-24 text-right`} />;
  }
  return <input type="text" defaultValue={String(setting.value)} disabled={disabled} onBlur={e => { if (e.target.value !== setting.value) onChange(e.target.value); }} className={`${inputCls} w-44`} />;
}

function Badge({ settingKey }: { settingKey: string }) {
  if (isEnforced(settingKey)) return <span title="Wired to behaviour — takes effect now." className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">● Live</span>;
  if (isDeferred(settingKey)) return <span title="Gates infrastructure that isn't live yet (SMS/push/2FA). Stored, no effect until that ships." className="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">◷ Planned</span>;
  return <span title="Stored & audited, not yet wired to behaviour." className="text-[9px] font-bold uppercase tracking-wider text-slate-400">○ Advisory</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</label>{children}</div>;
}

function Empty({ msg }: { msg: string }) {
  return <div className="flex items-center justify-center h-40 text-xs text-slate-400">{msg}</div>;
}
