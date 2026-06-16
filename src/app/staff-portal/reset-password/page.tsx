"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { clearMustResetPassword } from "@/actions/staffCredentials";
import { ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pwd,     setPwd]     = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (pwd.length < 8)          { setError("Password must be at least 8 characters."); return; }
    if (pwd === "Aura@1234")     { setError("Please choose a new password — don't reuse the temporary one."); return; }
    if (pwd !== confirm)         { setError("Passwords do not match."); return; }

    setBusy(true);
    const supabase = createClient();
    const { error: pwdErr } = await supabase.auth.updateUser({ password: pwd });
    if (pwdErr) { setError(pwdErr.message); setBusy(false); return; }

    const res = await clearMustResetPassword();
    if (!res.success) { setError(res.error ?? "Could not clear reset flag."); setBusy(false); return; }

    router.push("/staff-portal");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 space-y-6">

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
            <ShieldCheck size={28} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Set your new password</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Your account was created with a temporary password.<br />
              Please set a permanent password to continue.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                required
                placeholder="Minimum 8 characters"
                className="w-full px-3 py-2.5 pr-10 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5">
              Confirm Password
            </label>
            <input
              type={showPwd ? "text" : "password"}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              placeholder="Repeat your new password"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {error && (
            <p className="text-[12px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-colors"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {busy ? "Saving…" : "Set password & continue"}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          Your new password replaces the temporary <code className="font-mono">Aura@1234</code> issued at account creation.
        </p>
      </div>
    </div>
  );
}
