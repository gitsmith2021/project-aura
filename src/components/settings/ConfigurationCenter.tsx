"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, RotateCcw, Save, Building2, SlidersHorizontal } from "lucide-react";
import { useInstitution } from "@/context/InstitutionContext";
import { createClient } from "@/utils/supabase/client";
import { LocalizationSettings } from "@/components/settings/LocalizationSettings";
import { listInstitutionSettings, setSetting, resetSetting } from "@/actions/config";
import {
  groupByCategory, searchSettings, isEnforced, isDeferred,
  type ResolvedSetting, type SettingValue,
} from "@/lib/config";

// AURA CORE FOUNDATION · CF-1 — App Configuration Center.
// Registry-driven: every control is rendered from a seeded definition, so adding
// a setting is a seed row, never new UI. Institution-scoped via useInstitution().
// The pinned "Institution Profile" panel preserves the real profile + locale
// editors (which write the institutions row, not the config store).

const PROFILE = "Institution Profile"; // pinned synthetic category (not from registry)

type Inst = { id: string; name: string; college_type: string | null; currency: string | null; locale: string | null; timezone: string | null };

export function ConfigurationCenter() {
  const { selectedId } = useInstitution();
  const [settings, setSettings] = useState<ResolvedSetting[]>([]);
  const [inst, setInst] = useState<Inst | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string>(PROFILE);
  const [query, setQuery] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the institution profile + its resolved settings.
  useEffect(() => {
    if (!selectedId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    Promise.all([
      supabase.from("institutions").select("id, name, college_type, currency, locale, timezone").eq("id", selectedId).maybeSingle(),
      listInstitutionSettings(selectedId),
    ]).then(([instRes, settingsRes]) => {
      if (cancelled) return;
      if (instRes.data) setInst(instRes.data as Inst);
      if (settingsRes.success) setSettings(settingsRes.data);
      else setError(settingsRes.error);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedId]);

  const grouped = useMemo(() => groupByCategory(settings), [settings]);
  const filtered = useMemo(() => searchSettings(settings, query), [settings, query]);
  const searching = query.trim().length > 0;

  // Category list: pinned profile + registry categories (or search results).
  const visibleCategories = useMemo(() => {
    if (searching) return [];
    return [PROFILE, ...grouped.map((g) => g.category)];
  }, [grouped, searching]);

  const activeSettings = useMemo(() => {
    if (searching) return filtered;
    return grouped.find((g) => g.category === active)?.settings ?? [];
  }, [grouped, active, searching, filtered]);

  async function onChange(key: string, value: SettingValue) {
    if (!selectedId) return;
    setSavingKey(key);
    // optimistic
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value, isOverridden: true } : s)));
    const res = await setSetting({ institutionId: selectedId, key, value });
    if (!res.success) {
      setError(res.error);
      const fresh = await listInstitutionSettings(selectedId);
      if (fresh.success) setSettings(fresh.data);
    }
    setSavingKey(null);
  }

  async function onReset(key: string) {
    if (!selectedId) return;
    setSavingKey(key);
    const res = await resetSetting({ institutionId: selectedId, key });
    if (res.success) {
      const fresh = await listInstitutionSettings(selectedId);
      if (fresh.success) setSettings(fresh.data);
    } else setError(res.error);
    setSavingKey(null);
  }

  async function saveProfile() {
    if (!inst) return;
    setProfileSaving(true);
    const supabase = createClient();
    const { error: e } = await supabase
      .from("institutions")
      .update({ name: inst.name, college_type: inst.college_type })
      .eq("id", inst.id);
    if (e) setError(e.message);
    setProfileSaving(false);
  }

  if (!selectedId) {
    return <Shell><Empty msg="Select an institution to configure." /></Shell>;
  }

  return (
    <Shell>
      <div className="flex flex-1 min-h-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        {/* Sidebar: search + categories */}
        <div className="w-60 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search settings…"
                className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500/30 focus:border-purple-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
            {searching ? (
              <p className="px-2 py-2 text-[11px] text-slate-400">{filtered.length} result{filtered.length === 1 ? "" : "s"}</p>
            ) : (
              visibleCategories.map((cat) => {
                const isActive = cat === active;
                const isProfile = cat === PROFILE;
                return (
                  <button
                    key={cat}
                    onClick={() => setActive(cat)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-semibold transition-colors text-left ${
                      isActive
                        ? "bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {isProfile
                      ? <Building2 size={14} className={isActive ? "text-purple-600" : "text-slate-400"} />
                      : <SlidersHorizontal size={14} className={isActive ? "text-purple-600" : "text-slate-400"} />}
                    {cat}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white dark:bg-slate-900">
          {error && (
            <div className="mb-4 px-3 py-2 rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">{error}</div>
          )}

          {loading ? (
            <Empty msg="Loading configuration…" />
          ) : !searching && active === PROFILE ? (
            <ProfilePanel inst={inst} setInst={setInst} onSave={saveProfile} saving={profileSaving} />
          ) : (
            <div className="max-w-2xl">
              {!searching && (
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">{active}</h2>
              )}
              <div className="space-y-1.5">
                {activeSettings.length === 0
                  ? <Empty msg={searching ? "No settings match your search." : "No settings in this category."} />
                  : activeSettings.map((s) => (
                      <SettingRow
                        key={s.key}
                        setting={s}
                        saving={savingKey === s.key}
                        showCategory={searching}
                        onChange={(v) => onChange(s.key, v)}
                        onReset={() => onReset(s.key)}
                      />
                    ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

// ── Subcomponents ───────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 pt-6 pb-6 w-full flex flex-col h-[calc(100vh-56px)] min-h-0 overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
      <div className="mb-3 shrink-0">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">Configuration Center</h1>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
          Manage platform behaviour without changing code — settings apply to the selected institution.
        </p>
        <div className="flex items-center gap-3 mt-1.5 text-[10px] font-semibold">
          <span className="text-emerald-600 dark:text-emerald-400">● Live</span>
          <span className="text-slate-400">— takes effect now</span>
          <span className="text-amber-600 dark:text-amber-400">◷ Planned</span>
          <span className="text-slate-400">— awaits deferred infra (SMS/push/2FA)</span>
          <span className="text-slate-400">○ Advisory</span>
          <span className="text-slate-400">— stored, not yet wired</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="flex items-center justify-center h-40 text-xs text-slate-400">{msg}</div>;
}

/** Honest status of a setting: does changing it actually do anything yet? */
function StatusBadge({ settingKey }: { settingKey: string }) {
  if (isEnforced(settingKey)) {
    return (
      <span title="This setting is wired to behaviour — changes take effect."
        className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">● Live</span>
    );
  }
  if (isDeferred(settingKey)) {
    return (
      <span title="Gates infrastructure that isn't live yet (e.g. SMS/push/2FA). Stored, but no effect until that ships."
        className="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">◷ Planned</span>
    );
  }
  return (
    <span title="Stored & audited, but not yet wired to behaviour."
      className="text-[9px] font-bold uppercase tracking-wider text-slate-400">○ Advisory</span>
  );
}

function SettingRow({
  setting, saving, showCategory, onChange, onReset,
}: {
  setting: ResolvedSetting; saving: boolean; showCategory: boolean;
  onChange: (v: SettingValue) => void; onReset: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-3 border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{setting.label}</p>
          {showCategory && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{setting.category}</span>
          )}
          <StatusBadge settingKey={setting.key} />
          {setting.isOverridden && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Customised</span>
          )}
        </div>
        {setting.description && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{setting.description}</p>
        )}
        {setting.isOverridden && (
          <button
            type="button"
            onClick={onReset}
            disabled={saving}
            className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
          >
            <RotateCcw size={10} /> Reset to default
          </button>
        )}
      </div>
      <div className="shrink-0 pt-0.5">
        <Control setting={setting} disabled={saving} onChange={onChange} />
      </div>
    </div>
  );
}

function Control({ setting, disabled, onChange }: { setting: ResolvedSetting; disabled: boolean; onChange: (v: SettingValue) => void }) {
  const inputCls =
    "px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500/30 focus:border-purple-500 disabled:opacity-60";

  if (setting.type === "toggle") {
    const on = setting.value === true;
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-60 ${on ? "bg-purple-600" : "bg-slate-200 dark:bg-slate-700"}`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${on ? "translate-x-4" : "translate-x-1"}`} />
      </button>
    );
  }
  if (setting.type === "select") {
    return (
      <select
        value={String(setting.value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} min-w-[9rem]`}
      >
        {(setting.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (setting.type === "number") {
    return (
      <input
        type="number"
        defaultValue={Number(setting.value)}
        disabled={disabled}
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n !== setting.value) onChange(n);
        }}
        className={`${inputCls} w-24 text-right`}
      />
    );
  }
  // text
  return (
    <input
      type="text"
      defaultValue={String(setting.value)}
      disabled={disabled}
      onBlur={(e) => { if (e.target.value !== setting.value) onChange(e.target.value); }}
      className={`${inputCls} w-48`}
    />
  );
}

function ProfilePanel({
  inst, setInst, onSave, saving,
}: {
  inst: Inst | null; setInst: (i: Inst) => void; onSave: () => void; saving: boolean;
}) {
  if (!inst) return <Empty msg="Institution profile unavailable." />;
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Institution Profile</h2>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-xs font-semibold disabled:opacity-70"
        >
          {saving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
          Save
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">Institution Name</label>
          <input
            type="text"
            value={inst.name}
            onChange={(e) => setInst({ ...inst, name: e.target.value })}
            className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500/30 focus:border-purple-500 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">College Type</label>
          <select
            value={inst.college_type ?? ""}
            onChange={(e) => setInst({ ...inst, college_type: e.target.value })}
            className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500/30 focus:border-purple-500 text-xs"
          >
            <option value="Arts & Science">Arts &amp; Science</option>
            <option value="Arts">Arts</option>
            <option value="Health">Health</option>
            <option value="Nursing">Nursing</option>
            <option value="Engineering">Engineering</option>
          </select>
        </div>
      </div>

      <LocalizationSettings
        institutionId={inst.id}
        initial={{ currency: inst.currency ?? undefined, locale: inst.locale ?? undefined, timezone: inst.timezone ?? undefined }}
      />
    </div>
  );
}
