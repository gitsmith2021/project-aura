// Grading helpers — a 1:1 port of the web app's src/utils/grading.ts so the
// mobile marksheet shows identical grades/GP/CGPA. Keep in sync with the web copy
// (a shared-types/util extraction is the documented P8.1 follow-up).

export function computeGrade(score: number, maxMarks: number): string {
  if (maxMarks <= 0) return "F";
  const pct = (score / maxMarks) * 100;
  if (pct >= 90) return "O";
  if (pct >= 80) return "A+";
  if (pct >= 70) return "A";
  if (pct >= 60) return "B+";
  if (pct >= 50) return "B";
  if (pct >= 45) return "C";
  return "F";
}

export function gradePoint(grade: string): number {
  const map: Record<string, number> = { O: 10, "A+": 9, A: 8, "B+": 7, B: 6, C: 5, F: 0 };
  return map[grade] ?? 0;
}

export function computeCGPA(results: { grade: string }[]): number {
  if (results.length === 0) return 0;
  const total = results.reduce((sum, r) => sum + gradePoint(r.grade), 0);
  return Math.round((total / results.length) * 100) / 100;
}

/** Tailwind-free colour for a grade chip, aligned with the web GRADE_COLORS. */
export function gradeColor(grade: string): { fg: string; bg: string } {
  switch (grade) {
    case "O":  return { fg: "#047857", bg: "#D1FAE5" };
    case "A+": return { fg: "#0F766E", bg: "#CCFBF1" };
    case "A":  return { fg: "#1D4ED8", bg: "#DBEAFE" };
    case "B+": return { fg: "#6D28D9", bg: "#EDE9FE" };
    case "B":  return { fg: "#4338CA", bg: "#E0E7FF" };
    case "C":  return { fg: "#B45309", bg: "#FEF3C7" };
    default:   return { fg: "#E11D48", bg: "#FFE4E6" }; // F
  }
}
