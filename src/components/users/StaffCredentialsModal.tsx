"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Eye, EyeOff, KeyRound, Copy, Check, RefreshCw, ShieldCheck, ShieldOff, AlertCircle } from "lucide-react";
import { setStaffPassword } from "@/actions/staffCredentials";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  person: { id: string; full_name: string; email: string } | null;
  hasAccount: boolean;
  isBlocked: boolean;
  onSuccess: (email: string) => void;
};

function generatePassword(): string {
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "@#$!";
  const all = upper + lower + digits + special;
  const rand = (set: string) => set[Math.floor(Math.random() * set.length)];
  // Guarantee at least one of each
  const base = [rand(upper), rand(lower), rand(digits), rand(special)];
  const rest = Array.from({ length: 8 }, () => rand(all));
  return [...base, ...rest].sort(() => Math.random() - 0.5).join("");
}

export function StaffCredentialsModal({ isOpen, onClose, person, hasAccount, isBlocked, onSuccess }: Props) {
  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setPassword("");
      setShowPassword(false);
      setCopied(false);
      setDone(false);
      setError(null);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  const handleGenerate = useCallback(() => {
    const pw = generatePassword();
    setPassword(pw);
    setShowPassword(true);
    setCopied(false);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!person || !password.trim()) return;
    setLoading(true);
    setError(null);
    const result = await setStaffPassword(person.email, person.full_name, password.trim());
    setLoading(false);
    if (result.success) {
      setDone(true);
      onSuccess(person.email);
    } else {
      setError(result.error ?? "Something went wrong.");
    }
  };

  if (!mounted) return null;

  const title = hasAccount ? "Update Portal Password" : "Create Portal Account";
  const subtitle = hasAccount
    ? "Set a new password for this staff member's portal login."
    : "Create Supabase login credentials for this staff member.";

  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-200 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`relative w-full max-w-sm h-full bg-white dark:bg-slate-900 flex flex-col transform transition-transform duration-300 ease-out border-l border-slate-200 dark:border-slate-700 ${isOpen ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/60 flex items-center justify-center">
              <KeyRound size={14} className="text-violet-600 dark:text-violet-400" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">

          {/* Staff info */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0 text-xs font-bold text-violet-700 dark:text-violet-300">
              {person?.full_name?.charAt(0).toUpperCase() ?? "?"}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{person?.full_name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{person?.email}</p>
            </div>
            {/* Account status badge */}
            {hasAccount && (
              <span className={`ml-auto shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                isBlocked
                  ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900"
                  : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
              }`}>
                {isBlocked
                  ? <><ShieldOff size={9} /> Blocked</>
                  : <><ShieldCheck size={9} /> Active</>
                }
              </span>
            )}
          </div>

          {/* Success state */}
          {done ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-8">
              <span className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Check size={22} className="text-emerald-600 dark:text-emerald-400" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Password set successfully</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {hasAccount ? "Password has been updated." : "Portal account created and password set."}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Password field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {hasAccount ? "New Password" : "Set Password"}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password…"
                      autoComplete="new-password"
                      className="w-full pr-9 pl-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {/* Copy button */}
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!password}
                    title="Copy to clipboard"
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>

                {/* Generate button */}
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="self-start inline-flex items-center gap-1.5 text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 transition-colors mt-0.5"
                >
                  <RefreshCw size={11} />
                  Generate secure password
                </button>
              </div>

              {/* Note */}
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                The staff member will use their email and this password to log into the staff portal. Make sure to share the credentials securely.
              </p>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 px-3 py-2.5 text-xs text-rose-700 dark:text-rose-400">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!password.trim() || loading}
                className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <KeyRound size={14} />
                )}
                {loading
                  ? "Saving…"
                  : hasAccount
                  ? "Update Password"
                  : "Create Account & Set Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
