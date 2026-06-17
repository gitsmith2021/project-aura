// Phase 5D — Alumni System domain model + pure helpers (unit-testable).

// ── Types ─────────────────────────────────────────────────────────────────────

export type Alumnus = {
  id: string;
  institution_id: string;
  profile_id: string | null;
  source_student_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  roll_no: string | null;
  program: string | null;            // "UG" | "PG" (free text, mirrors students.student_program)
  department_id: string | null;
  graduation_year: number;
  batch: string | null;
  current_employer: string | null;
  current_designation: string | null;
  linkedin_url: string | null;
  city: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  departments?: { name: string } | null;
};

export type AlumniAnnouncement = {
  id: string;
  institution_id: string;
  title: string;
  body: string;
  graduation_year: number | null;    // null = all years
  program: string | null;            // null = all programmes
  posted_by: string | null;
  created_at: string;
};

// ── Labels ──────────────────────────────────────────────────────────────────

export function programLabel(program: string | null): string {
  if (program === "UG") return "Under Graduate";
  if (program === "PG") return "Post Graduate";
  return program ?? "—";
}

/** Batch label from graduation year + programme: (2024, "UG") → "2024 UG". */
export function graduationYearToBatch(year: number, program: string | null): string {
  return program ? `${year} ${program}` : String(year);
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export type AlumniStats = {
  total: number;
  employed: number;       // has a current_employer
  withLinkedIn: number;
  batches: number;        // distinct graduation years
};

export function alumniStats(rows: Pick<Alumnus, "current_employer" | "linkedin_url" | "graduation_year">[]): AlumniStats {
  const years = new Set<number>();
  let employed = 0;
  let withLinkedIn = 0;
  for (const r of rows) {
    years.add(r.graduation_year);
    if (r.current_employer && r.current_employer.trim()) employed++;
    if (r.linkedin_url && r.linkedin_url.trim()) withLinkedIn++;
  }
  return { total: rows.length, employed, withLinkedIn, batches: years.size };
}

/** Employment rate as an integer percentage (0 when there are no alumni). */
export function employmentRate(rows: Pick<Alumnus, "current_employer">[]): number {
  if (rows.length === 0) return 0;
  const employed = rows.filter((r) => r.current_employer && r.current_employer.trim()).length;
  return Math.round((employed / rows.length) * 100);
}

/** Count per graduation year, most recent year first. */
export function gradYearBreakdown(
  rows: Pick<Alumnus, "graduation_year">[]
): { year: number; count: number }[] {
  const map = new Map<number, number>();
  for (const r of rows) map.set(r.graduation_year, (map.get(r.graduation_year) ?? 0) + 1);
  return [...map.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year);
}

// ── Filtering ─────────────────────────────────────────────────────────────────

export type AlumniFilter = {
  year?: number | "all";
  departmentId?: string | "all";
  program?: string | "all";
  search?: string;
};

export function filterAlumni(rows: Alumnus[], f: AlumniFilter): Alumnus[] {
  const q = f.search?.trim().toLowerCase() ?? "";
  return rows.filter((r) => {
    if (f.year && f.year !== "all" && r.graduation_year !== f.year) return false;
    if (f.departmentId && f.departmentId !== "all" && r.department_id !== f.departmentId) return false;
    if (f.program && f.program !== "all" && r.program !== f.program) return false;
    if (q) {
      const hay = `${r.full_name} ${r.email ?? ""} ${r.roll_no ?? ""} ${r.current_employer ?? ""} ${r.city ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// ── Announcement targeting ────────────────────────────────────────────────────

/** Human-readable audience for an announcement's (year, programme) targeting. */
export function announcementAudienceLabel(year: number | null, program: string | null): string {
  if (year === null && program === null) return "All alumni";
  if (year !== null && program !== null) return `${year} ${program} batch`;
  if (year !== null) return `Class of ${year}`;
  return `${program} alumni`;
}

/** Whether an announcement targets a given alumnus (null fields = wildcard). */
export function announcementMatchesAlumnus(
  a: Pick<AlumniAnnouncement, "graduation_year" | "program">,
  alum: Pick<Alumnus, "graduation_year" | "program">
): boolean {
  if (a.graduation_year !== null && a.graduation_year !== alum.graduation_year) return false;
  if (a.program !== null && a.program !== alum.program) return false;
  return true;
}

// ── CSV export ────────────────────────────────────────────────────────────────

function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function alumniToCSV(rows: Alumnus[]): string {
  const header = [
    "Name", "Roll No", "Programme", "Department", "Graduation Year",
    "Email", "Phone", "Employer", "Designation", "City", "LinkedIn",
  ].join(",");
  const lines = rows.map((r) =>
    [
      r.full_name,
      r.roll_no,
      r.program,
      r.departments?.name ?? "",
      r.graduation_year,
      r.email,
      r.phone,
      r.current_employer,
      r.current_designation,
      r.city,
      r.linkedin_url,
    ].map(csvCell).join(",")
  );
  return [header, ...lines].join("\n");
}
