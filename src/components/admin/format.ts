// Shared formatting for the operator dashboard (Indian locale — Dev Rule 8).

export const intFmt = new Intl.NumberFormat("en-IN");

/** ₹1,23,456 → "₹1.23L"; crores as "₹x.xCr". Full value belongs in a tooltip/title. */
export function formatINRCompact(value: number): string {
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(value >= 10_00_00_000 ? 1 : 2)}Cr`;
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(value >= 10_00_000 ? 1 : 2)}L`;
  return `₹${intFmt.format(Math.round(value))}`;
}

export function formatINRFull(value: number): string {
  return `₹${intFmt.format(Math.round(value))}`;
}

export function formatLastActivity(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
