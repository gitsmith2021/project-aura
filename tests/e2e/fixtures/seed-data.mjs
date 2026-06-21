// Arch A2 / Step 1 — canonical e2e seed data.
//
// Two isolated test institutions + one user per role, plus a second-institution
// admin & student for cross-role (Step 4) and institution-isolation (Step 5)
// tests. Everything is namespaced (`@e2e.aura.test` emails, `e2e-college-*`
// slugs) so it never collides with real data and is safe to re-seed.
//
// Plain .mjs so `node tests/e2e/seed.mjs` runs it with no TS toolchain; the
// Playwright fixtures import it typed via seed-data.d.mts.

export const PASSWORD = "E2eAura@1234!";

export const INSTITUTIONS = [
  { key: "A", name: "E2E Test College A", slug: "e2e-college-a", subdomain: "e2e-college-a", deptName: "E2E Computer Science" },
  { key: "B", name: "E2E Test College B", slug: "e2e-college-b", subdomain: "e2e-college-b", deptName: "E2E Physics" },
];

// `key` doubles as the storageState filename. `landing` is where login should
// drop each role (asserted by the session verification spec).
export const USERS = [
  { key: "super",     role: "SUPER_ADMIN", inst: "A", email: "super@e2e.aura.test",     fullName: "E2E Super Admin",  profileRole: "SUPER_ADMIN", memberRole: "SUPER_ADMIN", dept: false, kind: "none",    landing: "/" },
  { key: "admin",     role: "INST_ADMIN",  inst: "A", email: "admin@e2e.aura.test",     fullName: "E2E Inst Admin A", profileRole: "INST_ADMIN",  memberRole: "INST_ADMIN",  dept: false, kind: "none",    landing: "/" },
  { key: "hod",       role: "HOD",         inst: "A", email: "hod@e2e.aura.test",       fullName: "E2E HOD A",        profileRole: "HOD",         memberRole: "HOD",         dept: true,  kind: "staff",   landing: "/", employeeId: "E2E-EMP-HOD", designation: "Head of Department" },
  { key: "staff",     role: "STAFF",       inst: "A", email: "staff@e2e.aura.test",     fullName: "E2E Staff A",      profileRole: "STAFF",       memberRole: "STAFF",       dept: true,  kind: "staff",   landing: "/staff-portal", employeeId: "E2E-EMP-STF", designation: "Assistant Professor" },
  { key: "student",   role: "STUDENT",     inst: "A", email: "student@e2e.aura.test",   fullName: "E2E Student A",    profileRole: "STUDENT",     memberRole: "STUDENT",     dept: true,  kind: "student", landing: "/student-portal", rollNumber: "E2E-A-001" },
  { key: "parent",    role: "PARENT",      inst: "A", email: "parent@e2e.aura.test",    fullName: "E2E Parent A",     profileRole: null,          memberRole: null,          dept: false, kind: "parent",  landing: "/parent-portal", linkStudentEmail: "student@e2e.aura.test" },
  // Second institution — isolation (Step 5) + cross-role (Step 4) helpers.
  { key: "admin_b",   role: "INST_ADMIN",  inst: "B", email: "admin-b@e2e.aura.test",   fullName: "E2E Inst Admin B", profileRole: "INST_ADMIN",  memberRole: "INST_ADMIN",  dept: false, kind: "none",    landing: "/" },
  { key: "student_b", role: "STUDENT",     inst: "B", email: "student-b@e2e.aura.test", fullName: "E2E Student B",    profileRole: "STUDENT",     memberRole: "STUDENT",     dept: true,  kind: "student", landing: "/student-portal", rollNumber: "E2E-B-001" },
];

// The six canonical role fixtures the per-role route-crawl (Step 2) iterates.
export const ROLE_FIXTURES = ["super", "admin", "hod", "staff", "student", "parent"];
