// Arch A2 / Step 2 — authenticated route-crawl map.
//
// Enumerates every App-Router page from src/app, classifies each route into an
// access "area" with the fixture role(s) the middleware lets reach it, and
// resolves dynamic params from the seed manifest. The crawl spec iterates
// (route × allowed role); routes whose params we can't resolve from seed data
// are reported as `skip` (tracked, not failed) rather than guessed.
//
// Access model mirrors src/utils/supabase/middleware.ts exactly — keep in sync.

import fs from "fs";
import path from "path";

const APP_DIR = path.join(process.cwd(), "src", "app");

/** Walk src/app and return every route template (e.g. "/institutions/[id]/cia"). */
export function listRouteTemplates() {
  const out = [];
  function walk(dir, routeParts) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name === "page.tsx") {
        out.push("/" + routeParts.join("/") || "/");
      } else if (entry.isDirectory()) {
        // No route groups "(...)" are used in this app; segments map 1:1.
        walk(path.join(dir, entry.name), [...routeParts, entry.name]);
      }
    }
  }
  walk(APP_DIR, []);
  return out.map((r) => (r === "/" ? "/" : r.replace(/\/+$/, ""))).sort();
}

/**
 * Classify a route template into { area, roles }. `roles` are seed fixture keys
 * (see seed-data.mjs). Empty roles = intentionally not crawled (no fixture, or
 * a credential-free public page already covered by the smoke project).
 */
export function classifyRoute(t) {
  // Public / auth pages — covered by the `public` smoke project, skip under auth.
  if (t === "/login" || t === "/forgot-password") return { area: "public-skip", roles: [] };
  // Public but fine to hit while authenticated (admin session used as a proxy).
  if (t === "/privacy-policy" || t === "/programs" || t.startsWith("/admissions")) {
    return { area: "public", roles: ["admin"] };
  }
  // Super-admin platform area — SUPER_ADMIN only (middleware re-checks the row).
  if (t === "/admin" || t.startsWith("/admin/")) return { area: "super", roles: ["super"] };
  // Alumni portal — no alumni fixture is seeded, so it's tracked-not-crawled.
  if (t.startsWith("/alumni-portal")) return { area: "alumni", roles: [] };
  // Parent portal — parent only.
  if (t.startsWith("/parent-portal")) return { area: "parent", roles: ["parent"] };
  // Admin's read-only window into a staff/student portal (a student/staff is
  // bounced off /…/view/*).
  if (t.startsWith("/staff-portal/view")) return { area: "staff-view", roles: ["admin"] };
  if (t.startsWith("/staff-portal")) return { area: "staff", roles: ["staff"] };
  if (t.startsWith("/student-portal/view")) return { area: "student-view", roles: ["admin"] };
  if (t.startsWith("/student-portal")) return { area: "student", roles: ["student"] };
  // Everything else is the admin application. Step 2 is a *positive* crawl —
  // it asserts each route renders for its canonical owner (INST_ADMIN, which is
  // a strict superset of HOD for renderability). HOD/role-boundary access is
  // Step 4's job (cross-role negative auth), so we don't multiplex it here.
  return { area: "admin", roles: ["admin"] };
}

/**
 * Resolve a route template's dynamic params from the seed manifest.
 * Returns { path } when fully resolvable, else { skip: "<reason>" }.
 */
export function resolvePath(t, m) {
  let p = t;

  // Institution segment: browser uses the slug under /institutions/* (middleware
  // rewrites slug→uuid); the super-admin + legacy singular routes take the uuid.
  if (p.startsWith("/institutions/")) p = p.replaceAll("[id]", m.instA.slug);
  else p = p.replaceAll("[id]", m.instA.id);

  p = p.replaceAll("[slug]", m.instA.slug);
  p = p.replaceAll("[institutionId]", m.instA.id);
  if (m.studentAId) p = p.replaceAll("[studentId]", m.studentAId);
  if (m.staffAId)   p = p.replaceAll("[staffId]", m.staffAId);
  if (m.deptAId) {
    p = p.replaceAll("[dept_id]", m.deptAId);
    p = p.replaceAll("[departmentId]", m.deptAId);
  }

  // Context-sensitive ids (same placeholder, different entity by route):
  //  • [examId] — hall-ticket → exam_schedules; online-exam routes → online_exams.
  //  • [applicationId] — /recruitment/* → job_applications; /admissions/* → admissions.
  if (p.includes("[examId]")) p = p.replaceAll("[examId]", t.includes("/online") ? m.onlineExamAId : m.examSchedAId);
  if (p.includes("[applicationId]")) p = p.replaceAll("[applicationId]", t.includes("/recruitment/") ? m.jobAppAId : m.admissionAId);

  // Straightforward entity ids from the seed manifest.
  const ids = {
    "[clubId]": m.clubAId ?? m.instA.id,
    "[subjectId]": m.subjectAId, "[componentId]": m.componentAId,
    "[incidentId]": m.incidentAId, "[grievanceId]": m.grievanceAId, "[formId]": m.formAId,
    "[requestId]": m.certReqAId, "[meetingId]": m.meetingAId, "[labId]": m.labAId,
    "[hostelId]": m.hostelAId, "[assignmentId]": m.assignmentAId, "[driveId]": m.driveAId,
    "[jobId]": m.jobAId, "[schemeId]": m.schemeAId, "[routeId]": m.routeAId,
    "[poId]": m.poAId, "[appraisalId]": m.appraisalAId,
  };
  for (const [ph, val] of Object.entries(ids)) if (val) p = p.replaceAll(ph, val);

  // /session/[id] (legacy class-session view) already took the uuid replacement
  // above; its client page renders an empty state for an unknown id (HTTP 200).

  // The department-budget detail page hard-requires an `?ay=` academic-year query
  // param (calls notFound() without it). [departmentId] is already filled above.
  if (t.endsWith("/finance/budgets/[departmentId]") && m.ayAId) return { path: `${p}?ay=${m.ayAId}` };

  const unresolved = p.match(/\[([^\]]+)\]/);
  if (unresolved) return { skip: `needs a seeded ${unresolved[1]}` };
  return { path: p };
}
