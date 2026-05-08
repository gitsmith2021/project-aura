'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

const SHIFTS = [
  { id: 'NORMAL', label: 'Normal' },
  { id: 'DAY', label: 'Day College' },
  { id: 'EVENING', label: 'Evening College' },
];

export function ShiftSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentShift = searchParams.get('shift') || 'NORMAL';

  const setShift = useCallback(
    (shiftId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('shift', shiftId);
      // Seamlessly update the URL without triggering a full page reload
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="inline-flex p-1 space-x-1 bg-gray-950/40 rounded-xl border border-gray-800/80 backdrop-blur-md shadow-inner">
      {SHIFTS.map((shift) => {
        const isActive = currentShift === shift.id;
        return (
          <button
            key={shift.id}
            onClick={() => setShift(shift.id)}
            className={`
              relative flex items-center justify-center px-6 py-2 text-sm font-medium rounded-lg transition-all duration-200 ease-out whitespace-nowrap
              ${
                isActive
                  ? 'text-white bg-gray-800/90 shadow-sm ring-1 ring-gray-700/50'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
              }
            `}
          >
            {shift.label}
          </button>
        );
      })}
    </div>
  );
}
