"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useRef, useEffect, useState } from "react";
import { Sun, Moon, CalendarDays } from "lucide-react";

export type ShiftKey = "NORMAL" | "DAY" | "EVENING";

interface ShiftOption {
  key: ShiftKey;
  label: string;
  shortLabel: string;
  param: string;        // URL param value
  icon: React.ReactNode;
  color: string;        // accent color
  glow: string;         // subtle glow color
}

const SHIFT_OPTIONS: ShiftOption[] = [
  {
    key: "NORMAL",
    label: "General Shift",
    shortLabel: "General",
    param: "NORMAL",
    icon: <CalendarDays size={14} strokeWidth={2.2} />,
    color: "#7c3aed",
    glow: "rgba(124, 58, 237, 0.12)",
  },
  {
    key: "DAY",
    label: "Day Shift 1",
    shortLabel: "Day · 1",
    param: "DAY",
    icon: <Sun size={14} strokeWidth={2.2} />,
    color: "#d97706",
    glow: "rgba(217, 119, 6, 0.12)",
  },
  {
    key: "EVENING",
    label: "Evening Shift 2",
    shortLabel: "Eve · 2",
    param: "EVENING",
    icon: <Moon size={14} strokeWidth={2.2} />,
    color: "#2563eb",
    glow: "rgba(37, 99, 235, 0.12)",
  },
];

export function ShiftGateway({ allowedShifts }: { allowedShifts?: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const visibleOptions = allowedShifts && allowedShifts.length > 0
    ? SHIFT_OPTIONS.filter((o) => allowedShifts.includes(o.key))
    : SHIFT_OPTIONS;

  const currentShift = (searchParams?.get("shift") as ShiftKey) || "NORMAL";
  const activeIndex = visibleOptions.findIndex((o) => o.key === currentShift);
  const activeOption = visibleOptions[activeIndex >= 0 ? activeIndex : 0];

  // Refs for measuring pill positions
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Sliding indicator position
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const measureIndicator = useCallback(() => {
    const idx = activeIndex >= 0 ? activeIndex : 0;
    const btn = buttonRefs.current[idx];
    const container = containerRef.current;
    if (btn && container) {
      const cRect = container.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      setIndicator({
        left: bRect.left - cRect.left,
        width: bRect.width,
      });
    }
  }, [activeIndex]);

  useEffect(() => {
    measureIndicator();
    window.addEventListener("resize", measureIndicator);
    return () => window.removeEventListener("resize", measureIndicator);
  }, [measureIndicator]);

  const setShift = useCallback(
    (key: ShiftKey) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (key === "NORMAL") {
        params.delete("shift");
      } else {
        params.set("shift", key);
      }
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Single-shift institution — no switcher needed. This guard MUST come after
  // every hook above so hook order stays stable across renders (Rules of Hooks).
  if (visibleOptions.length <= 1) return null;

  return (
    <div className="shift-gateway-wrapper" id="shift-gateway">
      {/* Segmented control */}
      <div className="shift-gateway" ref={containerRef}>
        {/* Sliding indicator */}
        <div
          className="shift-gateway__indicator"
          style={{
            left: indicator.left,
            width: indicator.width,
            background: activeOption.glow,
            boxShadow: `0 0 12px ${activeOption.glow}, inset 0 1px 0 rgba(255,255,255,0.7)`,
            borderColor: `${activeOption.color}22`,
          }}
        />

        {visibleOptions.map((opt, i) => {
          const isActive = opt.key === (activeIndex >= 0 ? visibleOptions[activeIndex].key : "NORMAL");
          return (
            <button
              key={opt.key}
              id={`shift-btn-${opt.param.toLowerCase()}`}
              ref={(el) => { buttonRefs.current[i] = el; }}
              onClick={() => setShift(opt.key)}
              className={`shift-gateway__btn ${isActive ? "shift-gateway__btn--active" : ""}`}
              style={{
                color: isActive ? opt.color : undefined,
              }}
              aria-pressed={isActive}
              title={opt.label}
            >
              <span className="shift-gateway__icon" style={{ color: isActive ? opt.color : undefined }}>
                {opt.icon}
              </span>
              <span className="shift-gateway__label">{opt.label}</span>
              <span className="shift-gateway__label--short">{opt.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Active shift badge — subtle contextual indicator */}
      <div
        className="shift-gateway__badge"
        style={{
          background: activeOption.glow,
          color: activeOption.color,
          borderColor: `${activeOption.color}18`,
        }}
      >
        {activeOption.icon}
        <span>{activeOption.label}</span>
      </div>

      <style jsx>{`
        .shift-gateway-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .shift-gateway {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 3px;
          background: rgba(241, 245, 249, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(226, 232, 240, 0.7);
          border-radius: 10px;
        }

        .shift-gateway__indicator {
          position: absolute;
          top: 3px;
          bottom: 3px;
          border-radius: 8px;
          border: 1px solid transparent;
          transition: left 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                      width 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                      background 0.28s ease,
                      box-shadow 0.28s ease;
          z-index: 0;
          pointer-events: none;
        }

        .shift-gateway__btn {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border: none;
          background: transparent;
          border-radius: 7px;
          font-size: 11.5px;
          font-weight: 600;
          color: #94a3b8;
          cursor: pointer;
          transition: color 0.2s ease;
          white-space: nowrap;
          letter-spacing: 0.01em;
          line-height: 1;
        }

        .shift-gateway__btn:hover:not(.shift-gateway__btn--active) {
          color: #64748b;
        }

        .shift-gateway__btn--active {
          font-weight: 700;
        }

        .shift-gateway__icon {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          transition: color 0.2s ease;
          color: inherit;
        }

        .shift-gateway__label {
          display: inline;
        }

        .shift-gateway__label--short {
          display: none;
        }

        .shift-gateway__badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          border: 1px solid transparent;
          transition: all 0.25s ease;
          user-select: none;
        }

        /* Responsive: collapse labels on narrow viewports */
        @media (max-width: 768px) {
          .shift-gateway__label {
            display: none;
          }
          .shift-gateway__label--short {
            display: inline;
          }
          .shift-gateway__btn {
            padding: 6px 10px;
            font-size: 11px;
          }
          .shift-gateway__badge {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
