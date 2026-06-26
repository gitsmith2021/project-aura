-- ════════════════════════════════════════════════════════════════════════════
-- AURA CORE FOUNDATION · CF-1 — App Configuration Center
--
-- A product-agnostic configuration engine (the @aura/config seam). Two tables:
--   • app_setting_definitions — the REGISTRY: what *can* be configured (key, type,
--     default, category, options). Product-supplied, platform-global. No tenant id.
--   • app_setting_values — what *is* configured, per institution.
--
-- Resolution precedence (in app code): institution value → definition default.
--
-- Design rule: the schema knows "a setting", never a Campus-specific noun. The
-- *categories and keys* below are Campus-registered seed data — Aura Build/Field
-- register their own definitions against the same engine.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Registry: what can be configured ──────────────────────────────────────────
create table if not exists public.app_setting_definitions (
  key           text primary key,                       -- e.g. 'attendance.min_percent'
  category      text not null,                           -- e.g. 'Attendance'
  label         text not null,                           -- human label
  description   text,                                    -- help text shown in the UI
  type          text not null check (type in ('toggle','select','number','text')),
  default_value jsonb not null,                          -- typed default
  options       jsonb,                                   -- for 'select': [{value,label}]
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists ix_app_setting_definitions_category
  on public.app_setting_definitions (category, sort_order);

-- ── Values: what is configured, per institution ───────────────────────────────
create table if not exists public.app_setting_values (
  id             uuid primary key default gen_random_uuid(),
  setting_key    text not null references public.app_setting_definitions(key) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  value          jsonb not null,
  updated_at     timestamptz not null default now(),
  unique (setting_key, institution_id)
);

create index if not exists ix_app_setting_values_institution
  on public.app_setting_values (institution_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.app_setting_definitions enable row level security;
alter table public.app_setting_values      enable row level security;

-- Definitions: readable by any authenticated user (so resolvers work everywhere);
-- only SUPER_ADMIN may edit the platform registry.
drop policy if exists "setting defs: read" on public.app_setting_definitions;
create policy "setting defs: read" on public.app_setting_definitions
  for select to authenticated using (true);

drop policy if exists "setting defs: super admin manage" on public.app_setting_definitions;
create policy "setting defs: super admin manage" on public.app_setting_definitions
  for all to authenticated
  using (exists (
    select 1 from public.institution_members m
    where m.profile_id = (select auth.uid()) and m.role = 'SUPER_ADMIN'
  ))
  with check (exists (
    select 1 from public.institution_members m
    where m.profile_id = (select auth.uid()) and m.role = 'SUPER_ADMIN'
  ));

-- Values: an admin-tier member of the institution (or any SUPER_ADMIN) may
-- read & write that institution's configuration. RLS is the tenant-isolation
-- backstop behind the server-action gate.
drop policy if exists "setting values: admin manage own" on public.app_setting_values;
create policy "setting values: admin manage own" on public.app_setting_values
  for all to authenticated
  using (exists (
    select 1 from public.institution_members m
    where m.profile_id = (select auth.uid())
      and (
        m.role = 'SUPER_ADMIN'
        or (m.institution_id = app_setting_values.institution_id
            and m.role in ('INST_ADMIN','PRINCIPAL'))
      )
  ))
  with check (exists (
    select 1 from public.institution_members m
    where m.profile_id = (select auth.uid())
      and (
        m.role = 'SUPER_ADMIN'
        or (m.institution_id = app_setting_values.institution_id
            and m.role in ('INST_ADMIN','PRINCIPAL'))
      )
  ));

grant select, insert, update, delete on public.app_setting_definitions to authenticated;
grant select, insert, update, delete on public.app_setting_values to authenticated;

-- ── Seed the registry (17 categories; inert — not yet wired to behaviour) ──────
insert into public.app_setting_definitions (key, category, label, description, type, default_value, options, sort_order) values
  -- Institution
  ('institution.academic_mode','Institution','Academic Mode','Term structure used across the institution.','select','"semester"','[{"value":"semester","label":"Semester"},{"value":"trimester","label":"Trimester"},{"value":"annual","label":"Annual"}]',1),
  ('institution.week_start','Institution','Week Starts On','First day of the working week for calendars and timetables.','select','"monday"','[{"value":"monday","label":"Monday"},{"value":"sunday","label":"Sunday"}]',2),
  ('institution.working_days','Institution','Working Days / Week','Number of instructional days per week.','number','6',null,3),
  -- Admissions
  ('admissions.online_enabled','Admissions','Online Applications','Allow prospects to apply through the public admissions form.','toggle','true',null,1),
  ('admissions.auto_merit_list','Admissions','Auto Merit List','Automatically rank applicants by marks when generating the merit list.','toggle','true',null,2),
  ('admissions.application_fee','Admissions','Application Fee','Default application fee charged to new applicants.','number','0',null,3),
  -- Academics
  ('academics.grading_scheme','Academics','Grading Scheme','Default scheme used to compute results.','select','"percentage"','[{"value":"percentage","label":"Percentage"},{"value":"gpa","label":"GPA (10-point)"},{"value":"cgpa","label":"CGPA"}]',1),
  ('academics.pass_mark','Academics','Pass Mark (%)','Minimum percentage required to pass a component.','number','40',null,2),
  ('academics.copo_enabled','Academics','CO/PO Attainment','Compute outcome attainment (OBE) for accreditation.','toggle','true',null,3),
  -- Attendance
  ('attendance.min_percent','Attendance','Minimum Attendance (%)','Threshold below which a student is flagged short of attendance.','number','75',null,1),
  ('attendance.nfc_enabled','Attendance','NFC Attendance','Allow attendance marking via NFC card readers.','toggle','true',null,2),
  ('attendance.lock_after_days','Attendance','Lock Register After (days)','Days after a session before its attendance is locked from edits.','number','7',null,3),
  -- Examination
  ('examination.hall_ticket_required','Examination','Require Hall Ticket','Students must download a hall ticket before an exam.','toggle','true',null,1),
  ('examination.reval_window_days','Examination','Revaluation Window (days)','Days after results during which revaluation may be requested.','number','15',null,2),
  -- Finance
  ('finance.online_payments','Finance','Online Payments','Enable Razorpay online fee payments.','toggle','true',null,1),
  ('finance.late_fee_per_day','Finance','Late Fee / Day','Default late fee charged per day on overdue demands.','number','0',null,2),
  ('finance.fee_due_grace_days','Finance','Fee Due Grace (days)','Grace period before a fee-due reminder is sent.','number','7',null,3),
  -- HR
  ('hr.casual_leave_per_year','HR','Casual Leave / Year','Default annual casual-leave entitlement for staff.','number','12',null,1),
  ('hr.payroll_day','HR','Payroll Run Day','Day of month payroll is processed.','number','1',null,2),
  ('hr.statutory_payroll','HR','Statutory Payroll','Compute TDS / PF / ESI on payroll runs.','toggle','true',null,3),
  -- Student Portal
  ('student_portal.show_results','Student Portal','Show Results','Let students view published results in the portal.','toggle','true',null,1),
  ('student_portal.show_fees','Student Portal','Show Fee Dues','Let students view fee dues and pay online.','toggle','true',null,2),
  ('student_portal.show_attendance','Student Portal','Show Attendance','Let students view their attendance percentage.','toggle','true',null,3),
  -- Parent Portal
  ('parent_portal.enabled','Parent Portal','Parent Portal','Enable the parent portal for this institution.','toggle','true',null,1),
  ('parent_portal.show_fees','Parent Portal','Show Fees to Parents','Let parents view their child''s fee dues.','toggle','true',null,2),
  -- Faculty Portal
  ('faculty_portal.marks_entry','Faculty Portal','Marks Entry','Allow faculty to enter CIA marks for their subjects.','toggle','true',null,1),
  ('faculty_portal.kh_upload','Faculty Portal','Knowledge Hub Upload','Allow faculty to upload resources to the Knowledge Hub.','toggle','true',null,2),
  -- Knowledge Hub
  ('knowledge_hub.enabled','Knowledge Hub','Knowledge Hub','Enable the institutional Knowledge Hub.','toggle','true',null,1),
  ('knowledge_hub.student_access','Knowledge Hub','Student Access','Let students browse published Knowledge Hub resources.','toggle','true',null,2),
  -- AI Features
  ('ai.summaries_enabled','AI Features','AI Summaries','Enable AI-generated resource summaries (optional add-on).','toggle','false',null,1),
  ('ai.assistant_enabled','AI Features','Knowledge Assistant','Enable the RAG Knowledge Assistant (optional add-on).','toggle','false',null,2),
  -- Notifications
  ('notifications.email_enabled','Notifications','Email Notifications','Send transactional emails (receipts, approvals).','toggle','true',null,1),
  ('notifications.sms_enabled','Notifications','SMS Notifications','Send SMS notifications (requires a configured gateway).','toggle','false',null,2),
  ('notifications.whatsapp_enabled','Notifications','WhatsApp Notifications','Send WhatsApp notifications (requires Meta verification).','toggle','false',null,3),
  -- Integrations
  ('integrations.razorpay_enabled','Integrations','Razorpay','Use Razorpay for online payments.','toggle','true',null,1),
  ('integrations.scheduler_engine','Integrations','AI Timetable Engine','Use the OR-Tools scheduler engine for timetabling.','toggle','true',null,2),
  -- Security
  ('security.enforce_2fa','Security','Enforce 2FA','Require two-factor authentication for staff and admins.','toggle','false',null,1),
  ('security.session_timeout_min','Security','Idle Session Timeout (min)','Minutes of inactivity before a session expires (0 = never).','number','30',null,2),
  ('security.strict_password','Security','Strict Password Policy','Require strong passwords (12+ chars, mixed case, symbols).','toggle','true',null,3),
  -- Mobile
  ('mobile.enabled','Mobile','Mobile Apps','Enable mobile app access for this institution.','toggle','true',null,1),
  ('mobile.push_enabled','Mobile','Push Notifications','Send push notifications to the mobile apps.','toggle','false',null,2),
  -- Feature Flags
  ('feature_flags.online_exams','Feature Flags','Online Examinations','Enable the online examination module.','toggle','true',null,1),
  ('feature_flags.lms','Feature Flags','E-Learning (LMS)','Enable the LMS / e-learning module.','toggle','true',null,2),
  ('feature_flags.transport','Feature Flags','Transport','Enable the transport management module.','toggle','true',null,3),
  ('feature_flags.industry_connect','Feature Flags','Industry Connect','Enable the Industry Connect / MOU module.','toggle','true',null,4)
on conflict (key) do nothing;
