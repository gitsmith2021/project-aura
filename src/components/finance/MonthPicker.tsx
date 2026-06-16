"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Props = { months: string[]; current: string };

export function MonthPicker({ months, current }: Props) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <select
      value={current}
      onChange={handleChange}
      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-violet-500"
    >
      {months.map(m => (
        <option key={m} value={m}>
          {new Date(m + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </option>
      ))}
    </select>
  );
}
