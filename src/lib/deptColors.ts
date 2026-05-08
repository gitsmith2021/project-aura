/**
 * Subtle pastel palette for department color-coding.
 * Each entry has:
 *   hex   – the accent hex (used for bar charts, icon tints, text highlights)
 *   bg    – very light tint (used as card background start)
 *   bg2   – slightly deeper tint (gradient end)
 *   text  – readable foreground color
 *   border– border/ring color
 */
export const DEPT_COLOR_PALETTE = [
  { key: "violet",  hex: "#7c3aed", bg: "#f5f3ff", bg2: "#ede9fe", text: "#5b21b6", border: "#ddd6fe" },
  { key: "sky",     hex: "#0284c7", bg: "#f0f9ff", bg2: "#e0f2fe", text: "#0369a1", border: "#bae6fd" },
  { key: "emerald", hex: "#059669", bg: "#ecfdf5", bg2: "#d1fae5", text: "#047857", border: "#a7f3d0" },
  { key: "amber",   hex: "#d97706", bg: "#fffbeb", bg2: "#fef3c7", text: "#b45309", border: "#fde68a" },
  { key: "rose",    hex: "#e11d48", bg: "#fff1f2", bg2: "#ffe4e6", text: "#be123c", border: "#fecdd3" },
  { key: "teal",    hex: "#0d9488", bg: "#f0fdfa", bg2: "#ccfbf1", text: "#0f766e", border: "#99f6e4" },
  { key: "indigo",  hex: "#4338ca", bg: "#eef2ff", bg2: "#e0e7ff", text: "#3730a3", border: "#c7d2fe" },
  { key: "orange",  hex: "#ea580c", bg: "#fff7ed", bg2: "#fed7aa", text: "#c2410c", border: "#fdba74" },
  { key: "pink",    hex: "#db2777", bg: "#fdf2f8", bg2: "#fce7f3", text: "#be185d", border: "#fbcfe8" },
  { key: "cyan",    hex: "#0891b2", bg: "#ecfeff", bg2: "#cffafe", text: "#0e7490", border: "#a5f3fc" },
  { key: "lime",    hex: "#65a30d", bg: "#f7fee7", bg2: "#ecfccb", text: "#4d7c0f", border: "#d9f99d" },
  { key: "fuchsia", hex: "#a21caf", bg: "#fdf4ff", bg2: "#fae8ff", text: "#86198f", border: "#f0abfc" },
] as const;

export type DeptColorKey = typeof DEPT_COLOR_PALETTE[number]["key"];

/** Return a random palette entry hex key (called once at dept creation time). */
export function randomDeptColorKey(): string {
  return DEPT_COLOR_PALETTE[Math.floor(Math.random() * DEPT_COLOR_PALETTE.length)].key;
}

/** Look up palette entry by key (falls back to violet). */
export function getDeptColor(key: string | null | undefined) {
  return DEPT_COLOR_PALETTE.find(p => p.key === key) ?? DEPT_COLOR_PALETTE[0];
}
