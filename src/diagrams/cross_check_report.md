# AURA Application Cross-Check Report

This report evaluates the current state of the AURA web application codebase against the provided architectural diagrams (Entity-Relationship Diagram and Swimlane User Flow). 

## 1. Database Schema (ERD vs. Codebase)

Overall, the relational structure in the code reflects the intent of the ERD, but there are notable naming differences and several entities that are pending implementation.

### ✅ Matches & Alignments
*   **Core Hierarchy:** The multi-tenant structure is intact. `departments`, `shifts`, and `tenant_users` map correctly.
*   **Role-Based Access Control (RBAC):** The `user_role` ENUM (`SUPER_ADMIN`, `INST_ADMIN`, `DEPARTMENT_HEAD`, `STAFF`, `STUDENT`) aligns perfectly with the swimlanes in the User Flow diagram.
*   **Attendance Tracking:** The core `attendance` table exists with `status` (`present`, `absent`, `late`) tracking the relationship between schedules and users.

### ⚠️ Discrepancies & Aliases
*   **Institutions -> Tenants:** The ERD defines an `institutions` table, but the codebase uses the table name `tenants` (e.g., in `src/app/page.tsx` and Supabase policies).
*   **Courses -> Subjects:** The ERD references `courses`, but the migrations (`20260506000001_add_programs_schedules.sql`) explicitly create and use a `subjects` table instead.
*   **Schedules -> Class_Schedules:** The ERD defines `schedules`, but the codebase implements this as `class_schedules`.
*   **Staff & Students:** The ERD suggests dedicated `staff` and `students` tables. In the codebase, this is handled via a unified `profiles` table joined with `tenant_users` filtering by the `role` ENUM (`'STAFF'` or `'STUDENT'`).

### ❌ Missing Entities (Pending Implementation)
The following tables from the ERD are not currently present in the Supabase migrations:
*   `attendance_audit` (Audit logging for overrides)
*   `devices` & `offline_sync` (For the mobile NFC app)
*   `student_parents` & `parents` (Parent portal features)
*   `notifications`
*   `program_courses` & `course_enrollments`

---

## 2. User Flow & Approach (Swimlanes vs. Codebase)

### ✅ Super Admin (Global Command Center)
**Status: Highly Aligned**
*   **Diagram:** Start -> Login -> Global Command Center -> View Network Stats -> Drill into College -> Create Institution.
*   **Codebase:** `src/app/page.tsx` perfectly implements this. It acts as the Global Command Center featuring tabs for each institution (`colleges`/`tenants`), aggregated network stats (`studentsCount`, `staffCount`), and an `AddInstitutionModal` for creating institutions.

### ✅ Institution Admin
**Status: Partially Aligned**
*   **Diagram:** Institution Dashboard -> Toggle Day/Evening -> Override Attendance -> Audit Log -> Manage Dept Heads.
*   **Codebase:** `src/app/institution/[id]/page.tsx` serves as the Institution Dashboard. It successfully implements the **Toggle Day/Evening** requirement via the `ShiftSelector` component, which drives a "Departmental Heatmap" and "Faculty Directory".
*   **Missing:** The "Audit Log" and "Override Attendance" views are not yet explicitly built out in the UI.

### ⚠️ Department Head, Staff, and Student Flows
**Status: Pending or Merged Views**
*   **Department Head:** The flow dictates a dedicated "Department Dashboard" and "Assign Faculty Schedule". Currently, scheduling logic exists (`src/components/dashboard/CollegeDashboard` and `src/app/programs`), but there isn't a strict `/department` routing separation.
*   **Student Portal:** The diagram mentions a "Student Portal" to "View Attendance %" and "View Personal Schedule". There are no dedicated `/student` routes in the current Next.js `src/app` directory.

### ❌ Mobile Access (NFC Offline Sync)
**Status: Out of Scope for Current Web Repo**
*   **Diagram:** Mobile React Native App -> NFC Tap -> Cache Locally -> Sync.
*   **Codebase:** There is no React Native code, `devices` table, or `offline_sync` logic in this repository. This represents a completely separate client application that hasn't been integrated with the backend yet.

## Summary & Recommendations

1.  **Schema Normalization:** Decide whether to rename `tenants`, `subjects`, and `class_schedules` to match the ERD (`institutions`, `courses`, `schedules`), or update the ERD to reflect the current codebase conventions. Unifying `staff` and `students` into `profiles` + `tenant_users` is a good practice, so the ERD should probably be updated to reflect this polymorphic approach.
2.  **Next Steps:** Prioritize building the missing schema tables (`attendance_audit`, `course_enrollments`) and bridging the gap for the Institution Admin's "Audit Log" and the Student's portal view.
