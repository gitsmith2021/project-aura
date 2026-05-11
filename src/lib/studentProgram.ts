export type StudentProgram = "UG" | "PG";

export function normalizeStudentProgram(raw: string | null | undefined): StudentProgram | null {
  const u = (raw ?? "").toString().trim().toUpperCase();
  if (u === "UG" || u === "UNDERGRAD" || u === "UNDER GRADUATION") return "UG";
  if (u === "PG" || u === "POSTGRAD" || u === "POST GRADUATION") return "PG";
  return null;
}

export function yearOptionsForProgram(program: StudentProgram): number[] {
  return program === "UG" ? [1, 2, 3] : [1, 2];
}

export function formatStudentTrack(program: StudentProgram | null | undefined, year: number | null | undefined): string {
  if (!program || year == null) return "—";
  return `${program} · Year ${year}`;
}

export function studentProgramLabel(program: StudentProgram): string {
  return program === "UG" ? "UG (Under Graduate)" : "PG (Post-Graduate)";
}
