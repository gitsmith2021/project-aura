"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { averageRating } from "@/lib/knowledgeHub";

type Props = {
  myRating: number;          // 0 = not rated by me
  ratingSum: number;
  ratingCount: number;
  onRate: (n: number) => void;
};

// KH-3 — compact interactive 1–5 stars (reflects my rating) + the average.
export function StarRating({ myRating, ratingSum, ratingCount, onRate }: Props) {
  const [hover, setHover] = useState(0);
  const avg = averageRating(ratingSum, ratingCount);
  const shown = hover || myRating;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onClick={() => onRate(n)}
            title={`Rate ${n}`}
            className="p-0.5"
          >
            <Star size={14} className={n <= shown ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"} />
          </button>
        ))}
      </div>
      <span className="text-[11px] text-slate-400">{avg == null ? "unrated" : `${avg} (${ratingCount})`}</span>
    </div>
  );
}
