import React from 'react';

type BadgeProps = {
  children: React.ReactNode;
  variant?: string;
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const normalizedVariant = (variant as string).toLowerCase().replace(/[^a-z]/g, '') as keyof typeof variants;
  const variants: Record<string, string> = {
    // Current canonical values
    artscience: 'bg-purple-50 text-purple-700 border border-purple-200',
    nursing:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
    engineering:'bg-blue-50 text-blue-700 border border-blue-200',
    // Legacy fallbacks
    health:     'bg-emerald-50 text-emerald-700 border border-emerald-200',
    arts:       'bg-purple-50 text-purple-700 border border-purple-200',
    // Status
    active:     'bg-green-50 text-green-700 border border-green-200',
    inactive:   'bg-slate-50 text-slate-600 border border-slate-200',
    default:    'bg-gray-50 text-gray-700 border border-gray-200',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${variants[normalizedVariant] || variants.default}`}>
      {children}
    </span>
  );
}
