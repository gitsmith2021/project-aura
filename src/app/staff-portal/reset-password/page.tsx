"use client";

import { useState, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { clearMustResetPassword } from "@/actions/staffCredentials";
import { ShieldCheck, Eye, EyeOff, Loader2, Check, X } from "lucide-react";

// ── Password strength ─────────────────────────────────────────────────────────

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

const RULES = [
  { label: "At least 8 characters",          test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter (A–Z)",          test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter (a–z)",          test: (p: string) => /[a-z]/.test(p) },
  { label: "Number (0–9)",                    test: (p: string) => /[0-9]/.test(p) },
  { label: "Symbol (!@#$%^&*…)",             test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

function getStrength(pwd: string): StrengthLevel {
  const passed = RULES.filter(r => r.test(pwd)).length;
  if (pwd.length === 0) return 0;
  if (passed <= 1)      return 1;
  if (passed <= 2)      return 2;
  if (passed <= 3)      return 3;
  return 4;
}

const STRENGTH_META: Record<StrengthLevel, { label: string; color: string; bar: string }> = {
  0: { label: "",        color: "text-slate-400",  bar: "bg-slate-200 dark:bg-slate-700" },
  1: { label: "Weak",   color: "text-rose-500",   bar: "bg-rose-500" },
  2: { label: "Fair",   color: "text-orange-500", bar: "bg-orange-400" },
  3: { label: "Good",   color: "text-yellow-500", bar: "bg-yellow-400" },
  4: { label: "Strong", color: "text-emerald-500",bar: "bg-emerald-500" },
};

function StrengthBar({ level }: { level: StrengthLevel }) {
  const meta = STRENGTH_META[level];
  return (
    <div className="space-y-1.5 mt-2">
      {/* 4-segment bar */}
      <div className="flex gap-1">
        {([1, 2, 3, 4] as StrengthLevel[]).map(i => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              level >= i ? meta.bar : "bg-slate-200 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>
      {level > 0 && (
        <p className={`text-[11px] font-semibold ${meta.color}`}>{meta.label}</p>
      )}
    </div>
  );
}

function RuleRow({ passed, label }: { passed: boolean; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      {passed
        ? <Check size={11} className="text-emerald-500 shrink-0" />
        : <X     size={11} className="text-slate-300 dark:text-slate-600 shrink-0" />
      }
      <span className={`text-[11px] ${passed ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
        {label}
      </span>
    </li>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pwd,     setPwd]     = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const strength = useMemo(() => getStrength(pwd), [pwd]);
  const allPassed = RULES.every(r => r.test(pwd));

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!allPassed)      { setError("Your password does not meet all requirements."); return; }
    if (strength < 4)    { setError("Please choose a strong password (all 5 requirements must pass)."); return; }
    if (pwd === "Aura@1234") { setError("You cannot reuse the temporary password."); return; }
    if (pwd !== confirm) { setError("Passwords do not match."); return; }

    setBusy(true);

    const supabase = createClient();

    // 1. Update the password
    const { error: pwdErr } = await supabase.auth.updateUser({ password: pwd });
    if (pwdErr) { setError(pwdErr.message); setBusy(false); return; }

    // 2. Clear the must_reset_password flag via admin API
    const res = await clearMustResetPassword();
    if (!res.success) { setError(res.error ?? "Could not clear the reset flag."); setBusy(false); return; }

    // 3. Sign out — force re-login with the new password
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">

      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center ring-4 ring-violet-100 dark:ring-violet-900/20">
            <ShieldCheck size={26} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Set your new password</h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Your account was created with a temporary password.<br />
              Choose a strong password to activate your account.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* New password */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                required
                placeholder="Enter a strong password"
                className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Strength bar */}
            {pwd.length > 0 && <StrengthBar level={strength} />}

            {/* Rules checklist */}
            {pwd.length > 0 && (
              <ul className="mt-2.5 space-y-1 pl-0.5">
                {RULES.map(r => (
                  <RuleRow key={r.label} passed={r.test(pwd)} label={r.label} />
                ))}
              </ul>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
              Confirm Password
            </label>
            <input
              type={showPwd ? "text" : "password"}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              placeholder="Repeat your new password"
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                confirm.length > 0 && confirm !== pwd
                  ? "border-rose-400 dark:border-rose-600 focus:ring-rose-400"
                  : confirm.length > 0 && confirm === pwd
                  ? "border-emerald-400 dark:border-emerald-600 focus:ring-emerald-400"
                  : "border-slate-200 dark:border-slate-700 focus:ring-violet-500"
              }`}
            />
            {confirm.length > 0 && confirm !== pwd && (
              <p className="text-[11px] text-rose-500 mt-1">Passwords do not match.</p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40">
              <X size={13} className="text-rose-500 mt-0.5 shrink-0" />
              <p className="text-[12px] text-rose-600 dark:text-rose-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !allPassed || pwd !== confirm || strength < 4}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {busy ? "Saving…" : "Set password & continue to login"}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          After setting your password you&apos;ll be signed out and asked to log in again with your new credentials.
        </p>
      </div>
    </div>
  );
}
