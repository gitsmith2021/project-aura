import { fundingTypeShortLabel } from "@/lib/deptFunding";

type Props = {
  fundingType?: string | null;
  /** Light cards (default) vs dark institution dashboard grid */
  variant?: "light" | "dark";
  className?: string;
};

export function DepartmentFundingBadge({ fundingType, variant = "light", className = "" }: Props) {
  const label = fundingTypeShortLabel(fundingType);
  const isSf = fundingType === "SELF_FINANCING";
  const light = isSf
    ? "bg-amber-50 text-amber-800 border-amber-200"
    : "bg-sky-50 text-sky-800 border-sky-200";
  const dark = isSf
    ? "bg-amber-500/15 text-amber-300 border-amber-500/35"
    : "bg-sky-500/15 text-sky-300 border-sky-500/35";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border shrink-0 text-[10px] font-bold uppercase tracking-wide leading-none ${variant === "dark" ? dark : light} ${className}`}
    >
      {label}
    </span>
  );
}
