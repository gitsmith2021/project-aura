"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  children: React.ReactNode;
  /** Fixed columns after the scroll strip (e.g. toolbar controls) */
  trailing?: React.ReactNode;
  className?: string;
  /** Classes on the inner flex row that lays out tab buttons (e.g. items-end for underline tabs) */
  innerClassName?: string;
  /**
   * When true (default), root uses flex-1 for row parents (take remaining width).
   * Set false inside a flex column so the bar stays content-height and full width of the column.
   */
  grow?: boolean;
};

/**
 * Horizontal tab strip with left/right scroll buttons when content overflows.
 * Tab labels should use whitespace-nowrap — do not truncate.
 */
export function ScrollableTabBar({
  children,
  trailing,
  className = "",
  innerClassName = "",
  grow = true,
}: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = outerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    setCanLeft(scrollLeft > 6);
    setCanRight(scrollLeft < maxScroll - 6);
  }, []);

  useLayoutEffect(() => {
    update();
  }, [update]);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer) return;

    const onScroll = () => update();
    outer.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);

    let ro: ResizeObserver | undefined;
    if (inner && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => update());
      ro.observe(inner);
    }

    return () => {
      outer.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      ro?.disconnect();
    };
  }, [update]);

  const scrollByDir = (dir: -1 | 1) => {
    outerRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  return (
    <div
      className={`flex min-w-0 items-stretch ${grow ? "flex-1" : "w-full max-w-full shrink-0"} ${className}`}
    >
      <button
        type="button"
        aria-label="Scroll tabs left"
        disabled={!canLeft}
        onClick={() => scrollByDir(-1)}
        className="flex shrink-0 items-center justify-center border-r border-slate-100 bg-slate-50/95 px-1 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <ChevronLeft size={14} className="text-slate-600" />
      </button>

      <div
        ref={outerRef}
        className="custom-scrollbar min-w-0 flex-1 overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div ref={innerRef} className={`flex w-max min-w-full ${innerClassName}`}>
          {children}
        </div>
      </div>

      <button
        type="button"
        aria-label="Scroll tabs right"
        disabled={!canRight}
        onClick={() => scrollByDir(1)}
        className="flex shrink-0 items-center justify-center border-l border-slate-100 bg-slate-50/95 px-1 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <ChevronRight size={14} className="text-slate-600" />
      </button>

      {trailing ? <div className="flex shrink-0 items-stretch border-l border-slate-200 bg-white">{trailing}</div> : null}
    </div>
  );
}
