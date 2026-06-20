"use client";

import { Check } from "lucide-react";
import { ONBOARDING_STEPS, type OnboardingStepId } from "@/lib/onboarding";

type Props = {
  /** Id of the step the wizard is currently on. */
  currentStep: OnboardingStepId;
  /** Setup completeness 0–100 (from onboardingProgress()). */
  progress: number;
  /** Which actionable steps already have their minimum data. */
  completedSteps: Set<OnboardingStepId>;
  onStepClick?: (step: OnboardingStepId) => void;
};

export function OnboardingProgress({ currentStep, progress, completedSteps, onStepClick }: Props) {
  const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Setup progress</span>
          <span className="text-xs font-bold text-violet-600">{progress}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-violet-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ol className="space-y-1">
        {ONBOARDING_STEPS.map((step, idx) => {
          const isCurrent = step.id === currentStep;
          const isDone = completedSteps.has(step.id) || idx < currentIndex;
          const clickable = Boolean(onStepClick) && (isDone || idx <= currentIndex);

          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick?.(step.id)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  isCurrent
                    ? "bg-violet-50 border border-violet-200"
                    : clickable
                      ? "hover:bg-slate-50 border border-transparent"
                      : "border border-transparent cursor-default"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isDone
                      ? "bg-violet-600 text-white"
                      : isCurrent
                        ? "bg-white text-violet-600 border-2 border-violet-600"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                >
                  {isDone ? <Check size={14} strokeWidth={3} /> : idx + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold truncate ${isCurrent ? "text-violet-900" : "text-slate-700"}`}>
                    {step.title}
                  </span>
                  <span className="block text-xs text-slate-400 truncate">{step.subtitle}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
