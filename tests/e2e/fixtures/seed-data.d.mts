// Type declarations for seed-data.mjs so the Playwright fixtures (.ts) stay
// type-clean under the project `tsc --noEmit` gate.

export const PASSWORD: string;

export interface SeedInstitution {
  key: string;
  name: string;
  slug: string;
  subdomain: string;
  deptName: string;
}
export const INSTITUTIONS: SeedInstitution[];

export interface SeedUser {
  key: string;
  role: string;
  inst: string;
  email: string;
  fullName: string;
  profileRole: string | null;
  memberRole: string | null;
  dept: boolean;
  kind: "none" | "staff" | "student" | "parent";
  landing: string;
  employeeId?: string;
  designation?: string;
  rollNumber?: string;
  linkStudentEmail?: string;
}
export const USERS: SeedUser[];

export const ROLE_FIXTURES: string[];
