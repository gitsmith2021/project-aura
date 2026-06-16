"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Props = { fyOptions: number[]; current: number };

function fyLabel(y: number) { return `FY ${y}–${String(y + 1).slice(2)}`; }

export function FyPicker({ fyOptions, current }: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("fy", e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <select
      value={current}
      onChange={handleChange}
      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-violet-500"
    >
      {fyOptions.map(y => (
        <option key={y} value={y}>{fyLabel(y)}</option>
      ))}
    </select>
  );
}
