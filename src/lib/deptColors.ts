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
  { 
    key: "violet",  
    hex: "#7c3aed", bg: "#f5f3ff", bg2: "#ede9fe", text: "#5b21b6", border: "#ddd6fe",
    darkHex: "#a78bfa", darkBg: "#120e2e", darkBg2: "#1c1445", darkText: "#ddd6fe", darkBorder: "#2e1f5e"
  },
  { 
    key: "sky",     
    hex: "#0284c7", bg: "#f0f9ff", bg2: "#e0f2fe", text: "#0369a1", border: "#bae6fd",
    darkHex: "#38bdf8", darkBg: "#082f49", darkBg2: "#0c4a6e", darkText: "#bae6fd", darkBorder: "#0369a1"
  },
  { 
    key: "emerald", 
    hex: "#059669", bg: "#ecfdf5", bg2: "#d1fae5", text: "#047857", border: "#a7f3d0",
    darkHex: "#34d399", darkBg: "#022c22", darkBg2: "#064e3b", darkText: "#a7f3d0", darkBorder: "#047857"
  },
  { 
    key: "amber",   
    hex: "#d97706", bg: "#fffbeb", bg2: "#fef3c7", text: "#b45309", border: "#fde68a",
    darkHex: "#fbbf24", darkBg: "#451a03", darkBg2: "#78350f", darkText: "#fde68a", darkBorder: "#b45309"
  },
  { 
    key: "rose",    
    hex: "#e11d48", bg: "#fff1f2", bg2: "#ffe4e6", text: "#be123c", border: "#fecdd3",
    darkHex: "#fb7185", darkBg: "#4c0519", darkBg2: "#881337", darkText: "#fecdd3", darkBorder: "#be123c"
  },
  { 
    key: "teal",    
    hex: "#0d9488", bg: "#f0fdfa", bg2: "#ccfbf1", text: "#0f766e", border: "#99f6e4",
    darkHex: "#2dd4bf", darkBg: "#042f2e", darkBg2: "#115e59", darkText: "#99f6e4", darkBorder: "#0f766e"
  },
  { 
    key: "indigo",  
    hex: "#4338ca", bg: "#eef2ff", bg2: "#e0e7ff", text: "#3730a3", border: "#c7d2fe",
    darkHex: "#818cf8", darkBg: "#1e1b4b", darkBg2: "#312e81", darkText: "#c7d2fe", darkBorder: "#3730a3"
  },
  { 
    key: "orange",  
    hex: "#ea580c", bg: "#fff7ed", bg2: "#fed7aa", text: "#c2410c", border: "#fdba74",
    darkHex: "#fb923c", darkBg: "#431407", darkBg2: "#7c2d12", darkText: "#fed7aa", darkBorder: "#c2410c"
  },
  { 
    key: "pink",    
    hex: "#db2777", bg: "#fdf2f8", bg2: "#fce7f3", text: "#be185d", border: "#fbcfe8",
    darkHex: "#f472b6", darkBg: "#500724", darkBg2: "#831843", darkText: "#fbcfe8", darkBorder: "#be185d"
  },
  { 
    key: "cyan",    
    hex: "#0891b2", bg: "#ecfeff", bg2: "#cffafe", text: "#0e7490", border: "#a5f3fc",
    darkHex: "#22d3ee", darkBg: "#083344", darkBg2: "#164e63", darkText: "#a5f3fc", darkBorder: "#0e7490"
  },
  { 
    key: "lime",    
    hex: "#65a30d", bg: "#f7fee7", bg2: "#ecfccb", text: "#4d7c0f", border: "#d9f99d",
    darkHex: "#a3e635", darkBg: "#1a2e05", darkBg2: "#3f6212", darkText: "#d9f99d", darkBorder: "#4d7c0f"
  },
  { 
    key: "fuchsia", hex: "#a21caf", bg: "#fdf4ff", bg2: "#fae8ff", text: "#86198f", border: "#f0abfc",
    darkHex: "#e879f9", darkBg: "#4a044e", darkBg2: "#701a75", darkText: "#f0abfc", darkBorder: "#86198f"
  },
] as const;

export type DeptColorKey = typeof DEPT_COLOR_PALETTE[number]["key"];

/** Return a random palette entry hex key (called once at dept creation time). */
export function randomDeptColorKey(): string {
  return DEPT_COLOR_PALETTE[Math.floor(Math.random() * DEPT_COLOR_PALETTE.length)].key;
}

/** Look up palette entry by key (falls back to violet). */
export function getDeptColor(key: string | null | undefined, isDarkOverride?: boolean) {
  const c = DEPT_COLOR_PALETTE.find(p => p.key === key) ?? DEPT_COLOR_PALETTE[0];
  
  const isBrowser = typeof window !== "undefined";
  const hasDarkClass = isBrowser && document.documentElement.classList.contains("dark");
  const isDark = isDarkOverride !== undefined ? isDarkOverride : hasDarkClass;

  if (isDark) {
    return {
      key: c.key,
      hex: c.darkHex,
      bg: c.darkBg,
      bg2: c.darkBg2,
      text: c.darkText,
      border: c.darkBorder,
    };
  }
  
  return {
    key: c.key,
    hex: c.hex,
    bg: c.bg,
    bg2: c.bg2,
    text: c.text,
    border: c.border,
  };
}
