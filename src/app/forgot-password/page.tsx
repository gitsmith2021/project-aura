"use client";

import { useState, useMemo, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { KeyRound, Eye, EyeOff, Loader2, Check, X, ArrowLeft, MailCheck } from "lucide-react";

// ── Password strength (same rules as reset-password page) ─────────────────────

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

const RULES = [
  { label: "At least 8 characters",  test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter (a–z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number (0–9)",           test: (p: string) => /[0-9]/.test(p) },
  { label: "Symbol (!@#$%^&*…)",    test: (p: string) => /[^A-Za-z0-9]/.test(p) },
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
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${level >= i ? meta.bar : "bg-slate-200"}`} />
        ))}
      </div>
      {level > 0 && <p className={`text-[11px] font-semibold ${meta.color}`}>{meta.label}</p>}
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEP_LABELS = ["Email", "Verify", "Password"] as const;

function StepDots({ current }: { current: 0 | 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-0.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
              i < current  ? "bg-purple-600 text-white" :
              i === current ? "bg-purple-600 text-white ring-2 ring-purple-200" :
              "bg-slate-100 text-slate-400"
            }`}>
              {i < current ? <Check size={12} /> : i + 1}
            </div>
            <span className={`text-[10px] font-medium ${i <= current ? "text-purple-600" : "text-slate-400"}`}>{label}</span>
          </div>
          {i < 2 && (
            <div className={`w-8 h-px mb-3 transition-colors ${i < current ? "bg-purple-400" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Step = "identify" | "verify" | "reset" | "done";

const OTP_COOLDOWN = 60;

export default function ForgotPasswordPage() {
  const [step,    setStep]    = useState<Step>("identify");
  const [email,   setEmail]   = useState("");
  const [otp,     setOtp]     = useState("");
  const [pwd,     setPwd]     = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const strength  = useMemo(() => getStrength(pwd), [pwd]);
  const allPassed = RULES.every(r => r.test(pwd));
  const canReset  = allPassed && strength === 4 && pwd === confirm;

  const stepIndex: 0 | 1 | 2 = step === "identify" ? 0 : step === "verify" ? 1 : 2;

  // ── Step 1: Send OTP ───────────────────────────────────────────────────────
  async function handleSendOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    // Always advance to avoid email enumeration — if the email isn't registered,
    // no code arrives but the user sees the same screen either way.
    if (err && err.message.toLowerCase().includes("rate")) {
      setError("Too many attempts. Please wait a moment and try again.");
      return;
    }
    setCountdown(OTP_COOLDOWN);
    setStep("verify");
  }

  // ── Step 2: Verify OTP ─────────────────────────────────────────────────────
  async function handleVerifyOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (otp.trim().length !== 6) { setError("Enter the full 6-digit code."); return; }
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token: otp.trim(),
      type: "email",
    });
    setBusy(false);
    if (err) {
      setError("Invalid or expired code. Please check the code and try again.");
      return;
    }
    setStep("reset");
  }

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  async function handleResend() {
    setError(null);
    setOtp("");
    const supabase = createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setCountdown(OTP_COOLDOWN);
  }

  // ── Step 3: Set new password ───────────────────────────────────────────────
  async function handleReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canReset) return;
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password: pwd });
    if (err) { setError(err.message); setBusy(false); return; }
    await supabase.auth.signOut();
    setBusy(false);
    setStep("done");
  }

  // ── Heading copy per step ──────────────────────────────────────────────────
  const heading = {
    identify: "Forgot your password?",
    verify:   "Check your email",
    reset:    "Set a new password",
    done:     "Password updated",
  }[step];

  const subtitle = {
    identify: "Enter your institutional email address and we'll send a 6-digit verification code.",
    verify:   `We sent a 6-digit code to ${email}. It expires in a few minutes.`,
    reset:    "Almost done — choose a strong new password.",
    done:     "Your password has been changed. Sign in with your new credentials.",
  }[step];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-sm">

      {/* Icon + heading */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center border border-purple-500 shadow-sm">
            {step === "done"
              ? <MailCheck className="text-white w-6 h-6" />
              : <KeyRound  className="text-white w-6 h-6" />
            }
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-slate-900">{heading}</h2>
        <p className="mt-2 text-center text-xs text-slate-500">{subtitle}</p>
      </div>

      {/* Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[400px]">
        <div className="bg-white py-8 px-4 border border-slate-200 sm:rounded-md sm:px-10">

          {/* Step dots (not shown on done screen) */}
          {step !== "done" && <StepDots current={stepIndex} />}

          {/* Error banner */}
          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* ── Step 1 ── */}
          {step === "identify" && (
            <form className="space-y-5" onSubmit={handleSendOtp}>
              <div>
                <label className="block text-xs font-medium text-slate-700">Email address</label>
                <div className="mt-1.5">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="firstname.lastname@institution.edu"
                    className="block w-full appearance-none rounded-md border border-slate-200 px-3 py-2 placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm transition-colors"
                  />
                </div>
              </div>
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full justify-center items-center gap-2 rounded-md border border-transparent bg-purple-600 py-2 px-4 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  {busy ? "Sending…" : "Send verification code"}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 2 ── */}
          {step === "verify" && (
            <form className="space-y-5" onSubmit={handleVerifyOtp}>
              <div>
                <label className="block text-xs font-medium text-slate-700">6-digit code</label>
                <div className="mt-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otp}
                    onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setError(null); }}
                    required
                    placeholder="000000"
                    className="block w-full appearance-none rounded-md border border-slate-200 px-3 py-2 placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-center tracking-[0.4em] font-mono transition-colors"
                  />
                </div>
              </div>

              {/* Resend row */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Didn&apos;t receive it?</span>
                {countdown > 0 ? (
                  <span className="text-slate-400 tabular-nums">Resend in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Resend code
                  </button>
                )}
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={busy || otp.length !== 6}
                  className="flex w-full justify-center items-center gap-2 rounded-md border border-transparent bg-purple-600 py-2 px-4 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  {busy ? "Verifying…" : "Verify code"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setStep("identify"); setOtp(""); setError(null); }}
                className="flex items-center justify-center gap-1 w-full text-xs text-slate-400 hover:text-slate-600 mt-1"
              >
                <ArrowLeft size={11} /> Change email
              </button>
            </form>
          )}

          {/* ── Step 3 ── */}
          {step === "reset" && (
            <form className="space-y-5" onSubmit={handleReset}>
              {/* New password */}
              <div>
                <label className="block text-xs font-medium text-slate-700">New password</label>
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

                {pwd.length > 0 && <StrengthBar level={strength} />}

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
                          <span className={`text-[11px] ${passed ? "text-green-600" : "text-slate-400"}`}>{r.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-medium text-slate-700">Confirm password</label>
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
                  disabled={busy || !canReset}
                  className="flex w-full justify-center items-center gap-2 rounded-md border border-transparent bg-purple-600 py-2 px-4 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  {busy ? "Saving…" : "Update password"}
                </button>
              </div>
            </form>
          )}

          {/* ── Done ── */}
          {step === "done" && (
            <div className="text-center space-y-5">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                  <Check size={24} className="text-green-500" />
                </div>
              </div>
              <p className="text-xs text-slate-500">You can now sign in with your new password.</p>
              <a
                href="/login"
                className="flex w-full justify-center rounded-md border border-transparent bg-purple-600 py-2 px-4 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
              >
                Go to login
              </a>
            </div>
          )}
        </div>

        {step !== "done" && (
          <p className="mt-4 text-center">
            <Link href="/login" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-purple-600 transition-colors">
              <ArrowLeft size={11} /> Back to login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
