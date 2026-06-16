"use client";

import { useState, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { clearMustResetPassword } from "@/actions/staffCredentials";
import { ShieldCheck, Eye, EyeOff, Loader2, Check, X } from "lucide-react";

// ── Password strength ─────────────────────────────────────────────────────────

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

const RULES = [
  { label: "At least 8 characters",    test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter (A–Z)",   test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter (a–z)",   test: (p: string) => /[a-z]/.test(p) },
  { label: "Number (0–9)",             test: (p: string) => /[0-9]/.test(p) },
  { label: "Symbol (!@#$%^&*…)",      test: (p: string) => /[^A-Za-z0-9]/.test(p) },
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
  0: { label: "",        color: "",                bar: "bg-slate-200" },
  1: { label: "Weak",   color: "text-red-500",    bar: "bg-red-500"   },
  2: { label: "Fair",   color: "text-orange-500", bar: "bg-orange-400"},
  3: { label: "Good",   color: "text-yellow-500", bar: "bg-yellow-400"},
  4: { label: "Strong", color: "text-green-600",  bar: "bg-green-500" },
};

function StrengthBar({ level }: { level: StrengthLevel }) {
  const meta = STRENGTH_META[level];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {([1, 2, 3, 4] as StrengthLevel[]).map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              level >= i ? meta.bar : "bg-slate-200"
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pwd,     setPwd]     = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const strength  = useMemo(() => getStrength(pwd), [pwd]);
  const allPassed = RULES.every(r => r.test(pwd));
  const canSubmit = allPassed && strength === 4 && pwd === confirm && pwd !== "Aura@1234";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!allPassed || strength < 4) { setError("Your password does not meet all the requirements below."); return; }
    if (pwd === "Aura@1234")        { setError("You cannot reuse the temporary password."); return; }
    if (pwd !== confirm)            { setError("Passwords do not match."); return; }

    setBusy(true);
    const supabase = createClient();

    const { error: pwdErr } = await supabase.auth.updateUser({ password: pwd });
    if (pwdErr) { setError(pwdErr.message); setBusy(false); return; }

    const res = await clearMustResetPassword();
    if (!res.success) { setError(res.error ?? "Could not finalise the reset."); setBusy(false); return; }

    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-sm">

      {/* Logo + heading — matches login page */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center border border-purple-500 shadow-sm">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-slate-900">
          Set your new password
        </h2>
        <p className="mt-2 text-center text-xs text-slate-500">
          Your account was created with a temporary password. Choose a strong one to continue.
        </p>
      </div>

      {/* Card — matches login page */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[400px]">
        <div className="bg-white py-8 px-4 border border-slate-200 sm:rounded-md sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>

            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                {error}
              </div>
            )}

            {/* New password */}
            <div>
              <label className="block text-xs font-medium text-slate-700">
                New Password
              </label>
              <div className="mt-1.5 relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={pwd}
                  onChange={e => setPwd(e.target.value)}
                  required
                  placeholder="Enter a strong password"
                  className="block w-full appearance-none rounded-md border border-slate-200 px-3 py-2 pr-9 placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm transition-colors"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* Strength bar */}
              {pwd.length > 0 && <StrengthBar level={strength} />}

              {/* Rules checklist */}
              {pwd.length > 0 && (
                <ul className="mt-2.5 space-y-1">
                  {RULES.map(r => {
                    const passed = r.test(pwd);
                    return (
                      <li key={r.label} className="flex items-center gap-1.5">
                        {passed
                          ? <Check size={11} className="text-green-500 shrink-0" />
                          : <X     size={11} className="text-slate-300 shrink-0" />
                        }
                        <span className={`text-[11px] ${passed ? "text-green-600" : "text-slate-400"}`}>
                          {r.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Confirm Password
              </label>
              <div className="mt-1.5">
                <input
                  type={showPwd ? "text" : "password"}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="Repeat your new password"
                  className={`block w-full appearance-none rounded-md border px-3 py-2 placeholder-slate-400 focus:outline-none focus:ring-1 text-sm transition-colors ${
                    confirm.length > 0 && confirm !== pwd
                      ? "border-red-300 focus:border-red-400 focus:ring-red-400"
                      : confirm.length > 0 && confirm === pwd
                      ? "border-green-400 focus:border-green-500 focus:ring-green-400"
                      : "border-slate-200 focus:border-purple-500 focus:ring-purple-500"
                  }`}
                />
              </div>
              {confirm.length > 0 && confirm !== pwd && (
                <p className="mt-1 text-[11px] text-red-500">Passwords do not match.</p>
              )}
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={busy || !canSubmit}
                className="flex w-full justify-center items-center gap-2 rounded-md border border-transparent bg-purple-600 py-2 px-4 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                {busy ? "Saving…" : "Set password & go to login"}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          After saving you&apos;ll be signed out and redirected to login.
        </p>
      </div>
    </div>
  );
}
