import React from 'react';

type BadgeProps = {
  children: React.ReactNode;
  variant?: string;
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const normalizedVariant = (variant as string).toLowerCase().replace(/[^a-z]/g, '') as keyof typeof variants;
  const variants: Record<string, string> = {
    // Current canonical values
    artscience: 'bg-purple-50 text-purple-750 border border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30',
    nursing:    'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    engineering:'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-350 dark:border-blue-500/30',
    // Legacy fallbacks
    health:     'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    arts:       'bg-purple-50 text-purple-750 border border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30',
    // Status
    active:     'bg-green-50 text-green-800 border border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30',
    inactive:   'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    default:    'bg-gray-50 text-gray-700 border border-gray-200 dark:bg-slate-850 dark:text-slate-350 dark:border-slate-700',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${variants[normalizedVariant] || variants.default}`}>
      {children}
    </span>
  );
}
