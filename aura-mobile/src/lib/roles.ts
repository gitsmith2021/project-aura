// Role model — mirrors the web app so behaviour is identical across platforms.
// The DB stores institution_members.role; the app collapses it to an "access
// tier" for navigation, while keeping the real role for labelling. This is the
// same mapping the web middleware/login use (see src/lib/roleLabel.ts on web).

export type MemberRole =
  | "SUPER_ADMIN"
  | "INST_ADMIN"
  | "PRINCIPAL"
  | "HOD"
  | "DEPARTMENT_HEAD"
  | "STAFF"
  | "STUDENT";

// Access tier drives which mobile experience a user sees.
export type AccessTier = "admin" | "hod" | "staff" | "student";

export function tierForRole(role: MemberRole | null | undefined): AccessTier {
  switch (role) {
    case "SUPER_ADMIN":
    case "INST_ADMIN":
    case "PRINCIPAL":
      return "admin";
    case "HOD":
    case "DEPARTMENT_HEAD":
      return "hod";
    case "STUDENT":
      return "student";
    case "STAFF":
    default:
      return "staff";
  }
}

export function roleLabel(role: MemberRole | null | undefined): string {
  switch (role) {
    case "SUPER_ADMIN":     return "Super Admin";
    case "INST_ADMIN":      return "Admin";
    case "PRINCIPAL":       return "Principal";
    case "HOD":
    case "DEPARTMENT_HEAD": return "HOD";
    case "STAFF":           return "Staff";
    case "STUDENT":         return "Student";
    default:                return "Member";
  }
}
