// Type declarations for route-map.mjs so the Playwright crawl spec (.ts) stays
// type-clean under the project `tsc --noEmit` gate.

export interface SeedManifest {
  password: string;
  instA: { id: string; slug: string };
  instB: { id: string; slug: string };
  deptAId: string | null;
  studentAId: string | null;
  staffAId: string | null;
  // Entity-detail route ids (seeded in institution A for the route-crawl).
  ayAId?: string;
  subjectAId?: string;
  vendorAId?: string;
  poAId?: string;
  companyAId?: string;
  driveAId?: string;
  jobAId?: string;
  jobAppAId?: string;
  onlineExamAId?: string;
  examSchedAId?: string;
  componentAId?: string;
  clubAId?: string;
  hostelAId?: string;
  labAId?: string;
  incidentAId?: string;
  grievanceAId?: string;
  formAId?: string;
  certReqAId?: string;
  meetingAId?: string;
  assignmentAId?: string;
  schemeAId?: string;
  routeAId?: string;
  admissionAId?: string;
  appraisalAId?: string;
}

export type RouteArea =
  | "public-skip" | "public" | "super" | "alumni" | "parent"
  | "staff-view" | "staff" | "student-view" | "student" | "admin";

export function listRouteTemplates(): string[];
export function classifyRoute(t: string): { area: RouteArea; roles: string[] };
export function resolvePath(
  t: string,
  m: SeedManifest
): { path: string } | { skip: string };
