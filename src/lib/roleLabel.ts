// Friendly display label for an institution_members.role value.
// The access tier ("admin"/"hod"/...) is collapsed for routing, but the UI
// badge should show the real role — most importantly distinguishing a
// Principal from an Admin even though both share the "admin" access tier.

export function roleLabel(role: string | null | undefined): string {
  switch (role) {
    case "SUPER_ADMIN":     return "Super Admin";
    case "INST_ADMIN":      return "Admin";
    case "PRINCIPAL":       return "Principal";
    case "HOD":
    case "DEPARTMENT_HEAD": return "HOD";
    case "STAFF":           return "Staff";
    case "STUDENT":         return "Student";
    case "Alumnus":
    case "ALUMNUS":         return "Alumnus";
    default:                return "Admin";
  }
}
