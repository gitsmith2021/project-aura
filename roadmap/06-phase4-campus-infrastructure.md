[← Back to Roadmap Index](../AURA_ROADMAP.md)

> **Depends on:** [03 — Phase 2 Academic Operations](03-phase2-academic-operations.md) (subjects/teaching assignments for laboratories), [02 — Foundation Migrations](02-foundation-migrations.md) (`academic_years`).
> **Feeds into:** [07 — Phase 5 Admissions & Lifecycle](07-phase5-admissions-lifecycle.md) (4E-sub vendor/purchase orders link to 5L department budgets), [09 — Phase 7 Super Admin](09-phase7-super-admin.md) (library/asset/hostel data feeds AISHE reporting).

---

## 🏛️ Phase 4 — Campus Infrastructure & Laboratories

> **Goal:** Digitise the physical campus operations that run parallel to academics —
> library, spaces, hostels, scientific laboratories, and asset inventory. Each is a self-contained module with its own
> admin panel, and student/staff-facing views in the respective portals.

### Step 4A — Library Management System

**Route:** `/institutions/[id]/library`

#### Database:
```sql
CREATE TABLE library_books (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id   UUID REFERENCES departments(id),
  title           TEXT NOT NULL,
  author          TEXT NOT NULL,
  isbn            TEXT,
  category        TEXT NOT NULL,
  total_copies    INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  published_year  INTEGER,
  publisher       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE library_lendings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  book_id         UUID NOT NULL REFERENCES library_books(id),
  borrower_id     UUID NOT NULL REFERENCES auth.users(id),  -- ✅ Fixed: handles both staff and student borrowers
  borrower_type   TEXT NOT NULL DEFAULT 'student' CHECK (borrower_type IN ('student','staff')),
  issued_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE NOT NULL,
  returned_date   DATE,
  fine_amount     NUMERIC(6,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'issued'
                  CHECK (status IN ('issued','returned','overdue','lost'))
);
```

> **Status:** ✅ **Complete** (migration `20260614020000_phase4a_library`). RLS:
> all members read the catalog; a borrower reads their own lendings; admins
> manage books + lendings. Fine math (₹2/day default), overdue detection, and
> availability helpers are pure + unit-tested (9 tests). Copy counts adjust on
> issue/return. Borrowers are staff/students with a login (borrower_id →
> auth.users, per the schema).

#### What to build:
- [x] `supabase/migrations/20260614020000_phase4a_library.sql` — `library_books` + `library_lendings` + RLS + indexes
- [x] `src/app/institutions/[id]/library/page.tsx` — catalog (`LibraryManager`): search, category + availability filter, Add Book drawer, Issue
- [x] `src/app/institutions/[id]/library/lend/page.tsx` — issued books + record returns (`LendingsTable`)
- [x] `src/app/institutions/[id]/library/overdue/page.tsx` — overdue tracker with live fine calculation
- [x] `src/actions/library.ts` — getBooks, addBook, searchBorrowers, issueBook, returnBook, getLendings, getMyLendings (fine math in `src/lib/library.ts`)
- [x] `src/components/library/BookCard.tsx` — book card with availability badge
- [x] `src/components/library/LendingDrawer.tsx` — issue slide-out (borrower search + due date); `LendingsTable` handles returns
- [x] Student portal: `src/app/student-portal/library/page.tsx` — my borrowed books, due dates, fines (`MyLibraryList`)
- [x] Staff portal: `src/app/staff-portal/library/page.tsx` — staff borrowed books
- [x] Fine → fee-ledger integration: `returnBook` posts a student's overdue fine into the central ledger as an ad-hoc `fee_demand` (source `library_fine`, deduped per lending) — migration `20260615070000`

#### Key features:
- Fine auto-calculation (configurable rate per day overdue)
- Availability badge (copies available / total)
- Department-filtered catalog for students
- Fine integration with fee payments (overdue fines added to student dues)

---

### Step 4B — Auditorium & Space Booking

**Route:** `/institutions/[id]/bookings`

#### Database:
```sql
CREATE TABLE venues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  venue_type      TEXT NOT NULL CHECK (venue_type IN ('auditorium','seminar_hall','lab','conference_room','ground','other')),
  capacity        INTEGER,
  amenities       JSONB,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE venue_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  venue_id        UUID NOT NULL REFERENCES venues(id),
  booked_by       UUID NOT NULL REFERENCES auth.users(id),
  event_title     TEXT NOT NULL,
  purpose         TEXT,
  start_datetime  TIMESTAMPTZ NOT NULL,
  end_datetime    TIMESTAMPTZ NOT NULL,
  attendees_count INTEGER,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','cancelled')),
  admin_notes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> **Status:** ✅ **Complete** (migration `20260614030000_phase4b_venue_bookings`).
> Conflict detection (half-open overlap, checked on create **and** re-checked on
> approval), approval workflow with admin notes, colour-coded upcoming agenda.
> RLS: members read venues; booker reads/creates/cancels own bookings; admins
> manage. Overlap/conflict logic is pure + unit-tested (10 tests).

#### What to build:
- [x] `supabase/migrations/20260614030000_phase4b_venue_bookings.sql` — venues + venue_bookings + RLS + indexes
- [x] `src/app/institutions/[id]/bookings/page.tsx` — admin overview: upcoming agenda (colour-coded per venue) + venue/request quick links
- [x] `src/app/institutions/[id]/bookings/venues/page.tsx` — venue registry (`VenuesManager`: add, activate/deactivate)
- [x] `src/app/institutions/[id]/bookings/requests/page.tsx` — approve/reject pending bookings (`RequestsTable`, with notes)
- [x] `src/actions/venueBookings.ts` — getVenues, addVenue, setVenueActive, createBooking, approveBooking, rejectBooking, cancelBooking, getBookings, getMyBookings
- [x] `src/components/bookings/BookingCalendar.tsx` — upcoming agenda grouped by day, colour-coded per venue
- [x] Staff submit drawer — built into `StaffBookings.tsx` (venue + datetime range + attendees)
- [x] Staff portal: `src/app/staff-portal/bookings/page.tsx` — submit request + view/cancel own bookings
- [~] Bookings auto-appear on the academic calendar as events — deferred (calendar-sync follow-up)

#### Key features:
- Conflict detection: cannot double-book a venue for the same time slot
- Calendar view: colour-coded by venue, click slot to see booking detail
- Approval workflow with admin notes
- Bookings auto-appear on the academic calendar as events

---

### Step 4C — Hostel Management

**Route:** `/institutions/[id]/hostels`

> Most complex module in Phase 4. Plan the DB schema carefully before building.
> Multiple hostels, multiple floors, multiple rooms per floor.
> 
> *Note on Optimization:* Integrate with the **Python Engine** to automate roommate matching and stable room assignments based on student preferences and compatibility constraints.

#### Database:
```sql
CREATE TABLE hostels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  hostel_type     TEXT NOT NULL CHECK (hostel_type IN ('boys','girls','co-ed')),
  warden_id       UUID REFERENCES staff(id),
  total_rooms     INTEGER,
  address         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE hostel_rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id       UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_number     TEXT NOT NULL,
  floor           INTEGER NOT NULL DEFAULT 1,
  room_type       TEXT NOT NULL CHECK (room_type IN ('single','double','triple','dormitory')),
  capacity        INTEGER NOT NULL DEFAULT 2,
  occupied        INTEGER NOT NULL DEFAULT 0,
  amenities       JSONB
);

CREATE TABLE hostel_allocations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id       UUID NOT NULL REFERENCES hostels(id),
  room_id         UUID NOT NULL REFERENCES hostel_rooms(id),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  allocated_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  allocated_to    DATE,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','vacated','transferred')),
  UNIQUE(student_id, status) DEFERRABLE
);

CREATE TABLE hostel_announcements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id       UUID NOT NULL REFERENCES hostels(id),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  posted_by       UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mess_menu (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id       UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  day_of_week     TEXT NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  meal_type       TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','snacks','dinner')),
  menu_items      JSONB NOT NULL,   -- Array of dish names
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hostel_id, day_of_week, meal_type)
);

CREATE TABLE mess_billing (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  hostel_id       UUID NOT NULL REFERENCES hostels(id),
  month           TEXT NOT NULL,       -- e.g. "2025-07"
  plan_type       TEXT NOT NULL CHECK (plan_type IN ('full','veg_only','non_veg','custom')),
  amount          NUMERIC(8,2) NOT NULL,
  is_paid         BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at         TIMESTAMPTZ,
  UNIQUE(student_id, month)
);

CREATE TABLE hostel_maintenance_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id        UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_id          UUID REFERENCES hostel_rooms(id),
  raised_by        UUID NOT NULL REFERENCES auth.users(id),
  category         TEXT NOT NULL CHECK (category IN (
                     'electrical','plumbing','furniture','cleaning',
                     'ac_fan','pest_control','other')),
  description      TEXT NOT NULL,
  photo_url        TEXT,
  priority         TEXT NOT NULL DEFAULT 'normal'
                   CHECK (priority IN ('urgent','normal','low')),
  status           TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','in_progress','resolved','closed')),
  assigned_to      TEXT,           -- Maintenance staff name
  resolution_notes TEXT,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> **Status:** ✅ **Complete** — pass 1 (`20260614040000`): hostels/rooms/allocations
> + floor occupancy grid + student "my hostel"; pass 2 (`20260614050000`): mess
> menu editor + monthly billing, maintenance requests (student raise → warden
> board), hostel announcements. One-active-room constraint via partial unique
> index. Pure logic unit-tested (occupancy 5 + mess/maintenance 5). **Deferred:**
> auto-linking hostel/mess fees into the central fee ledger (mess billing is a
> self-contained ledger for now).

#### What to build:
- [x] `supabase/migrations/20260614040000_phase4c_hostels_core.sql` — hostels, hostel_rooms, hostel_allocations + RLS
- [x] `src/app/institutions/[id]/hostels/page.tsx` — overview: hostel cards with occupancy stats
- [x] `src/app/institutions/[id]/hostels/[hostelId]/page.tsx` — floor-wise room grid + add room + allocate
- [x] Allocate/transfer/vacate — built into the hostel detail via `AllocationDrawer` (no separate /allocations route)
- [x] `src/app/institutions/[id]/hostels/[hostelId]/announcements/page.tsx` — `AnnouncementsManager`
- [x] `src/app/institutions/[id]/hostels/cafeteria/page.tsx` — menu board editor (`MessMenuEditor`, day × meal)
- [x] `src/app/institutions/[id]/hostels/cafeteria/billing/page.tsx` — mess billing (`MessBilling`, generate + mark paid)
- [x] `src/actions/mess.ts` — getMessMenu, updateMessMenu, getMessBills, generateMessBills, markMessPaid, getMyMessBills
- [x] `src/actions/hostels.ts` — getHostels, getHostel, addHostel, getRooms, addRoom, allocateStudent, vacateAllocation, getRoomRosters, searchAllocatableStudents, getMyHostel
- [x] `src/actions/hostelMaintenance.ts` — raise, getMaintenanceRequests, updateMaintenanceRequest, getMyMaintenanceRequests (+ `hostelAnnouncements.ts`)
- [x] `src/components/hostels/RoomGrid.tsx` — floor-wise grid colour-coded empty/partial/full
- [x] `src/components/hostels/AllocationDrawer.tsx` — search student → assign; vacate occupants
- [x] `src/app/institutions/[id]/hostels/[hostelId]/maintenance/page.tsx` — warden board (priority sort, assign, resolve)
- [x] Student portal: `src/app/student-portal/hostel/page.tsx` — room, roommates, mess menu, mess bills, announcements, raise maintenance
- [x] Hostel/mess fee → central ledger: "Post to ledger" on mess billing creates an ad-hoc `fee_demand` (source `mess`, deduped per bill) so mess charges appear in the student's dues + fee-due reminders — migration `20260615070000`

#### Key features:
- Floor-wise room grid with colour-coded occupancy
- Conflict check: student cannot be in two rooms simultaneously
- Warden can post announcements visible in student portal
- Cafeteria: weekly menu board editable by admin
- Hostel fees auto-appear in student fee ledger
- Maintenance requests: student raises → warden assigns → resolved with notes; urgent priority highlighted in warden dashboard

---

### Step 4D — Laboratory Management

**Route:** `/institutions/[id]/laboratories`

> Manage scientific laboratories (Physics, Chemistry, Botany, Zoology, Bio-tech, Computer Science, etc.), lab student batches, experiment syllabus, sessions, and grading.

#### Database:
```sql
CREATE TABLE laboratories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id   UUID REFERENCES departments(id),
  name            TEXT NOT NULL,
  lab_type        TEXT NOT NULL CHECK (lab_type IN ('physics','chemistry','botany','zoology','biotech','computer_science','other')),
  capacity        INTEGER,
  lab_assistant_id UUID REFERENCES staff(id),
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE laboratory_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id   UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  year_semester   TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE laboratory_experiments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id   UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  requirements    JSONB -- Chemicals, apparatuses, or instruments needed
);

CREATE TABLE laboratory_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_batch_id UUID NOT NULL REFERENCES laboratory_batches(id) ON DELETE CASCADE,
  experiment_id   UUID NOT NULL REFERENCES laboratory_experiments(id) ON DELETE CASCADE,
  session_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  remarks         TEXT
);

CREATE TABLE laboratory_attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES laboratory_sessions(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  is_present      BOOLEAN NOT NULL DEFAULT TRUE,
  marks_secured   NUMERIC(4,2), -- Lab assessment grades
  remarks         TEXT,
  UNIQUE(session_id, student_id)
);
```

> **Status:** ✅ **Complete** (migration `20260615000000_phase4d_laboratories`).
> Five tables (laboratories, batches, experiments, sessions, attendance) with RLS:
> all members read; admins **and the assigned lab assistant** manage their lab's
> batches/experiments/sessions/attendance; a student reads their own attendance.
> Admin flow: labs registry (type + department filters) → lab detail (experiment
> syllabus via `ExperimentCard` + batches) → sessions page (log session → mark
> attendance + record marks in one grid). Staff portal reuses the same
> `SessionLogger` for labs they are assigned to; students see their sessions,
> attendance % and lab marks. Pure helpers (attendance rate, average marks, marks
> normalisation, requirement parsing) are unit-tested (14 tests). **Deferred:**
> explicit batch→student rosters (the attendance grid currently lists the lab's
> department students); linking lab marks into the CIA `lab_record` component.

#### What to build:
- [x] `supabase/migrations/20260615000000_phase4d_laboratories.sql` — 5 tables + RLS (admin + assistant manage, student read own) + indexes
- [x] `src/app/institutions/[id]/laboratories/page.tsx` — Labs landing (`LaboratoriesManager`): search, lab-type + department filters, Add Laboratory drawer
- [x] `src/app/institutions/[id]/laboratories/[labId]/page.tsx` — Lab detail (`LabDetail`): experiment syllabus, batches, assistant + add experiment/batch drawers
- [x] `src/app/institutions/[id]/laboratories/[labId]/sessions/page.tsx` — Log session + attendance/marks grid (`SessionLogger`)
- [x] `src/actions/laboratories.ts` — getLaboratories, getLaboratory, addLaboratory, getLabBatches, addLabBatch, getLabExperiments, addLabExperiment, getLabSessions, logLabSession, getLabRoster, getSessionAttendance, submitLabAttendance, getMyAssignedLabs, getMyLabSessions, getLabAssistants (pure helpers in `src/lib/laboratories.ts`)
- [x] `src/components/laboratories/ExperimentCard.tsx` — experiment card with requirements/chemicals checklist chips
- [x] Student portal: `src/app/student-portal/laboratories/page.tsx` — sessions grouped by lab, attendance % + lab marks (`MyLabsList`)
- [x] Staff portal: `src/app/staff-portal/laboratories/page.tsx` — assigned labs → log sessions, mark attendance + grades (`StaffLabConsole` reusing `SessionLogger`)
- [~] Batch→student rosters + CIA `lab_record` link — *deferred (roster derived from the lab's department for now)*

#### Key features:
- Lab assistant assignment and custom lab batch roster scheduling
- Log session-wise experiment completion
- Record attendance and session grades, linking to internal academic profiles
- Quick-reference checklists for required glassware/chemicals per experiment

---

### Step 4E — Asset & Inventory Management

**Route:** `/institutions/[id]/assets`

> Track physical assets, machinery, laboratory equipment, chemicals, glassware, and computer peripherals. Supports consumable stock replenishment, reorder warnings, and asset allocations to labs and departments.

#### Database:
```sql
CREATE TABLE asset_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  is_consumable   BOOLEAN NOT NULL DEFAULT FALSE -- Consumables like chemicals/glassware vs fixed assets
);

CREATE TABLE assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES asset_categories(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  brand_model     TEXT,
  serial_number   TEXT,
  purchase_date   DATE,
  purchase_cost   NUMERIC(10,2),
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','maintenance','disposed','low_stock')),
  location_details TEXT,
  current_stock   INTEGER NOT NULL DEFAULT 1, -- For stock count
  unit            TEXT NOT NULL DEFAULT 'pcs', -- pcs, ml, grams, boxes etc.
  reorder_level   INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE asset_allocations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  allocated_to_type TEXT NOT NULL CHECK (allocated_to_type IN ('department','laboratory','staff')),
  department_id   UUID REFERENCES departments(id),
  laboratory_id   UUID REFERENCES laboratories(id),
  staff_id        UUID REFERENCES staff(id),
  allocated_qty   INTEGER NOT NULL DEFAULT 1,
  allocated_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  returned_qty    INTEGER DEFAULT 0,
  returned_date   DATE,
  status          TEXT NOT NULL DEFAULT 'allocated' CHECK (status IN ('allocated','returned','consumed'))
);

CREATE TABLE asset_maintenance_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  description     TEXT NOT NULL,
  cost            NUMERIC(8,2) DEFAULT 0,
  logged_by       UUID REFERENCES staff(id)
);
```

> **Status:** ✅ **Complete** (migration `20260615010000_phase4e_assets`). Four
> tables (asset_categories, assets, asset_allocations, asset_maintenance_logs)
> with RLS: members read; admins manage; allocations/maintenance scoped via the
> parent asset's institution. Consumable vs fixed categories; stock tracked in any
> unit (pcs/ml/g). Allocating decrements `current_stock` and auto-flips status to
> `low_stock` at/below the reorder level (consumables → `consumed`, fixed →
> returnable `allocated`); returning restores stock. Allocations target
> departments, **laboratories (4D)** or staff. Maintenance logs keep a running
> repair cost and can flip an asset to `maintenance`. Pure helpers (low-stock,
> effective status, cost rollup, allocation validation) are unit-tested (11 tests).
> Admin-only (no portal views). **Deferred:** PO-receipt auto-population (4E-sub)
> and low-stock → notification (Phase 3) integrations.

#### What to build:
- [x] `supabase/migrations/20260615010000_phase4e_assets.sql` — 4 tables + RLS (members read, admins manage) + indexes
- [x] `src/app/institutions/[id]/assets/page.tsx` — Inventory dashboard (`AssetsManager`): category/status filters, search, add category + asset, low-stock banner, per-asset allocate
- [x] `src/app/institutions/[id]/assets/allocations/page.tsx` — allocations register with return action (`AllocationsTable`)
- [x] `src/app/institutions/[id]/assets/maintenance/page.tsx` — maintenance logs + running cost + record drawer (`MaintenanceBoard`)
- [x] `src/actions/assets.ts` — getCategories, addCategory, getAssets, addAsset, getLowStockItems, getAllocations, allocateAsset, returnAllocation, getMaintenanceLogs, recordMaintenance, getAllocationTargets (pure helpers in `src/lib/assets.ts`)
- [x] `src/components/assets/AssetStockAlert.tsx` — banner highlighting assets at/below reorder level
- [x] `src/components/assets/AllocationModal.tsx` — allocate qty to a department, lab, or staff member
- [~] Low-stock → notification (Phase 3) and PO-receipt auto-population (4E-sub) — *deferred to those modules*

#### Key features:
- Consumable inventory tracking (e.g., tracking chemical quantities in ml/grams)
- Stock alerts: auto-flag items falling below configured reorder levels
- Allocations mapping: easily see which department, room, or lab possesses specific assets
- Maintenance tracker: logs servicing schedules and keeps running cost calculations for equipment

---

### Step 4E-sub — Vendor & Purchase Order Management

**Route:** `/institutions/[id]/vendors`

> Colleges purchase lab equipment, stationery, furniture, and IT hardware from external vendors. Without a formal PO process, procurement is undocumented, GST invoices are lost, and budget actuals cannot be reconciled. This module provides a vendor registry, PO approval workflow, and asset receipt integration with Step 4E.

#### Database:
```sql
CREATE TABLE vendors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  gst_number      TEXT,
  category        TEXT NOT NULL CHECK (category IN (
                    'lab_equipment','stationery','furniture',
                    'it_hardware','software','maintenance','other')),
  contact_person  TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors: institution members can manage"
  ON public.vendors
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));

CREATE TABLE purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id   UUID REFERENCES departments(id),
  vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  po_number       TEXT NOT NULL,   -- auto-generated: PO-YYYY-NNNN
  items           JSONB NOT NULL,  -- Array of { name, qty, unit, unit_price, total }
  total_amount    NUMERIC(12,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','submitted','approved','received','paid','cancelled')),
  raised_by       UUID REFERENCES staff(id),
  approved_by     UUID REFERENCES auth.users(id),
  invoice_url     TEXT,   -- GST invoice PDF via Supabase Storage
  received_at     TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(institution_id, po_number)
);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase_orders: institution members can manage"
  ON public.purchase_orders
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));
```

> **Status:** ✅ **Complete** (migration `20260615020000_phase4e_sub_vendors_po`).
> Vendor registry (category, GST, contact, active PO count) + PO lifecycle
> draft → submitted → approved → received → paid (+ cancel until received), with
> a status timeline, GST-ready line-item editor (auto-total), auto-generated
> `PO-YYYY-NNNN` numbers per institution, dashboard counters, and GST invoice
> upload to the `purchase-invoices` Storage bucket. **Asset receipt integration
> is live:** marking a PO received can auto-populate the Phase 4E `assets`
> registry (under an auto-ensured "Procurement (PO)" category) — clears deferred
> item 4E-2. Pure helpers (totals, PO-number, status flow, stats) unit-tested
> (12 tests). RLS: members read; admins manage. **Deferred:** budget actuals →
> `budget_line_items` (Step 5L, table not built yet); HOD self-service raising
> from a portal (admin-managed for now).

#### What to build:
- [x] `supabase/migrations/20260615020000_phase4e_sub_vendors_po.sql` — vendors + purchase_orders + RLS + indexes
- [~] Supabase Storage bucket: `purchase-invoices` — uploaded to client-side; **bucket created manually** (dashboard, like `receipts`) per migration note
- [x] `src/app/institutions/[id]/vendors/page.tsx` — vendor registry (`VendorsManager`): list, add, edit, deactivate; category filter + search
- [x] `src/app/institutions/[id]/vendors/purchase-orders/page.tsx` — PO list (`PurchaseOrdersList`): status filter + stats + new-PO drawer
- [x] `src/app/institutions/[id]/vendors/purchase-orders/[poId]/page.tsx` — PO detail (`PurchaseOrderDetail`): line items, status timeline, invoice upload, lifecycle actions
- [x] `src/actions/vendors.ts` — getVendors, addVendor, updateVendor
- [x] `src/actions/purchaseOrders.ts` — getPurchaseOrders, getPurchaseOrder, createPO, submitPO, approvePO, cancelPO, markReceived, markPaid, updateInvoiceUrl, getPOStats, getPOFormData
- [x] `src/components/vendors/VendorCard.tsx` — vendor card with category badge, GST, PO count (+ `PurchaseOrderForm` line-item editor)
- [x] Asset receipt: PO → `received` auto-populates the `assets` table (Step 4E) — opt-in checkbox on receive
- [~] Budget integration: approved PO → `budget_line_items.actual_amt` (Step 5L) — *deferred (5L table not built)*

#### Key features:
- PO approval workflow: department HOD raises PO → admin approves → vendor supplies → goods received → payment recorded
- Auto-generated PO numbers per institution (PO-YYYY-NNNN sequence)
- Line-item breakdown with quantity, unit price, and total — GST-ready
- GST invoice PDF upload and storage (required for financial audit)
- Asset receipt integration: received assets auto-appear in inventory registry (Step 4E)
- Budget actuals integration: approved POs update department budget line items in real time (Step 5L)

---

### Step 4F — Smart ID Card & NFC Card Registry

**Route:** `/institutions/[id]/id-cards`

> NFC-based attendance (already built) requires every student and staff member to have an assigned NFC card. This module manages card issuance, linking, replacement, and deactivation. Deactivated/lost cards are rejected at the attendance webhook.

#### Database:
```sql
CREATE TABLE smart_cards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  card_uid        TEXT NOT NULL UNIQUE,   -- NFC chip UID (hex string)
  holder_type     TEXT NOT NULL CHECK (holder_type IN ('student','staff')),
  student_id      UUID REFERENCES students(id) ON DELETE SET NULL,
  staff_id        UUID REFERENCES staff(id) ON DELETE SET NULL,
  issued_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','lost','deactivated','replaced')),
  replaced_by     UUID REFERENCES smart_cards(id),  -- points to new card if replaced
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_smart_cards_uid ON smart_cards(card_uid);
CREATE INDEX idx_smart_cards_student ON smart_cards(student_id);
CREATE INDEX idx_smart_cards_staff ON smart_cards(staff_id);
```

> **Status:** ✅ **Complete** (migration `20260615030000_phase4f_smart_cards`).
> NFC card registry with issued/active/lost/deactivated counts, issue (holder
> search → UID, excludes anyone who already holds an active card), report-lost,
> deactivate, and a replace flow (old → `replaced`, new active card issued,
> `replaced_by` back-link). DB enforces globally-unique `card_uid`, a one-active-
> card-per-holder partial unique index, and a holder-type/reference check. The NFC
> attendance webhook now accepts an optional `card_uid` and **rejects lost /
> deactivated cards with 403** (the security layer). RLS: members read; admins
> manage. Pure helpers (usable, UID normalise/validate, stats, mask) unit-tested
> (8 tests). Admin-only. **Note:** mobile NFC scanning still needs an EAS dev
> client (Phase 8B) — this module provides the card registry it depends on.

#### What to build:
- [x] `supabase/migrations/20260615030000_phase4f_smart_cards.sql` — smart_cards + RLS + indexes + uniqueness constraints
- [x] `src/app/institutions/[id]/id-cards/page.tsx` — registry (`SmartCardsManager`): stats, status/holder filters, UID/holder search, per-card actions
- [x] `src/app/institutions/[id]/id-cards/issue/page.tsx` — standalone issue page (`IssueCardLauncher` → `CardIssuanceDrawer`)
- [x] `src/actions/smartCards.ts` — getCards, getCardStats, searchCardHolders, issueCard, deactivateCard, reportLost, replaceCard
- [x] `src/components/id-cards/CardIssuanceDrawer.tsx` — holder search + NFC UID entry → assign (+ `SmartCardsManager` registry/replace modal)
- [x] Update NFC attendance webhook (`/api/attendance/nfc`) to validate card status — deactivated/lost cards rejected with 403 (optional `card_uid` path)

#### Key features:
- NFC UID uniqueness enforced at DB level
- Card replacement flow: old card deactivated → new card links back via `replaced_by`
- Deactivated/lost cards rejected at attendance webhook (security layer)
- Lost card reporting with instant deactivation
- Dashboard: cards issued vs active vs lost count

---

### Step 4G — Gate Pass & Visitor Management

**Route:** `/institutions/[id]/gate`

> Campus security and student movement tracking. Essential for residential colleges. Students leaving campus need warden/HOD approval. All external visitors must be logged.

#### Database:
```sql
CREATE TABLE visitor_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  visitor_name     TEXT NOT NULL,
  visitor_phone    TEXT,
  id_proof_type    TEXT,           -- Aadhaar, PAN, Driving License
  id_proof_number  TEXT,
  purpose          TEXT NOT NULL,
  meeting_with     UUID REFERENCES auth.users(id),
  vehicle_number   TEXT,
  check_in_time    TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out_time   TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'checked_in'
                   CHECK (status IN ('checked_in','checked_out'))
);

CREATE TABLE student_outpasses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  hostel_id        UUID REFERENCES hostels(id),
  reason           TEXT NOT NULL,
  destination      TEXT NOT NULL,
  out_time         TIMESTAMPTZ NOT NULL,
  expected_return  TIMESTAMPTZ NOT NULL,
  actual_return    TIMESTAMPTZ,
  approved_by      UUID REFERENCES staff(id),
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','rejected','returned','overdue'))
);
```

> **Status:** ✅ **Complete** (migration `20260615040000_phase4g_gate`). Visitor
> logbook (check-in with ID proof + vehicle → check-out, live duration) and a
> student outpass workflow: student applies → warden/admin approves or rejects →
> security marks returned on re-entry. Outpasses auto-link the student's active
> hostel (4C) so the **warden of that hostel** can approve via the staff portal;
> overdue is derived live (approved + past expected return, unreturned). RLS:
> visitors members-read/admins-manage; outpasses student-reads/applies-own,
> warden-or-admin approves. Pure helpers (overdue, live status, tallies, durations)
> unit-tested (10 tests). **Deferred:** overdue → warden notification (Phase 3 +
> scheduler sweep); visitor/outpass CSV report export.

#### What to build:
- [x] `supabase/migrations/20260615040000_phase4g_gate.sql` — visitor_log + student_outpasses + RLS + indexes
- [x] `src/app/institutions/[id]/gate/page.tsx` — security dashboard (`GateDashboard`): on-campus visitors, pending outpasses, overdue/out counters
- [x] `src/app/institutions/[id]/gate/visitors/page.tsx` — log visitor + check-out (`VisitorsManager`)
- [x] `src/app/institutions/[id]/gate/outpasses/page.tsx` — approve/reject + mark-returned (`OutpassList`)
- [x] `src/actions/gateManagement.ts` — logVisitor, checkOutVisitor, getVisitors, getOutpasses, approveOutpass, rejectOutpass, markOutpassReturned, requestOutpass, getMyOutpasses, getWardenOutpasses
- [x] Student portal: `src/app/student-portal/outpass/page.tsx` — apply + track status (`StudentOutpass`)
- [x] Staff portal: `src/app/staff-portal/outpass/page.tsx` — wardens approve pending outpasses for their hostel(s)
- [~] Overdue alert → warden notification — *deferred (needs Phase 3 + a scheduler sweep)*

#### Key features:
- Visitor log with ID proof type, vehicle entry, and check-in/out timestamps
- Student outpass: apply → warden/HOD approval → security check-out → check-in on return
- Overdue alerts: student not returned by expected time → notification to warden
- Daily/weekly visitor and outpass report

---

### Step 4H — Student Clubs & Organizations (NSS / NCC / Cultural)

**Route:** `/institutions/[id]/clubs`

> Every Indian college has NSS, NCC, cultural committees, sports associations. Tracking these is required for NAAC Criterion 5.3 (Student Participation).

#### Database:
```sql
CREATE TABLE clubs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id       UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  club_type            TEXT NOT NULL CHECK (club_type IN (
                         'nss','ncc','cultural','sports','literary',
                         'technical','environmental','other')),
  faculty_coordinator  UUID REFERENCES staff(id),
  student_secretary_id UUID REFERENCES students(id),
  description          TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE club_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member'
             CHECK (role IN ('member','secretary','joint_secretary','treasurer','president')),
  joined_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(club_id, student_id)
);

CREATE TABLE club_activities (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id            UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  activity_type      TEXT NOT NULL CHECK (activity_type IN (
                       'event','camp','competition','workshop',
                       'community_service','seminar','other')),
  activity_date      DATE NOT NULL,
  venue              TEXT,
  participants_count INTEGER,
  description        TEXT,
  photo_urls         JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### What to build:
- [ ] `supabase/migrations/..._clubs.sql`
- [ ] `src/app/institutions/[id]/clubs/page.tsx` — Clubs directory: list, manage, view activity stats
- [ ] `src/app/institutions/[id]/clubs/[clubId]/page.tsx` — Club detail: members roster, activities log
- [ ] `src/actions/clubs.ts` — getClubs, addClub, addMember, logActivity, getNAACReport
- [ ] `src/components/clubs/ClubCard.tsx` — Card: club type badge, coordinator, member count, recent activity
- [ ] Student portal: `src/app/student-portal/clubs/page.tsx` — My clubs, upcoming activities, membership badge
- [ ] NAAC export: student participation in extracurricular activities (Criterion 5.3)

#### Key features:
- NSS and NCC flagged separately for government reporting
- Activity log: community service hours, competition results
- NAAC Criterion 5.3 report: number of students in clubs, activities count
- Student portal shows membership certificates per club

---

### Step 4I — Health & Medical Records (Infirmary)

**Route:** `/institutions/[id]/infirmary`

> College infirmary/sick bay management. Patient visit logs, medicines dispensed, referrals. Essential for residential colleges. Students with chronic conditions need pre-registered medical profiles.

#### Database:
```sql
CREATE TABLE medical_records (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id          UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id              UUID REFERENCES students(id) ON DELETE CASCADE,
  blood_group             TEXT,
  known_allergies         TEXT,
  chronic_conditions      TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  insurance_policy        TEXT
);

CREATE TABLE medical_visits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL REFERENCES auth.users(id),
  patient_type        TEXT NOT NULL CHECK (patient_type IN ('student','staff')),
  visit_date          TIMESTAMPTZ NOT NULL DEFAULT now(),
  symptoms            TEXT NOT NULL,
  diagnosis           TEXT,
  treatment_given     TEXT,
  medicines_dispensed JSONB,     -- Array of { name, dosage, quantity }
  referred_to         TEXT,      -- External hospital/doctor if referred
  follow_up_date      DATE,
  attended_by         TEXT       -- Doctor/nurse name
);
```

#### What to build:
- [ ] `supabase/migrations/..._infirmary.sql`
- [ ] `src/app/institutions/[id]/infirmary/page.tsx` — Infirmary dashboard: today's visits, medicine log
- [ ] `src/app/institutions/[id]/infirmary/visit/page.tsx` — Log new patient visit with diagnosis and medicines
- [ ] `src/app/institutions/[id]/infirmary/records/page.tsx` — Search student medical profiles
- [ ] `src/actions/infirmary.ts` — logVisit, getMedicalRecord, getVisitHistory, updateMedicalProfile
- [ ] Student portal: `src/app/student-portal/health/page.tsx` — Personal medical record, visit history, upcoming follow-ups
- [ ] Admin: pre-populate medical record from admissions module (blood group, allergies)

#### Key features:
- Student medical profile pre-populated at admission (blood group, allergies, emergency contact)
- Visit log with medicines dispensed per visit
- Referral tracking: student referred to external hospital with reason
- Follow-up date reminder via notification system (Phase 3)

---

### Step 4J — Sports & Physical Education

**Route:** `/institutions/[id]/sports`

> Sports teams, facilities, tournaments, and achievements. NAAC Criterion 4.4 (Maintenance of Infrastructure) and Criterion 5.3 (Student Support). Essential for NIRF rankings.

#### Database:
```sql
CREATE TABLE sports_facilities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  sport_type     TEXT NOT NULL,
  capacity       INTEGER,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE sports_teams (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  sport_name       TEXT NOT NULL,
  team_category    TEXT NOT NULL CHECK (team_category IN ('men','women','mixed')),
  coach_id         UUID REFERENCES staff(id),
  academic_year_id UUID REFERENCES academic_years(id)
);

CREATE TABLE sports_team_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES sports_teams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id),
  position   TEXT,
  UNIQUE(team_id, student_id)
);

CREATE TABLE sports_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  team_id        UUID REFERENCES sports_teams(id),
  student_id     UUID REFERENCES students(id),
  event_name     TEXT NOT NULL,
  level          TEXT NOT NULL CHECK (level IN (
                   'inter_class','inter_college','district',
                   'state','national','international')),
  position       TEXT NOT NULL,   -- Gold, Silver, Bronze, Participant
  event_date     DATE NOT NULL,
  certificate_url TEXT
);
```

#### What to build:
- [ ] `supabase/migrations/..._sports.sql`
- [ ] `src/app/institutions/[id]/sports/page.tsx` — Sports overview: teams, achievements trophy wall, facilities
- [ ] `src/app/institutions/[id]/sports/achievements/page.tsx` — Log achievements: student, level, position, event
- [ ] `src/actions/sports.ts` — getTeams, addTeam, logAchievement, getSportsReport
- [ ] `src/components/sports/AchievementCard.tsx` — Card: sport, level badge, position medal icon
- [ ] Student portal: `src/app/student-portal/sports/page.tsx` — My sports teams, personal achievements
- [ ] NAAC/NIRF export: sports achievements per academic year, level-wise breakdown

#### Key features:
- Achievement levels colour-coded: International (gold) → State (silver) → District (bronze)
- Sports scholarship eligibility auto-link (Step 5G)
- NIRF Criterion: sports achievements and facilities count
- Student portal shows achievements as profile badges

---

### Step 4K — Annual Day & Large Campus Event Management

**Route:** `/institutions/[id]/events`

> The academic calendar (Step 2A) records events as date entries. This module manages the
> operational side of large institutional events — Annual Day, Sports Day, Cultural Fests,
> Convocation — with committee assignment, participant rosters, budget tracking, and photo
> documentation. Separate from Clubs (4H), which are year-round recurring organisations.

#### Database:
```sql
CREATE TABLE campus_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id       UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  academic_year_id     UUID REFERENCES academic_years(id),
  title                TEXT NOT NULL,
  event_type           TEXT NOT NULL CHECK (event_type IN (
                         'annual_day','sports_day','cultural_fest','tech_fest',
                         'convocation','orientation','open_day','seminar_day','other')),
  event_date           DATE NOT NULL,
  venue                TEXT,
  organizing_committee JSONB,    -- Array of { staff_id, role }
  budget_allocated     NUMERIC(10,2),
  actual_spend         NUMERIC(10,2) NOT NULL DEFAULT 0,
  attendees_count      INTEGER,
  photo_urls           JSONB,
  description          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE campus_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campus_events: institution members can manage"
  ON public.campus_events
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));

CREATE TABLE event_participants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES campus_events(id) ON DELETE CASCADE,
  student_id   UUID REFERENCES students(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'participant'
               CHECK (role IN ('participant','organizer','performer','volunteer')),
  UNIQUE(event_id, student_id)
);
```

#### What to build:
- [ ] `supabase/migrations/..._campus_events.sql`
- [ ] `src/app/institutions/[id]/events/page.tsx` — Event registry: upcoming and past events, budget vs spend overview
- [ ] `src/app/institutions/[id]/events/[eventId]/page.tsx` — Event detail: committee roster, participant list, budget line items, photo gallery
- [ ] `src/actions/campusEvents.ts` — createEvent, addParticipant, bulkAddParticipants, updateBudget, uploadEventPhotos
- [ ] `src/components/events/EventCard.tsx` — Card: event type badge, date, venue, participant count, budget status (over/under)
- [ ] Student portal: `src/app/student-portal/events/page.tsx` — Upcoming events in their institution, registered events, volunteer sign-up
- [ ] Academic calendar integration: creating a campus event auto-adds it to the academic calendar (Step 2A) as an `annual_day` / `sports_day` etc. event entry
- [ ] NAAC Criterion 5.3 export: number of institutional events per year, student participation counts

#### Key features:
- Committee assignment: designate organizing staff and their roles (Coordinator, Stage Manager, MC, etc.)
- Budget tracker: allocated vs actual spend with line-item breakdown
- Participant roster: students register or volunteer; admin can bulk-import via CSV
- Photo gallery per event for NAAC/NIRF evidence documentation
- Auto-synced to academic calendar on creation (no duplicate entry)

---

### Phase 4 Completion Checklist
- [ ] Library: book catalog, lending, overdue fine calculation all working
- [ ] Auditorium: venue booking with conflict detection and approval flow
- [ ] Hostel: room allocation, occupancy grid, mess billing, maintenance requests, student portal hostel view
- [x] Laboratories: labs registry, student batches, experiment sessions, and portal views
- [x] Assets: stock registry, low stock alerts, allocations to labs, and maintenance logs
- [x] Smart cards: NFC card registry with issuance and deactivation working
- [x] Gate pass: visitor log and student outpass working with warden approval
- [ ] Clubs: NSS/NCC and all clubs registered with activity logs and NAAC export
- [ ] Infirmary: visit log and student medical profiles working
- [ ] Sports: teams, facilities, and achievements logged with NIRF export
- [ ] Campus Events: event registry with committee assignment, participant rosters, and budget tracking
- [ ] All campus infrastructure modules integrated with student and staff portals
- [ ] `git commit -m "feat: Phase 4 — Campus Infrastructure & Laboratories complete"`
- [ ] `git push origin main`

---

