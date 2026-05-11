'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

const SHIFTS = [
  { id: 'NORMAL', label: 'General Shift' },
  { id: 'DAY', label: 'Day Shift 1' },
  { id: 'EVENING', label: 'Evening Shift 2' },
];

export function ShiftSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentShift = searchParams.get('shift') || 'DAY';

  const setShift = useCallback(
    (shiftId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (shiftId === 'DAY') {
        params.delete('shift');
      } else {
        params.set('shift', shiftId);
      }
      // Use router.replace to avoid building up a massive history stack
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="inline-flex p-1.5 space-x-1.5 bg-gray-950 rounded-full border border-gray-800/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
      {SHIFTS.map((shift) => {
        const isActive = currentShift === shift.id;
        return (
          <button
            key={shift.id}
            onClick={() => setShift(shift.id)}
            className={`
              relative flex items-center justify-center px-6 py-2.5 text-sm font-semibold rounded-full transition-all duration-300 ease-out whitespace-nowrap
              ${
                isActive
                  ? 'text-white bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.3)] ring-1 ring-indigo-500/60'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/60'
              }
            `}
          >
            {isActive && (
              <span className="absolute left-4 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
            )}
            <span className={isActive ? 'pl-4' : ''}>{shift.label}</span>
          </button>
        );
      })}
    </div>
  );
}
