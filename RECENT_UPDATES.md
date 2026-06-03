# Project Aura: Recent Updates Summary

This document provides a comprehensive overview of the recent architectural, database, backend, and frontend updates implemented in Project Aura. You can use this summary to quickly onboard another developer or LLM instance.

---

## 1. Core Architecture & Database Schema Evolution
The system has completed a major migration to rename and split its core user/organization entities for better scalability and security.

### A. Renaming: Tenants $\rightarrow$ Institutions
- The concept of **Tenants** has been refactored to **Institutions**.
- `tenants` table was renamed/refactored to `institutions`.
- Legacy compatibility views and tables (like `tenant_users`) have been completely dropped and replaced with `institution_members`.
- All foreign keys and code references to `tenant_id` have been migrated to `institution_id` (with fallback logic in tables like `schedules` that preserve `tenant_id` for backward-compatible schema references where necessary).

### B. User Directory Separation: Profiles $\rightarrow$ Staff & Students
- Previously, a unified `profiles` table housed all users. This has been split into two dedicated tables: `staff` and `students`.
- **`students` Table**:
  - Contains student-specific columns: `student_program` (e.g., `UG`, `PG`), `student_year` (1, 2, 3), and `roll_no`.
  - Lazy Roll Number Backfilling: Roll numbers are auto-generated on-the-fly and lazy-backfilled to the DB if missing, following the pattern: `[PROGRAM]-[FUNDING]-[DEPT_PREFIX]-[INDEX]` (e.g., `UG-A-CS-001`).
- **`staff` Table**:
  - Contains staff-specific columns: `title` (e.g., `Dr.`, `Prof.`) and `max_hours_per_week` (for scheduling constraints).
- **Row-Level Security (RLS)**:
  - Both tables are locked down with RLS policies, ensuring that members of an institution can only read and manage data within their own institution.

---

## 2. Database Migrations List (Recent)
The following SQL migration scripts in `supabase/migrations/` define the database changes:
- `20260512000000_finance_module.sql`: Sets up tables for the new Finance Module (funding, budget tracking, expenses).
- `20260517000000_fix_get_user_authorizations_institution_members.sql`: Repairs `get_user_authorizations()` function and updates RLS rules after the `tenant_users` $\rightarrow$ `institution_members` rename.
- `20260517000001_drop_legacy_tenant_users.sql`: Drops the old `tenant_users` table to clean the schema.
- `20260517000002_add_missing_columns_to_staff_students.sql`: Integrates missing profile attributes like program, year, email, and phone.
- `20260517000003_add_students_roll_no.sql`: Adds `roll_no` to the `students` table.
- `20260517000004_add_staff_title.sql`: Adds `title` to the `staff` table.
- `20260523000001_add_staff_max_hours.sql`: Adds `max_hours_per_week` to the `staff` table.
- `20260523000002_create_draft_schedules.sql`: Establishes the `draft_schedules` table for storing Python-solved draft timetables.
- `20260523000003_add_draft_schedule_id_to_schedules.sql`: Connects final published `schedules` rows to their originating `draft_schedules`.
- `20260524000000_students_staff_rls_policies.sql`: Adds complete RLS access policies for staff and students.

---

## 3. Python Scheduling Engine & Draft Schedules Flow
A major feature introduced is the automated timetabling system.

### A. The Solver Engine
- Powered by a python scheduling engine (FastAPI) running at `http://127.0.0.1:8000`.
- The frontend triggers generation by posting a payload with active staff (including their `max_hours_per_week` limits), department cohorts, and institutional configurations (e.g. 5 days/week, 6 periods/day).
- Endpoint: `POST /generate-schedule`

### B. Draft Schedules Lifecycle
1. **Generation**: The Next.js server action `generateDepartmentSchedule` fetches staff, structures the payload, calls the python engine, and inserts the result into `draft_schedules` with a status of `DRAFT`.
2. **Previewing**: Users preview the generated timetable and the workload distribution graph via the `DraftPreviewPanel` component.
3. **Publishing**: When satisfied, users hit "Publish". The `publishDraftSchedule` server action:
   - Deletes any previous schedules generated from a previously published draft of the same department.
   - Map draft slots to actual time periods using configurations in `src/lib/scheduleConstants.ts`.
   - Inserts final schedule entries into the `schedules` table, marking the draft status as `PUBLISHED`.
   - Updates the dashboard and invalidates Next.js cache paths (`revalidatePath("/schedules")`).

---

## 4. UI & Theme Overhaul
The application's aesthetics have been significantly polished to offer a high-end, responsive feel.

### A. CSS & Dark Mode Tinting
- Over 60 custom utility and overrides added in `src/app/globals.css` to fix dark mode. The UI features smooth HSL colors, modern typography, glassmorphism, and dark:bg-slate-900 / dark:text-slate-100 themes.
- White-based arbitrary gradients in visual components like `WaitingForPulse` were replaced with theme-aware slate/violet color pulses.
- `ThemeContext` provides a clean, client-side React provider to toggle theme classes on the root `<html>` element and persist preferences in `localStorage` under `aura-theme`.

### B. Component Changes
- **`UsersManagement.tsx`**: Reworked to support both staff and student directories.
  - Supports dual layout modes: **Grid** (visual/card summary) and **Table** (roster-style grid for details/management).
  - Integrated search, pagination, dynamic department filters, and modal triggers.
- **`StudentDeptBreakdown.tsx`**: A dashboard grid component displaying student headcount distribution split by program (UG/PG) and academic year, offering segment-based click-filtering.
- **`InstitutionTabBar.tsx`**: A scrollable tab bar component allowing swift shifting between active institutions.
- **`DraftPreviewPanel.tsx`**: Previews scheduling draft outputs, displaying teacher workload progress bars (visualizing hours assigned against caps) and a day-by-day timetable grid.

---

## 5. Directory of Key Files
Here is a quick map of the most important files updated or added:

| File Path | Description |
| :--- | :--- |
| `src/context/ThemeContext.tsx` [NEW] | Handles client-side light/dark mode and stores state in localStorage. |
| `src/lib/scheduleConstants.ts` [NEW] | Holds time mapping ranges for different shifts (`NORMAL`, `DAY`, `EVENING`). |
| `src/actions/scheduler.ts` [MODIFIED] | Server-side actions connecting Next.js with the database and the Python scheduler engine. |
| `src/components/schedules/DraftPreviewPanel.tsx` [NEW] | Component to preview drafts, showing workload bars and calendars before publishing. |
| `src/components/layout/InstitutionTabBar.tsx` [NEW] | Horizontal header tab bar for switching between college institutions. |
| `src/components/users/UsersManagement.tsx` [MODIFIED] | Roster and card directory for staff and students, with advanced search/filtering. |
| `src/components/users/StudentDeptBreakdown.tsx` [MODIFIED] | Student cohort grid analytics widget. |
| `src/app/globals.css` [MODIFIED] | Houses the design system style definitions and dark mode overrides. |

---

## 6. How to Run local development
To run the full stack, you need two parallel processes running:

1. **Next.js Frontend (Port 3000)**:
   ```bash
   npm run dev
   ```
2. **Python Scheduler Engine (Port 8000)**:
   ```bash
   cd aura-scheduler-engine
   .\venv\Scripts\activate
   uvicorn main:app --reload
   ```
