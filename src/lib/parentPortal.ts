// Phase 6A — Parent Portal domain model + pure helpers.

export type Relationship = "father" | "mother" | "guardian" | "other" | "parent";

export type LinkedStudent = {
  studentId: string;
  name: string;
  rollNo: string | null;
  program: string | null;
  year: number | null;
  department: string | null;
  relationship: Relationship;
  isPrimary: boolean;
};

export const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  father: "Father", mother: "Mother", guardian: "Guardian", other: "Other", parent: "Parent",
};

export const RELATIONSHIPS = Object.keys(RELATIONSHIP_LABELS) as Relationship[];

// ── Attendance ────────────────────────────────────────────────────────────────

/** A day/session counts as attended unless explicitly marked absent. */
export function isAttended(status: string | null | undefined): boolean {
  return !!status && status.toLowerCase() !== "absent";
}

export type SubjectAttendance = { subject: string; attended: number; total: number; pct: number };

export function subjectAttendance(rows: { subject: string | null; status: string | null }[]): SubjectAttendance[] {
  const map = new Map<string, { attended: number; total: number }>();
  for (const r of rows) {
    const subject = r.subject?.trim() || "General";
    const e = map.get(subject) ?? { attended: 0, total: 0 };
    e.total++;
    if (isAttended(r.status)) e.attended++;
    map.set(subject, e);
  }
  return [...map.entries()]
    .map(([subject, e]) => ({ subject, attended: e.attended, total: e.total, pct: e.total ? Math.round((e.attended / e.total) * 100) : 0 }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}

export function overallAttendancePct(rows: { status: string | null }[]): number {
  if (rows.length === 0) return 0;
  const attended = rows.filter((r) => isAttended(r.status)).length;
  return Math.round((attended / rows.length) * 100);
}

/** Below this, a student is an attendance "defaulter" (common UGC threshold). */
export const ATTENDANCE_THRESHOLD = 75;

// ── Fees ──────────────────────────────────────────────────────────────────────

export type FeesSummary = { totalDue: number; pendingCount: number; paidCount: number };

export function feesSummary(demands: { net_due: number | null; status: string | null }[]): FeesSummary {
  const s: FeesSummary = { totalDue: 0, pendingCount: 0, paidCount: 0 };
  for (const d of demands) {
    if (d.status === "paid") s.paidCount++;
    else {
      s.pendingCount++;
      s.totalDue += d.net_due ?? 0;
    }
  }
  s.totalDue = Math.round(s.totalDue * 100) / 100;
  return s;
}

export function formatINR(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `₹${amount.toLocaleString("en-IN")}`;
}

// ── Results ───────────────────────────────────────────────────────────────────

export type ResultsSummary = { published: number; avgPercentage: number | null };

export function resultsSummary(results: { final_percentage: number | null; status: string | null }[]): ResultsSummary {
  const published = results.filter((r) => r.status === "published");
  const scored = published.map((r) => r.final_percentage).filter((p): p is number => p != null);
  return {
    published: published.length,
    avgPercentage: scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 100) / 100 : null,
  };
}
