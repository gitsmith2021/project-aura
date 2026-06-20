-- ============================================================================
-- AURA Campus - Schema Baseline (Arch A5 follow-up, 2026-06-20)
--
-- Single authoritative migration capturing the FULL public + private schema,
-- generated with `pg_dump --schema-only --no-owner` from the production DB.
-- It supersedes the original 133 incremental migrations, which could NOT be
-- replayed from zero: foundational tables (institutions, departments, profiles)
-- were bootstrapped outside the migration chain via manual SQL. Those files are
-- preserved for history under supabase/migrations_archive/.
--
-- The Supabase local stack already provides the managed schemas (auth, storage,
-- extensions, ...) this baseline references; only public + private are created
-- here. New schema changes go in NEW timestamped migrations after this one.
-- ============================================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: private; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS private;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'SUPER_ADMIN',
    'INST_ADMIN',
    'DEPARTMENT_HEAD',
    'STAFF',
    'STUDENT',
    'HOD'
);


--
-- Name: alumni_institution_ids(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.alumni_institution_ids() RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select institution_id from public.alumni
  where profile_id = auth.uid() and is_active = true;
$$;


--
-- Name: get_user_authorizations(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.get_user_authorizations() RETURNS TABLE(role public.user_role, tenant_id uuid, department_id uuid, shift_id uuid)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    CASE
      -- PRINCIPAL is institution-wide leadership → treated as INST_ADMIN for
      -- all row-level authorization (see migration header).
      WHEN tu.role = 'PRINCIPAL' THEN 'INST_ADMIN'::public.user_role
      WHEN tu.role IN ('SUPER_ADMIN','INST_ADMIN','HOD','DEPARTMENT_HEAD','STAFF','STUDENT')
      THEN tu.role::public.user_role
      ELSE NULL
    END AS role,
    tu.institution_id AS tenant_id,
    tu.department_id,
    tu.shift_id
  FROM public.institution_members tu
  WHERE tu.profile_id = auth.uid();
$$;


--
-- Name: sweep_fee_due(integer); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.sweep_fee_due(grace_days integer DEFAULT 7) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'private'
    AS $$
declare
  affected integer := 0;
begin
  insert into public.notifications (institution_id, recipient_id, type, title, body, data)
  select d.institution_id, s.profile_id, 'fee_due', 'Fee payment due',
         'You have an outstanding fee of ₹' || round(d.net_due - coalesce(p.paid, 0))::text ||
         ' (' || d.title || '), due ' || to_char(d.due_date, 'DD Mon YYYY') ||
         '. Please pay to avoid late charges.',
         jsonb_build_object('demand_id', d.id, 'balance', round(d.net_due - coalesce(p.paid, 0)))
  from public.fee_demands d
  join public.students s on s.id = d.student_id
  left join (
    select student_id, fee_structure_id, sum(amount_paid) as paid
    from public.fee_payments
    where payment_status = 'completed'
    group by student_id, fee_structure_id
  ) p on p.student_id = d.student_id and p.fee_structure_id = d.fee_structure_id
  where d.status not in ('waived', 'cancelled')
    and d.due_date < (current_date - grace_days)
    and d.net_due > coalesce(p.paid, 0)
    and s.profile_id is not null
    and not exists (
      select 1 from public.notifications n
      where n.recipient_id = s.profile_id and n.type = 'fee_due'
        and n.created_at > now() - interval '7 days'
    );
  get diagnostics affected = row_count;
  return affected;
end;
$$;


--
-- Name: sweep_low_attendance(integer, integer); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.sweep_low_attendance(threshold integer DEFAULT 75, min_sessions integer DEFAULT 5) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'private'
    AS $$
declare
  affected integer := 0;
begin
  insert into public.notifications (institution_id, recipient_id, type, title, body, data)
  select s.institution_id, s.profile_id, 'attendance_low', 'Low attendance alert',
         'Your attendance is ' || agg.pct || '%, below the ' || threshold ||
         '% requirement. Please attend classes regularly.',
         jsonb_build_object('pct', agg.pct, 'sessions', agg.total)
  from (
    select a.student_id,
           round(100.0 * count(*) filter (where a.status = 'present') / nullif(count(*), 0)) as pct,
           count(*) as total
    from public.attendance a
    where a.student_id is not null
    group by a.student_id
  ) agg
  join public.students s on s.id = agg.student_id
  where agg.total >= min_sessions
    and agg.pct < threshold
    and s.profile_id is not null
    and not exists (
      select 1 from public.notifications n
      where n.recipient_id = s.profile_id
        and n.type = 'attendance_low'
        and n.created_at > now() - interval '7 days'
    );
  get diagnostics affected = row_count;

  return affected;
end;
$$;


--
-- Name: sweep_overdue_outpasses(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.sweep_overdue_outpasses() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'private'
    AS $$
declare
  affected integer := 0;
begin
  insert into public.notifications (institution_id, recipient_id, type, title, body, data)
  select o.institution_id, stw.profile_id, 'outpass_overdue', 'Outpass overdue',
         s.full_name || ' has not returned by the expected time (destination: ' || o.destination || ').',
         jsonb_build_object('outpass_id', o.id, 'student_id', o.student_id)
  from public.student_outpasses o
  join public.students s   on s.id = o.student_id
  join public.hostels h    on h.id = o.hostel_id
  join public.staff   stw  on stw.id = h.warden_id
  where o.status = 'approved' and o.actual_return is null and o.expected_return < now()
    and stw.profile_id is not null;

  insert into public.notifications (institution_id, recipient_id, type, title, body, data)
  select o.institution_id, s.profile_id, 'outpass_overdue', 'You are overdue',
         'Your outpass return time has passed. Please return to campus or contact your warden.',
         jsonb_build_object('outpass_id', o.id)
  from public.student_outpasses o
  join public.students s on s.id = o.student_id
  where o.status = 'approved' and o.actual_return is null and o.expected_return < now()
    and s.profile_id is not null;

  update public.student_outpasses
  set status = 'overdue'
  where status = 'approved' and actual_return is null and expected_return < now();
  get diagnostics affected = row_count;

  return affected;
end;
$$;


--
-- Name: get_user_authorizations(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_authorizations() RETURNS TABLE(role public.user_role, tenant_id uuid, department_id uuid, shift_id uuid)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT * FROM private.get_user_authorizations();
$$;


--
-- Name: platform_table_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.platform_table_stats() RETURNS TABLE(table_name text, row_estimate bigint, rls_enabled boolean)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select c.relname::text,
         greatest(c.reltuples, 0)::bigint as row_estimate,
         c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
  order by c.relname;
$$;


--
-- Name: review_leave_request(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.review_leave_request(p_leave_id uuid, p_status text, p_note text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_inst     uuid;
  v_before   jsonb;
  v_note     text := NULLIF(btrim(p_note), '');
  v_ok       boolean;
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status USING ERRCODE = '22023';
  END IF;

  SELECT lr.institution_id,
         jsonb_build_object('status', lr.status, 'review_note', lr.review_note,
                            'reviewed_at', lr.reviewed_at, 'staff_id', lr.staff_id)
    INTO v_inst, v_before
  FROM public.leave_requests lr
  WHERE lr.id = p_leave_id;

  IF v_inst IS NULL THEN
    RAISE EXCEPTION 'Leave request not found' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.institution_members m
    WHERE m.profile_id = v_uid
      AND (
        m.role = 'SUPER_ADMIN'
        OR (m.role IN ('INST_ADMIN', 'PRINCIPAL', 'HOD', 'DEPARTMENT_HEAD')
            AND m.institution_id = v_inst)
      )
  ) INTO v_ok;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Not authorized to review leave for this institution'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.leave_requests
     SET status      = p_status,
         review_note = v_note,
         reviewed_by = v_uid,
         reviewed_at = now(),
         updated_at  = now()
   WHERE id = p_leave_id;

  -- Append-only audit (Dev Rule 13). Owner-context insert bypasses the
  -- audit_logs admin-only RLS, exactly as the web's service-role logAudit does.
  INSERT INTO public.audit_logs
    (institution_id, performed_by, table_name, record_id, action, before_data, after_data, notes)
  VALUES
    (v_inst, v_uid, 'leave_requests', p_leave_id, 'UPDATE', v_before,
     jsonb_build_object('status', p_status, 'review_note', v_note),
     'Leave ' || p_status || ' (mobile)');
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: academic_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academic_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    academic_year_id uuid,
    title text NOT NULL,
    event_type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    description text,
    is_public boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT academic_events_event_type_check CHECK ((event_type = ANY (ARRAY['semester_start'::text, 'semester_end'::text, 'exam_window'::text, 'holiday'::text, 'annual_day'::text, 'sports_day'::text, 'expo'::text, 'cultural'::text, 'other'::text])))
);


--
-- Name: academic_years; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academic_years (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    label text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admission_enquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admission_enquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    email text,
    program_interest text NOT NULL,
    department_id uuid,
    source text DEFAULT 'website'::text NOT NULL,
    enquiry_date date DEFAULT CURRENT_DATE NOT NULL,
    follow_up_date date,
    status text DEFAULT 'new'::text NOT NULL,
    notes text,
    converted_admission_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admission_enquiries_program_interest_check CHECK ((program_interest = ANY (ARRAY['UG'::text, 'PG'::text, 'Diploma'::text, 'Certificate'::text]))),
    CONSTRAINT admission_enquiries_source_check CHECK ((source = ANY (ARRAY['website'::text, 'walk_in'::text, 'phone'::text, 'referral'::text, 'social_media'::text, 'fair'::text, 'other'::text]))),
    CONSTRAINT admission_enquiries_status_check CHECK ((status = ANY (ARRAY['new'::text, 'contacted'::text, 'interested'::text, 'applied'::text, 'not_interested'::text, 'lost'::text])))
);


--
-- Name: admissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    applicant_name text NOT NULL,
    applicant_email text NOT NULL,
    applicant_phone text,
    program_applied text NOT NULL,
    department_id uuid,
    dob date,
    address text,
    previous_school text,
    marks_percentage numeric(5,2),
    documents_url jsonb,
    status text DEFAULT 'applied'::text NOT NULL,
    admin_notes text,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admissions_program_applied_check CHECK ((program_applied = ANY (ARRAY['UG'::text, 'PG'::text]))),
    CONSTRAINT admissions_status_check CHECK ((status = ANY (ARRAY['applied'::text, 'shortlisted'::text, 'interview'::text, 'admitted'::text, 'rejected'::text, 'enrolled'::text])))
);


--
-- Name: alumni; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alumni (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    profile_id uuid,
    source_student_id uuid,
    full_name text NOT NULL,
    email text,
    phone text,
    roll_no text,
    program text,
    department_id uuid,
    graduation_year integer NOT NULL,
    batch text,
    current_employer text,
    current_designation text,
    linkedin_url text,
    city text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: alumni_announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alumni_announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    graduation_year integer,
    program text,
    posted_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: asset_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    allocated_to_type text NOT NULL,
    department_id uuid,
    laboratory_id uuid,
    staff_id uuid,
    allocated_qty integer DEFAULT 1 NOT NULL,
    allocated_date date DEFAULT CURRENT_DATE NOT NULL,
    returned_qty integer DEFAULT 0,
    returned_date date,
    status text DEFAULT 'allocated'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT asset_allocations_allocated_to_type_check CHECK ((allocated_to_type = ANY (ARRAY['department'::text, 'laboratory'::text, 'staff'::text]))),
    CONSTRAINT asset_allocations_status_check CHECK ((status = ANY (ARRAY['allocated'::text, 'returned'::text, 'consumed'::text])))
);


--
-- Name: asset_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    name text NOT NULL,
    is_consumable boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: asset_maintenance_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_maintenance_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    log_date date DEFAULT CURRENT_DATE NOT NULL,
    description text NOT NULL,
    cost numeric(8,2) DEFAULT 0,
    logged_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    category_id uuid NOT NULL,
    name text NOT NULL,
    brand_model text,
    serial_number text,
    purchase_date date,
    purchase_cost numeric(10,2),
    status text DEFAULT 'active'::text NOT NULL,
    location_details text,
    current_stock integer DEFAULT 1 NOT NULL,
    unit text DEFAULT 'pcs'::text NOT NULL,
    reorder_level integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT assets_status_check CHECK ((status = ANY (ARRAY['active'::text, 'maintenance'::text, 'disposed'::text, 'low_stock'::text])))
);


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schedule_id uuid,
    student_id uuid,
    status text,
    captured_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: attendance_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attendance_id uuid,
    changed_by uuid,
    old_status text,
    new_status text,
    reason text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid,
    performed_by uuid,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    action text NOT NULL,
    before_data jsonb,
    after_data jsonb,
    ip_address text,
    user_agent text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_logs_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text, 'PROMOTE'::text, 'REVERT'::text])))
);


--
-- Name: budget_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_line_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    budget_id uuid NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    planned_amt numeric(10,2) NOT NULL,
    actual_amt numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT budget_line_items_category_check CHECK ((category = ANY (ARRAY['lab_equipment'::text, 'stationery'::text, 'furniture'::text, 'it_hardware'::text, 'software'::text, 'maintenance'::text, 'travel'::text, 'training'::text, 'events'::text, 'other'::text])))
);


--
-- Name: bus_routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bus_routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    vehicle_id uuid,
    route_name text NOT NULL,
    stops jsonb DEFAULT '[]'::jsonb NOT NULL,
    morning_start time without time zone,
    evening_start time without time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: campus_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campus_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    academic_year_id uuid,
    title text NOT NULL,
    event_type text NOT NULL,
    event_date date NOT NULL,
    venue text,
    organizing_committee jsonb DEFAULT '[]'::jsonb NOT NULL,
    budget_allocated numeric(10,2),
    actual_spend numeric(10,2) DEFAULT 0 NOT NULL,
    attendees_count integer,
    photo_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT campus_events_event_type_check CHECK ((event_type = ANY (ARRAY['annual_day'::text, 'sports_day'::text, 'cultural_fest'::text, 'tech_fest'::text, 'convocation'::text, 'orientation'::text, 'open_day'::text, 'seminar_day'::text, 'other'::text])))
);


--
-- Name: certificate_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificate_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    requester_type text NOT NULL,
    student_id uuid,
    staff_id uuid,
    certificate_type text NOT NULL,
    purpose text,
    status text DEFAULT 'requested'::text NOT NULL,
    remarks text,
    certificate_no text,
    requested_by uuid,
    reviewed_by uuid,
    issued_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cert_holder_matches_type CHECK ((((requester_type = 'student'::text) AND (student_id IS NOT NULL) AND (staff_id IS NULL)) OR ((requester_type = 'staff'::text) AND (staff_id IS NOT NULL) AND (student_id IS NULL)))),
    CONSTRAINT certificate_requests_certificate_type_check CHECK ((certificate_type = ANY (ARRAY['bonafide'::text, 'transfer_certificate'::text, 'character_certificate'::text, 'noc'::text, 'course_completion'::text, 'offer_letter'::text, 'experience_certificate'::text, 'relieving_letter'::text, 'salary_certificate'::text, 'service_certificate'::text]))),
    CONSTRAINT certificate_requests_requester_type_check CHECK ((requester_type = ANY (ARRAY['student'::text, 'staff'::text]))),
    CONSTRAINT certificate_requests_status_check CHECK ((status = ANY (ARRAY['requested'::text, 'approved'::text, 'issued'::text, 'rejected'::text])))
);


--
-- Name: cia_component_outcomes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cia_component_outcomes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    cia_component_id uuid NOT NULL,
    course_outcome_id uuid NOT NULL
);


--
-- Name: cia_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cia_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    department_id uuid,
    subject_id uuid,
    academic_year_id uuid,
    name text NOT NULL,
    component_type text NOT NULL,
    max_marks numeric(5,2) DEFAULT 25 NOT NULL,
    semester integer NOT NULL,
    weightage numeric(5,2) DEFAULT 100,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cia_components_component_type_check CHECK ((component_type = ANY (ARRAY['unit_test'::text, 'assignment'::text, 'lab_record'::text, 'seminar'::text, 'attendance_marks'::text, 'viva'::text, 'other'::text])))
);


--
-- Name: cia_marks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cia_marks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    student_id uuid NOT NULL,
    cia_component_id uuid NOT NULL,
    subject_id uuid,
    marks_scored numeric(5,2) NOT NULL,
    entered_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cia_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cia_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    student_id uuid NOT NULL,
    department_id uuid NOT NULL,
    academic_year_id uuid,
    semester integer NOT NULL,
    final_percentage numeric(5,2) NOT NULL,
    computation_mode text NOT NULL,
    components_snapshot jsonb NOT NULL,
    missing_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    computed_by uuid,
    published_by uuid,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cia_results_computation_mode_check CHECK ((computation_mode = ANY (ARRAY['weighted'::text, 'raw'::text]))),
    CONSTRAINT cia_results_final_percentage_check CHECK (((final_percentage >= (0)::numeric) AND (final_percentage <= (100)::numeric))),
    CONSTRAINT cia_results_semester_check CHECK (((semester >= 1) AND (semester <= 12))),
    CONSTRAINT cia_results_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);


--
-- Name: class_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid,
    department_id uuid,
    subject_id uuid,
    subject_name text,
    day_of_week text,
    start_time time without time zone,
    end_time time without time zone,
    shift text DEFAULT 'DAY'::text,
    created_at timestamp with time zone DEFAULT now(),
    staff_id uuid,
    status text DEFAULT 'scheduled'::text
);


--
-- Name: co_po_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.co_po_map (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    course_outcome_id uuid NOT NULL,
    program_outcome_id uuid NOT NULL,
    correlation integer NOT NULL,
    CONSTRAINT co_po_map_correlation_check CHECK (((correlation >= 1) AND (correlation <= 3)))
);


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    name text NOT NULL,
    industry text,
    website text,
    hr_contact_name text,
    hr_contact_email text,
    hr_contact_phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: course_outcomes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_outcomes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    display_order integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: curriculum_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curriculum_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_id uuid NOT NULL,
    institution_id uuid NOT NULL,
    unit_number integer NOT NULL,
    title text NOT NULL,
    description text,
    topics jsonb,
    reference_books jsonb,
    hours_allocated integer DEFAULT 5 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: data_consent_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_consent_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    user_id uuid NOT NULL,
    consent_type text NOT NULL,
    consented boolean NOT NULL,
    ip_address text,
    user_agent text,
    consented_at timestamp with time zone DEFAULT now() NOT NULL,
    withdrawn_at timestamp with time zone,
    CONSTRAINT data_consent_logs_consent_type_check CHECK ((consent_type = ANY (ARRAY['platform_terms'::text, 'data_processing'::text, 'marketing_comms'::text, 'biometric_nfc'::text, 'medical_records'::text, 'photo_usage'::text])))
);


--
-- Name: data_erasure_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_erasure_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    subject_type text NOT NULL,
    subject_id uuid NOT NULL,
    reason text,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_notes text,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    CONSTRAINT data_erasure_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_review'::text, 'completed'::text, 'rejected'::text]))),
    CONSTRAINT data_erasure_requests_subject_type_check CHECK ((subject_type = ANY (ARRAY['student'::text, 'staff'::text, 'parent'::text])))
);


--
-- Name: department_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.department_budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    department_id uuid NOT NULL,
    academic_year_id uuid NOT NULL,
    total_allocated numeric(12,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    submitted_by uuid,
    approved_by uuid,
    admin_notes text,
    submitted_at timestamp with time zone,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT department_budgets_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    institution_id uuid,
    color text DEFAULT 'violet'::text,
    session_type text DEFAULT 'NORMAL'::text NOT NULL,
    funding_type text DEFAULT 'AIDED'::text NOT NULL,
    icon text,
    hod_id uuid,
    CONSTRAINT departments_funding_type_check CHECK ((funding_type = ANY (ARRAY['AIDED'::text, 'SELF_FINANCING'::text]))),
    CONSTRAINT departments_session_type_check CHECK ((session_type = ANY (ARRAY['NORMAL'::text, 'DAY'::text, 'EVENING'::text])))
);


--
-- Name: devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_uid text NOT NULL,
    tenant_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    label text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: disciplinary_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disciplinary_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_id uuid NOT NULL,
    action_type text NOT NULL,
    effective_date date NOT NULL,
    duration_days integer,
    fine_amount numeric(8,2),
    remarks text,
    issued_by uuid,
    document_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT disciplinary_actions_action_type_check CHECK ((action_type = ANY (ARRAY['verbal_warning'::text, 'written_warning'::text, 'suspension'::text, 'fine'::text, 'expulsion'::text, 'counseling'::text, 'other'::text])))
);


--
-- Name: disciplinary_incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disciplinary_incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    reported_by uuid,
    student_id uuid,
    incident_type text NOT NULL,
    incident_date date NOT NULL,
    location text,
    description text NOT NULL,
    is_anonymous boolean DEFAULT false NOT NULL,
    status text DEFAULT 'reported'::text NOT NULL,
    committee_remarks text,
    action_taken text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT disciplinary_incidents_incident_type_check CHECK ((incident_type = ANY (ARRAY['misconduct'::text, 'ragging'::text, 'attendance_violation'::text, 'exam_malpractice'::text, 'property_damage'::text, 'other'::text]))),
    CONSTRAINT disciplinary_incidents_status_check CHECK ((status = ANY (ARRAY['reported'::text, 'under_review'::text, 'resolved'::text, 'escalated'::text])))
);


--
-- Name: draft_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.draft_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    department_id uuid NOT NULL,
    schedule_data jsonb NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    academic_year_id uuid
);


--
-- Name: event_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    student_id uuid NOT NULL,
    role text DEFAULT 'participant'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_participants_role_check CHECK ((role = ANY (ARRAY['participant'::text, 'organizer'::text, 'performer'::text, 'volunteer'::text])))
);


--
-- Name: exam_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    department_id uuid,
    subject_name text NOT NULL,
    exam_type text NOT NULL,
    exam_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    hall_name text,
    max_marks integer DEFAULT 100 NOT NULL,
    pass_marks integer DEFAULT 50 NOT NULL,
    academic_year_id uuid,
    semester integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT exam_schedules_exam_type_check CHECK ((exam_type = ANY (ARRAY['internal'::text, 'semester'::text, 'arrear'::text, 'supplementary'::text])))
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    department_id uuid,
    category text NOT NULL,
    description text NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_mode text NOT NULL,
    vendor_name text,
    receipt_url text,
    expense_date date NOT NULL,
    recorded_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT expenses_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT expenses_category_check CHECK ((category = ANY (ARRAY['utilities'::text, 'maintenance'::text, 'vendor'::text, 'events'::text, 'stationery'::text, 'infrastructure'::text, 'it'::text, 'other'::text]))),
    CONSTRAINT expenses_payment_mode_check CHECK ((payment_mode = ANY (ARRAY['cash'::text, 'upi'::text, 'bank_transfer'::text, 'cheque'::text, 'card'::text])))
);


--
-- Name: fee_concessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_concessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    student_id uuid NOT NULL,
    academic_year_id uuid,
    concession_type text NOT NULL,
    amount numeric(10,2),
    percentage numeric(5,2),
    applicable_to text,
    reason text NOT NULL,
    approved_by uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fee_concessions_amount_or_pct CHECK ((((amount IS NOT NULL) AND (percentage IS NULL)) OR ((amount IS NULL) AND (percentage IS NOT NULL)))),
    CONSTRAINT fee_concessions_concession_type_check CHECK ((concession_type = ANY (ARRAY['staff_ward'::text, 'management_quota'::text, 'merit'::text, 'hardship'::text, 'sports_quota'::text, 'other'::text]))),
    CONSTRAINT fee_concessions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: fee_demands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_demands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    student_id uuid NOT NULL,
    fee_structure_id uuid,
    academic_year_id uuid,
    title text NOT NULL,
    amount_due numeric(10,2) NOT NULL,
    concession_amount numeric(10,2) DEFAULT 0 NOT NULL,
    net_due numeric(10,2) GENERATED ALWAYS AS (GREATEST((amount_due - concession_amount), (0)::numeric)) STORED,
    due_date date NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source text DEFAULT 'fee_structure'::text NOT NULL,
    source_ref text,
    CONSTRAINT fee_demands_source_check CHECK ((source = ANY (ARRAY['fee_structure'::text, 'library_fine'::text, 'mess'::text, 'other'::text]))),
    CONSTRAINT fee_demands_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'partial'::text, 'paid'::text, 'waived'::text, 'cancelled'::text])))
);


--
-- Name: fee_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    student_id uuid NOT NULL,
    fee_structure_id uuid,
    amount_paid numeric(10,2) NOT NULL,
    payment_mode text NOT NULL,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    razorpay_order_id text,
    razorpay_payment_id text,
    razorpay_signature text,
    receipt_number text,
    paid_at timestamp with time zone,
    recorded_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    demand_id uuid,
    CONSTRAINT fee_payments_amount_paid_check CHECK ((amount_paid >= (0)::numeric)),
    CONSTRAINT fee_payments_payment_mode_check CHECK ((payment_mode = ANY (ARRAY['cash'::text, 'upi'::text, 'razorpay'::text, 'bank_transfer'::text, 'cheque'::text, 'dd'::text]))),
    CONSTRAINT fee_payments_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text])))
);


--
-- Name: fee_structures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_structures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    department_id uuid,
    name text NOT NULL,
    fee_type text NOT NULL,
    amount numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    academic_year_id uuid,
    CONSTRAINT fee_structures_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT fee_structures_fee_type_check CHECK ((fee_type = ANY (ARRAY['tuition'::text, 'hostel'::text, 'exam'::text, 'library'::text, 'lab'::text, 'transport'::text, 'other'::text])))
);


--
-- Name: feedback_forms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback_forms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    department_id uuid,
    staff_id uuid,
    title text NOT NULL,
    description text,
    subject_name text,
    questions jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    opens_at timestamp with time zone,
    closes_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feedback_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    form_id uuid NOT NULL,
    institution_id uuid NOT NULL,
    answers jsonb DEFAULT '{}'::jsonb NOT NULL,
    overall_rating numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feedback_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    form_id uuid NOT NULL,
    student_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: grievances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grievances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    submitted_by uuid,
    complainant_type text NOT NULL,
    category text NOT NULL,
    subject text NOT NULL,
    description text NOT NULL,
    evidence_url jsonb,
    status text DEFAULT 'submitted'::text NOT NULL,
    assigned_to uuid,
    resolution_notes text,
    resolved_at timestamp with time zone,
    deadline date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT grievance_anon_has_no_submitter CHECK (((complainant_type <> 'anonymous'::text) OR (submitted_by IS NULL))),
    CONSTRAINT grievances_category_check CHECK ((category = ANY (ARRAY['academic'::text, 'financial'::text, 'infrastructure'::text, 'staff_conduct'::text, 'harassment'::text, 'ragging'::text, 'other'::text]))),
    CONSTRAINT grievances_complainant_type_check CHECK ((complainant_type = ANY (ARRAY['student'::text, 'staff'::text, 'anonymous'::text]))),
    CONSTRAINT grievances_status_check CHECK ((status = ANY (ARRAY['submitted'::text, 'acknowledged'::text, 'under_review'::text, 'resolved'::text, 'escalated'::text, 'closed'::text])))
);


--
-- Name: guest_lectures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guest_lectures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    department_id uuid,
    academic_year_id uuid,
    subject_id uuid,
    speaker_name text NOT NULL,
    speaker_designation text,
    speaker_organization text,
    speaker_email text,
    speaker_phone text,
    title text NOT NULL,
    event_date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    venue text,
    mode text DEFAULT 'in_person'::text NOT NULL,
    student_count integer,
    staff_count integer,
    organized_by uuid,
    description text,
    outcomes text,
    feedback_summary text,
    naac_criterion text DEFAULT '1.3'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hostel_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hostel_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hostel_id uuid NOT NULL,
    room_id uuid NOT NULL,
    student_id uuid NOT NULL,
    allocated_from date DEFAULT CURRENT_DATE NOT NULL,
    allocated_to date,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hostel_allocations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'vacated'::text, 'transferred'::text])))
);


--
-- Name: hostel_announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hostel_announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hostel_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    posted_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hostel_maintenance_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hostel_maintenance_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hostel_id uuid NOT NULL,
    room_id uuid,
    raised_by uuid NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    photo_url text,
    priority text DEFAULT 'normal'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    assigned_to text,
    resolution_notes text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hostel_maintenance_requests_category_check CHECK ((category = ANY (ARRAY['electrical'::text, 'plumbing'::text, 'furniture'::text, 'cleaning'::text, 'ac_fan'::text, 'pest_control'::text, 'other'::text]))),
    CONSTRAINT hostel_maintenance_requests_priority_check CHECK ((priority = ANY (ARRAY['urgent'::text, 'normal'::text, 'low'::text]))),
    CONSTRAINT hostel_maintenance_requests_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])))
);


--
-- Name: hostel_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hostel_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hostel_id uuid NOT NULL,
    room_number text NOT NULL,
    floor integer DEFAULT 1 NOT NULL,
    room_type text NOT NULL,
    capacity integer DEFAULT 2 NOT NULL,
    occupied integer DEFAULT 0 NOT NULL,
    amenities jsonb,
    CONSTRAINT hostel_rooms_room_type_check CHECK ((room_type = ANY (ARRAY['single'::text, 'double'::text, 'triple'::text, 'dormitory'::text])))
);


--
-- Name: hostels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hostels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    name text NOT NULL,
    hostel_type text NOT NULL,
    warden_id uuid,
    total_rooms integer,
    address text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hostels_hostel_type_check CHECK ((hostel_type = ANY (ARRAY['boys'::text, 'girls'::text, 'co-ed'::text])))
);


--
-- Name: industry_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    mou_partner_id uuid,
    interaction_type text NOT NULL,
    title text NOT NULL,
    date date NOT NULL,
    students_benefited integer,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT industry_interactions_interaction_type_check CHECK ((interaction_type = ANY (ARRAY['internship'::text, 'guest_lecture'::text, 'workshop'::text, 'project'::text, 'training'::text, 'placement_drive'::text, 'other'::text]))),
    CONSTRAINT industry_interactions_students_benefited_check CHECK (((students_benefited IS NULL) OR (students_benefited >= 0)))
);


--
-- Name: institution_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid,
    institution_id uuid,
    role text NOT NULL,
    status text DEFAULT 'ACTIVE'::text,
    department_id uuid,
    shift_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT institution_members_role_check CHECK ((role = ANY (ARRAY['SUPER_ADMIN'::text, 'INST_ADMIN'::text, 'PRINCIPAL'::text, 'HOD'::text, 'DEPARTMENT_HEAD'::text, 'STAFF'::text, 'STUDENT'::text])))
);


--
-- Name: institution_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institution_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    billing_cycle text DEFAULT 'monthly'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    status text DEFAULT 'trial'::text NOT NULL,
    razorpay_sub_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT institution_subscriptions_billing_cycle_check CHECK ((billing_cycle = ANY (ARRAY['monthly'::text, 'annual'::text]))),
    CONSTRAINT institution_subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'trial'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: institutions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.institutions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subdomain text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    college_type text,
    status text DEFAULT 'Active'::text,
    session_types text[] DEFAULT ARRAY['NORMAL'::text],
    email_domain text,
    slug text NOT NULL,
    is_onboarded boolean DEFAULT false NOT NULL
);


--
-- Name: internships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.internships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    student_id uuid NOT NULL,
    academic_year_id uuid,
    type text DEFAULT 'internship'::text NOT NULL,
    company_name text NOT NULL,
    company_location text,
    company_sector text,
    mentor_name text,
    mentor_email text,
    mentor_phone text,
    start_date date NOT NULL,
    end_date date,
    duration_weeks integer,
    role_title text,
    description text,
    technologies text,
    certificate_issued boolean DEFAULT false NOT NULL,
    is_paid boolean DEFAULT false NOT NULL,
    stipend_amount numeric(10,2),
    stipend_currency text DEFAULT 'INR'::text NOT NULL,
    offer_received boolean DEFAULT false NOT NULL,
    offer_package numeric(12,2),
    feedback text,
    naac_criterion text DEFAULT '1.2'::text NOT NULL,
    nirf_category text DEFAULT '5.2'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: iqac_action_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.iqac_action_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meeting_id uuid NOT NULL,
    description text NOT NULL,
    assigned_to uuid,
    due_date date,
    status text DEFAULT 'open'::text NOT NULL,
    resolved_at timestamp with time zone,
    remarks text,
    CONSTRAINT iqac_action_items_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'completed'::text, 'deferred'::text])))
);


--
-- Name: iqac_meetings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.iqac_meetings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    academic_year_id uuid,
    meeting_date date NOT NULL,
    meeting_number integer NOT NULL,
    agenda text NOT NULL,
    minutes text,
    chaired_by uuid,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT iqac_meetings_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'completed'::text, 'minutes_pending'::text])))
);


--
-- Name: job_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    job_posting_id uuid NOT NULL,
    applicant_name text NOT NULL,
    applicant_email text NOT NULL,
    applicant_phone text,
    current_employer text,
    experience_years numeric(4,1),
    qualifications text,
    cv_url text,
    status text DEFAULT 'applied'::text NOT NULL,
    interview_date timestamp with time zone,
    interview_notes text,
    offer_date date,
    offer_details text,
    admin_notes text,
    converted_staff_id uuid,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT job_applications_status_check CHECK ((status = ANY (ARRAY['applied'::text, 'screened'::text, 'interview'::text, 'offer'::text, 'joined'::text, 'rejected'::text])))
);


--
-- Name: job_postings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_postings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    title text NOT NULL,
    department_id uuid,
    employment_type text DEFAULT 'full_time'::text NOT NULL,
    experience_years integer,
    qualifications text,
    description text,
    deadline date,
    vacancies integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT job_postings_employment_type_check CHECK ((employment_type = ANY (ARRAY['full_time'::text, 'part_time'::text, 'contract'::text, 'visiting'::text]))),
    CONSTRAINT job_postings_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text, 'on_hold'::text])))
);


--
-- Name: laboratories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.laboratories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    department_id uuid,
    name text NOT NULL,
    lab_type text NOT NULL,
    capacity integer,
    lab_assistant_id uuid,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT laboratories_lab_type_check CHECK ((lab_type = ANY (ARRAY['physics'::text, 'chemistry'::text, 'botany'::text, 'zoology'::text, 'biotech'::text, 'computer_science'::text, 'other'::text])))
);


--
-- Name: laboratory_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.laboratory_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    student_id uuid NOT NULL,
    is_present boolean DEFAULT true NOT NULL,
    marks_secured numeric(4,2),
    remarks text
);


--
-- Name: laboratory_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.laboratory_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    laboratory_id uuid NOT NULL,
    name text NOT NULL,
    year_semester text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: laboratory_experiments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.laboratory_experiments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    laboratory_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    requirements jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: laboratory_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.laboratory_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    laboratory_batch_id uuid NOT NULL,
    experiment_id uuid NOT NULL,
    session_date date DEFAULT CURRENT_DATE NOT NULL,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    leave_type text NOT NULL,
    from_date date NOT NULL,
    to_date date NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    review_note text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT leave_requests_leave_type_check CHECK ((leave_type = ANY (ARRAY['sick'::text, 'casual'::text, 'earned'::text, 'maternity'::text, 'paternity'::text, 'other'::text]))),
    CONSTRAINT leave_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: lesson_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    curriculum_unit_id uuid,
    academic_year_id uuid,
    lesson_date date NOT NULL,
    topic_covered text NOT NULL,
    teaching_method text,
    hours_covered numeric(4,1) DEFAULT 1 NOT NULL,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: library_books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.library_books (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    department_id uuid,
    title text NOT NULL,
    author text NOT NULL,
    isbn text,
    category text NOT NULL,
    total_copies integer DEFAULT 1 NOT NULL,
    available_copies integer DEFAULT 1 NOT NULL,
    published_year integer,
    publisher text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: library_lendings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.library_lendings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    book_id uuid NOT NULL,
    borrower_id uuid NOT NULL,
    borrower_type text DEFAULT 'student'::text NOT NULL,
    issued_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date NOT NULL,
    returned_date date,
    fine_amount numeric(6,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'issued'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT library_lendings_borrower_type_check CHECK ((borrower_type = ANY (ARRAY['student'::text, 'staff'::text]))),
    CONSTRAINT library_lendings_status_check CHECK ((status = ANY (ARRAY['issued'::text, 'returned'::text, 'overdue'::text, 'lost'::text])))
);


--
-- Name: lms_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lms_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    academic_year_id uuid,
    title text NOT NULL,
    description text,
    due_date timestamp with time zone NOT NULL,
    max_marks integer DEFAULT 10 NOT NULL,
    allow_late boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lms_assignments_max_marks_check CHECK ((max_marks > 0))
);


--
-- Name: lms_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lms_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    student_id uuid NOT NULL,
    file_url text,
    notes text,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    is_late boolean DEFAULT false NOT NULL,
    marks_awarded numeric(5,2),
    feedback text,
    graded_by uuid,
    graded_at timestamp with time zone
);


--
-- Name: medical_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    student_id uuid NOT NULL,
    blood_group text,
    known_allergies text,
    chronic_conditions text,
    emergency_contact_name text,
    emergency_contact_phone text,
    insurance_policy text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: medical_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_visits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    patient_type text NOT NULL,
    visit_date timestamp with time zone DEFAULT now() NOT NULL,
    symptoms text NOT NULL,
    diagnosis text,
    treatment_given text,
    medicines_dispensed jsonb,
    referred_to text,
    follow_up_date date,
    attended_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT medical_visits_patient_type_check CHECK ((patient_type = ANY (ARRAY['student'::text, 'staff'::text])))
);


--
-- Name: mess_billing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mess_billing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    student_id uuid NOT NULL,
    hostel_id uuid NOT NULL,
    month text NOT NULL,
    plan_type text NOT NULL,
    amount numeric(8,2) NOT NULL,
    is_paid boolean DEFAULT false NOT NULL,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mess_billing_plan_type_check CHECK ((plan_type = ANY (ARRAY['full'::text, 'veg_only'::text, 'non_veg'::text, 'custom'::text])))
);


--
-- Name: mess_menu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mess_menu (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hostel_id uuid NOT NULL,
    day_of_week text NOT NULL,
    meal_type text NOT NULL,
    menu_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mess_menu_day_of_week_check CHECK ((day_of_week = ANY (ARRAY['Monday'::text, 'Tuesday'::text, 'Wednesday'::text, 'Thursday'::text, 'Friday'::text, 'Saturday'::text, 'Sunday'::text]))),
    CONSTRAINT mess_menu_meal_type_check CHECK ((meal_type = ANY (ARRAY['breakfast'::text, 'lunch'::text, 'snacks'::text, 'dinner'::text])))
);


--
-- Name: monthly_pl; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.monthly_pl WITH (security_invoker='true') AS
 SELECT fp.institution_id,
    (date_trunc('month'::text, fp.paid_at))::date AS month,
    sum(fp.amount_paid) AS total_income,
    COALESCE(e_agg.total_expenses, (0)::numeric) AS total_expenses,
    (sum(fp.amount_paid) - COALESCE(e_agg.total_expenses, (0)::numeric)) AS net
   FROM (public.fee_payments fp
     LEFT JOIN ( SELECT expenses.institution_id,
            (date_trunc('month'::text, (expenses.expense_date)::timestamp with time zone))::date AS month,
            sum(expenses.amount) AS total_expenses
           FROM public.expenses
          GROUP BY expenses.institution_id, ((date_trunc('month'::text, (expenses.expense_date)::timestamp with time zone))::date)) e_agg ON (((e_agg.institution_id = fp.institution_id) AND (e_agg.month = (date_trunc('month'::text, fp.paid_at))::date))))
  WHERE (fp.payment_status = 'completed'::text)
  GROUP BY fp.institution_id, ((date_trunc('month'::text, fp.paid_at))::date), e_agg.total_expenses;


--
-- Name: monthly_statutory_deductions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_statutory_deductions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    salary_disbursement_id uuid,
    month text NOT NULL,
    gross_salary numeric(10,2) NOT NULL,
    basic_salary numeric(10,2) NOT NULL,
    tds_deducted numeric(10,2) DEFAULT 0 NOT NULL,
    pf_employee numeric(10,2) DEFAULT 0 NOT NULL,
    pf_employer numeric(10,2) DEFAULT 0 NOT NULL,
    esi_employee numeric(10,2) DEFAULT 0 NOT NULL,
    esi_employer numeric(10,2) DEFAULT 0 NOT NULL,
    net_salary numeric(10,2) NOT NULL,
    tax_regime text DEFAULT 'new'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT monthly_statutory_deductions_tax_regime_check CHECK ((tax_regime = ANY (ARRAY['old'::text, 'new'::text])))
);


--
-- Name: mou_partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mou_partners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    partner_name text NOT NULL,
    partner_type text NOT NULL,
    mou_date date NOT NULL,
    validity_years integer DEFAULT 3 NOT NULL,
    expiry_date date NOT NULL,
    purpose text NOT NULL,
    activities jsonb DEFAULT '[]'::jsonb NOT NULL,
    contact_person text,
    contact_email text,
    mou_document_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mou_partners_partner_type_check CHECK ((partner_type = ANY (ARRAY['industry'::text, 'university'::text, 'government'::text, 'ngo'::text, 'research_institute'::text]))),
    CONSTRAINT mou_partners_validity_years_check CHECK ((validity_years > 0))
);


--
-- Name: notices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    notice_type text NOT NULL,
    target_audience text DEFAULT 'all'::text NOT NULL,
    department_id uuid,
    attachment_url text,
    is_pinned boolean DEFAULT false NOT NULL,
    expires_at date,
    posted_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notices_notice_type_check CHECK ((notice_type = ANY (ARRAY['academic'::text, 'exam'::text, 'holiday'::text, 'event'::text, 'emergency'::text, 'placement'::text, 'hostel'::text, 'transport'::text, 'general'::text]))),
    CONSTRAINT notices_target_audience_check CHECK ((target_audience = ANY (ARRAY['all'::text, 'students'::text, 'staff'::text, 'parents'::text, 'hostel'::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    data jsonb,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: online_exam_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.online_exam_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    question_id uuid NOT NULL,
    response jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    awarded_marks numeric DEFAULT 0 NOT NULL
);


--
-- Name: online_exam_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.online_exam_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    question_text text NOT NULL,
    question_type text DEFAULT 'mcq'::text NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    correct_keys jsonb DEFAULT '[]'::jsonb NOT NULL,
    marks integer DEFAULT 1 NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    CONSTRAINT online_exam_questions_marks_check CHECK ((marks > 0)),
    CONSTRAINT online_exam_questions_question_type_check CHECK ((question_type = ANY (ARRAY['mcq'::text, 'multi'::text, 'short'::text])))
);


--
-- Name: online_exam_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.online_exam_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    student_id uuid NOT NULL,
    session_token uuid DEFAULT gen_random_uuid() NOT NULL,
    status text DEFAULT 'in_progress'::text NOT NULL,
    score numeric,
    total_marks integer DEFAULT 0 NOT NULL,
    violation_count integer DEFAULT 0 NOT NULL,
    flagged boolean DEFAULT false NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone,
    CONSTRAINT online_exam_sessions_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'submitted'::text, 'auto_submitted'::text])))
);


--
-- Name: online_exam_violations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.online_exam_violations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    exam_id uuid NOT NULL,
    student_id uuid NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT online_exam_violations_type_check CHECK ((type = ANY (ARRAY['tab_switch'::text, 'fullscreen_exit'::text, 'copy_paste'::text])))
);


--
-- Name: online_exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.online_exams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    department_id uuid,
    title text NOT NULL,
    subject_name text,
    description text,
    duration_minutes integer DEFAULT 30 NOT NULL,
    total_marks integer DEFAULT 0 NOT NULL,
    pass_marks integer DEFAULT 0 NOT NULL,
    scheduled_start timestamp with time zone,
    scheduled_end timestamp with time zone,
    shuffle_questions boolean DEFAULT true NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT online_exams_duration_minutes_check CHECK ((duration_minutes > 0)),
    CONSTRAINT online_exams_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'closed'::text])))
);


--
-- Name: parent_student_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parent_student_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_id uuid NOT NULL,
    student_id uuid NOT NULL,
    relationship text DEFAULT 'parent'::text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT parent_student_links_relationship_check CHECK ((relationship = ANY (ARRAY['father'::text, 'mother'::text, 'guardian'::text, 'other'::text, 'parent'::text])))
);


--
-- Name: parents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: placement_drives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.placement_drives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    company_id uuid NOT NULL,
    academic_year_id uuid,
    drive_date date NOT NULL,
    job_role text NOT NULL,
    ctc_offered numeric(10,2),
    eligibility_criteria jsonb,
    process_stages jsonb,
    is_exclusive boolean DEFAULT true NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT placement_drives_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'ongoing'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: placement_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.placement_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    drive_id uuid NOT NULL,
    student_id uuid NOT NULL,
    stage_status text DEFAULT 'registered'::text NOT NULL,
    offer_ctc numeric(10,2),
    notes text,
    registered_at timestamp with time zone DEFAULT now() NOT NULL,
    placed_at timestamp with time zone,
    CONSTRAINT placement_registrations_stage_status_check CHECK ((stage_status = ANY (ARRAY['registered'::text, 'shortlisted'::text, 'interviewed'::text, 'offered'::text, 'rejected'::text, 'placed'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    email text,
    role text,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now(),
    student_program text,
    student_year smallint,
    department_id uuid,
    max_hours_per_week integer DEFAULT 20,
    phone text,
    CONSTRAINT profiles_student_track_check CHECK ((((student_program IS NULL) AND (student_year IS NULL)) OR ((student_program = ANY (ARRAY['UG'::text, 'PG'::text])) AND (student_year IS NOT NULL) AND (((student_program = 'UG'::text) AND ((student_year >= 1) AND (student_year <= 3))) OR ((student_program = 'PG'::text) AND ((student_year >= 1) AND (student_year <= 2)))))))
);


--
-- Name: COLUMN profiles.student_program; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.student_program IS 'UG or PG for students; NULL for staff';


--
-- Name: COLUMN profiles.student_year; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.student_year IS 'Study year: 1–3 for UG, 1–2 for PG';


--
-- Name: program_outcomes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_outcomes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    department_id uuid,
    code text NOT NULL,
    description text NOT NULL,
    display_order integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: promotion_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    academic_year_id uuid,
    academic_year_label text,
    run_by uuid,
    run_at timestamp with time zone DEFAULT now() NOT NULL,
    total_promoted integer DEFAULT 0 NOT NULL,
    total_held integer DEFAULT 0 NOT NULL,
    total_graduated integer DEFAULT 0 NOT NULL,
    can_rollback_until timestamp with time zone NOT NULL,
    rolled_back_at timestamp with time zone,
    rollback_snapshot jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: publications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    title text NOT NULL,
    pub_type text NOT NULL,
    journal_name text,
    publisher text,
    pub_year integer NOT NULL,
    doi text,
    scopus_indexed boolean DEFAULT false NOT NULL,
    ugc_listed boolean DEFAULT false NOT NULL,
    impact_factor numeric(6,3),
    authors jsonb,
    document_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT publications_pub_type_check CHECK ((pub_type = ANY (ARRAY['journal'::text, 'conference'::text, 'book'::text, 'book_chapter'::text, 'patent'::text, 'other'::text])))
);


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    department_id uuid,
    vendor_id uuid NOT NULL,
    po_number text NOT NULL,
    items jsonb NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    raised_by uuid,
    approved_by uuid,
    invoice_url text,
    received_at timestamp with time zone,
    paid_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT purchase_orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'received'::text, 'paid'::text, 'cancelled'::text])))
);


--
-- Name: razorpay_webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.razorpay_webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id text,
    event_type text,
    razorpay_order_id text,
    razorpay_payment_id text,
    institution_id uuid,
    fee_payment_id uuid,
    status text DEFAULT 'processing'::text NOT NULL,
    error_message text,
    payload jsonb,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    CONSTRAINT razorpay_webhook_events_status_check CHECK ((status = ANY (ARRAY['processing'::text, 'processed'::text, 'ignored'::text, 'rejected_signature'::text, 'error'::text])))
);


--
-- Name: research_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    title text NOT NULL,
    principal_investigator uuid,
    co_investigators jsonb,
    funding_agency text,
    funding_amount numeric(12,2),
    funding_spent numeric(12,2),
    start_date date,
    end_date date,
    status text DEFAULT 'ongoing'::text NOT NULL,
    department_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT research_projects_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'ongoing'::text, 'completed'::text, 'published'::text])))
);


--
-- Name: salary_disbursements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salary_disbursements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    salary_structure_id uuid,
    month text NOT NULL,
    amount_disbursed numeric(10,2) NOT NULL,
    payment_mode text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    disbursed_at timestamp with time zone,
    transaction_ref text,
    remarks text,
    processed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT salary_disbursements_amount_disbursed_check CHECK ((amount_disbursed >= (0)::numeric)),
    CONSTRAINT salary_disbursements_payment_mode_check CHECK ((payment_mode = ANY (ARRAY['bank_transfer'::text, 'cheque'::text, 'cash'::text, 'neft'::text, 'rtgs'::text]))),
    CONSTRAINT salary_disbursements_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processed'::text, 'failed'::text, 'on_hold'::text])))
);


--
-- Name: salary_disbursement_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.salary_disbursement_summary WITH (security_invoker='true') AS
 SELECT institution_id,
    month,
    count(*) AS total_staff,
    sum(amount_disbursed) AS total_disbursed,
    count(*) FILTER (WHERE (status = 'processed'::text)) AS processed_count,
    count(*) FILTER (WHERE (status = 'pending'::text)) AS pending_count,
    sum(amount_disbursed) FILTER (WHERE (status = 'processed'::text)) AS processed_amount
   FROM public.salary_disbursements
  GROUP BY institution_id, month;


--
-- Name: salary_structures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salary_structures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    basic_salary numeric(10,2) NOT NULL,
    hra numeric(10,2) DEFAULT 0 NOT NULL,
    ta numeric(10,2) DEFAULT 0 NOT NULL,
    da numeric(10,2) DEFAULT 0 NOT NULL,
    other_allowances numeric(10,2) DEFAULT 0 NOT NULL,
    pf_deduction numeric(10,2) DEFAULT 0 NOT NULL,
    esi_deduction numeric(10,2) DEFAULT 0 NOT NULL,
    tds_deduction numeric(10,2) DEFAULT 0 NOT NULL,
    other_deductions numeric(10,2) DEFAULT 0 NOT NULL,
    net_salary numeric(10,2) GENERATED ALWAYS AS (((((((((basic_salary + hra) + ta) + da) + other_allowances) - pf_deduction) - esi_deduction) - tds_deduction) - other_deductions)) STORED,
    effective_from date NOT NULL,
    effective_to date,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT salary_structures_basic_salary_check CHECK ((basic_salary >= (0)::numeric))
);


--
-- Name: scheduler_error_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduler_error_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid,
    endpoint text NOT NULL,
    error_kind text DEFAULT 'network'::text NOT NULL,
    status_code integer,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT scheduler_error_logs_error_kind_check CHECK ((error_kind = ANY (ARRAY['network'::text, 'timeout'::text, 'http_error'::text, 'invalid_response'::text])))
);


--
-- Name: schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    department_id uuid,
    subject_name text NOT NULL,
    staff_id uuid,
    day_of_week text,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'scheduled'::text,
    shift text DEFAULT 'DAY'::text,
    draft_schedule_id uuid,
    CONSTRAINT schedules_day_of_week_check CHECK ((day_of_week = ANY (ARRAY['Monday'::text, 'Tuesday'::text, 'Wednesday'::text, 'Thursday'::text, 'Friday'::text, 'Saturday'::text])))
);


--
-- Name: COLUMN schedules.draft_schedule_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedules.draft_schedule_id IS 'Links a schedule row to the draft that generated it, enabling clean replacement when a new schedule is published.';


--
-- Name: scholarship_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scholarship_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    scheme_id uuid NOT NULL,
    student_id uuid NOT NULL,
    academic_year_id uuid,
    application_date date DEFAULT CURRENT_DATE NOT NULL,
    documents_url jsonb,
    status text DEFAULT 'applied'::text NOT NULL,
    disbursed_amount numeric(10,2),
    disbursed_at timestamp with time zone,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT scholarship_applications_status_check CHECK ((status = ANY (ARRAY['applied'::text, 'verified'::text, 'approved'::text, 'rejected'::text, 'disbursed'::text])))
);


--
-- Name: scholarship_schemes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scholarship_schemes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    name text NOT NULL,
    scheme_type text NOT NULL,
    description text,
    eligibility_criteria jsonb,
    amount_per_student numeric(10,2),
    renewable boolean DEFAULT true NOT NULL,
    application_deadline date,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT scholarship_schemes_scheme_type_check CHECK ((scheme_type = ANY (ARRAY['government_central'::text, 'government_state'::text, 'institutional'::text, 'private'::text, 'sports'::text, 'merit'::text, 'minority'::text, 'sc_st_obc'::text])))
);


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text DEFAULT 'Default shift'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE shifts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.shifts IS 'Minimal shift/roster entity for tenant_users.shift_id; extend as needed. RLS intentionally omitted so FK resolution stays simple.';


--
-- Name: smart_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.smart_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    card_uid text NOT NULL,
    holder_type text NOT NULL,
    student_id uuid,
    staff_id uuid,
    issued_date date DEFAULT CURRENT_DATE NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    replaced_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT smart_cards_holder_chk CHECK ((((holder_type = 'student'::text) AND (student_id IS NOT NULL) AND (staff_id IS NULL)) OR ((holder_type = 'staff'::text) AND (staff_id IS NOT NULL) AND (student_id IS NULL)))),
    CONSTRAINT smart_cards_holder_type_check CHECK ((holder_type = ANY (ARRAY['student'::text, 'staff'::text]))),
    CONSTRAINT smart_cards_status_check CHECK ((status = ANY (ARRAY['active'::text, 'lost'::text, 'deactivated'::text, 'replaced'::text])))
);


--
-- Name: sports_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sports_achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    team_id uuid,
    student_id uuid,
    event_name text NOT NULL,
    level text NOT NULL,
    "position" text NOT NULL,
    event_date date NOT NULL,
    certificate_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sports_achievements_level_check CHECK ((level = ANY (ARRAY['inter_class'::text, 'inter_college'::text, 'district'::text, 'state'::text, 'national'::text, 'international'::text])))
);


--
-- Name: sports_facilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sports_facilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    name text NOT NULL,
    sport_type text NOT NULL,
    capacity integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sports_team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sports_team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    student_id uuid NOT NULL,
    "position" text,
    joined_at date DEFAULT CURRENT_DATE NOT NULL
);


--
-- Name: sports_teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sports_teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    sport_name text NOT NULL,
    team_category text NOT NULL,
    coach_id uuid,
    academic_year_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sports_teams_team_category_check CHECK ((team_category = ANY (ARRAY['men'::text, 'women'::text, 'mixed'::text])))
);


--
-- Name: staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    department_id uuid,
    full_name text NOT NULL,
    email text,
    phone text,
    employee_id text,
    designation text,
    employment_type text DEFAULT 'full_time'::text NOT NULL,
    qualification text,
    specialization text,
    joining_date date,
    is_active boolean DEFAULT true NOT NULL,
    profile_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    title text,
    max_hours_per_week integer DEFAULT 20,
    gender text,
    staff_type text DEFAULT 'teaching'::text NOT NULL,
    daily_wage_rate numeric(10,2) DEFAULT NULL::numeric,
    CONSTRAINT staff_employment_type_check CHECK ((employment_type = ANY (ARRAY['full_time'::text, 'part_time'::text, 'contract'::text, 'guest'::text]))),
    CONSTRAINT staff_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text]))),
    CONSTRAINT staff_max_hours_per_week_check CHECK (((max_hours_per_week > 0) AND (max_hours_per_week <= 40))),
    CONSTRAINT staff_staff_type_check CHECK ((staff_type = ANY (ARRAY['teaching'::text, 'non-teaching_office'::text, 'non-teaching_warden'::text, 'non-teaching_mess'::text, 'non-teaching_support'::text]))),
    CONSTRAINT staff_title_check CHECK ((title = ANY (ARRAY['Mr'::text, 'Mrs'::text, 'Ms'::text, 'Dr'::text, 'Prof'::text])))
);


--
-- Name: COLUMN staff.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.staff.title IS 'Honorific title: Mr, Mrs, Ms, Dr, Prof';


--
-- Name: COLUMN staff.max_hours_per_week; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.staff.max_hours_per_week IS 'Weekly teaching hour cap used by the auto-scheduler. Defaults to 20.';


--
-- Name: COLUMN staff.staff_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.staff.staff_type IS 'Role category: teaching staff or one of the non-teaching subtypes';


--
-- Name: COLUMN staff.daily_wage_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.staff.daily_wage_rate IS 'Daily wage for non-teaching_support staff; NULL for salaried staff';


--
-- Name: staff_appraisal_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_appraisal_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    appraisal_id uuid NOT NULL,
    activity_type text NOT NULL,
    title text NOT NULL,
    description text,
    date_of_activity date,
    document_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT staff_appraisal_activities_activity_type_check CHECK ((activity_type = ANY (ARRAY['paper_published'::text, 'conference'::text, 'fdp'::text, 'workshop'::text, 'award'::text, 'project'::text, 'patent'::text, 'other'::text])))
);


--
-- Name: staff_appraisals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_appraisals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    academic_year_id uuid,
    appraisal_period text NOT NULL,
    teaching_score numeric(4,2),
    research_score numeric(4,2),
    admin_score numeric(4,2),
    overall_score numeric(4,2),
    self_remarks text,
    feedback text,
    appraised_by uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    submitted_at timestamp with time zone,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT staff_appraisals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'submitted'::text, 'reviewed'::text, 'completed'::text])))
);


--
-- Name: staff_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    status text DEFAULT 'present'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT staff_attendance_status_check CHECK ((status = ANY (ARRAY['present'::text, 'absent'::text, 'on_leave'::text])))
);


--
-- Name: staff_career_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_career_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    event_type text NOT NULL,
    effective_date date NOT NULL,
    previous_value text,
    new_value text,
    order_number text,
    document_url text,
    remarks text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT staff_career_events_event_type_check CHECK ((event_type = ANY (ARRAY['joining'::text, 'confirmation'::text, 'promotion'::text, 'increment'::text, 'transfer'::text, 'resignation'::text, 'retirement'::text, 'termination'::text, 'other'::text])))
);


--
-- Name: staff_tax_declarations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_tax_declarations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    academic_year_id uuid,
    tax_regime text DEFAULT 'new'::text NOT NULL,
    declared_investments jsonb DEFAULT '{}'::jsonb,
    total_declared numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT staff_tax_declarations_tax_regime_check CHECK ((tax_regime = ANY (ARRAY['old'::text, 'new'::text])))
);


--
-- Name: statutory_payroll_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.statutory_payroll_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    pf_employer_pct numeric(5,2) DEFAULT 12.00 NOT NULL,
    pf_employee_pct numeric(5,2) DEFAULT 12.00 NOT NULL,
    epf_wage_ceiling numeric(10,2) DEFAULT 15000.00 NOT NULL,
    esi_employer_pct numeric(5,2) DEFAULT 3.25 NOT NULL,
    esi_employee_pct numeric(5,2) DEFAULT 0.75 NOT NULL,
    esi_wage_ceiling numeric(10,2) DEFAULT 21000.00 NOT NULL,
    tan_number text,
    pf_number text,
    esi_number text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: student_fee_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.student_fee_summary WITH (security_invoker='true') AS
 SELECT fs.institution_id AS tenant_id,
    fp.student_id,
    fs.academic_year_id,
    sum(fs.amount) AS total_due,
    COALESCE(sum(
        CASE
            WHEN (fp.payment_status = 'completed'::text) THEN fp.amount_paid
            ELSE (0)::numeric
        END), (0)::numeric) AS total_paid,
    (sum(fs.amount) - COALESCE(sum(
        CASE
            WHEN (fp.payment_status = 'completed'::text) THEN fp.amount_paid
            ELSE (0)::numeric
        END), (0)::numeric)) AS balance_due
   FROM (public.fee_structures fs
     LEFT JOIN public.fee_payments fp ON (((fp.fee_structure_id = fs.id) AND (fp.institution_id = fs.institution_id))))
  GROUP BY fs.institution_id, fp.student_id, fs.academic_year_id;


--
-- Name: student_outpasses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_outpasses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    student_id uuid NOT NULL,
    hostel_id uuid,
    reason text NOT NULL,
    destination text NOT NULL,
    out_time timestamp with time zone NOT NULL,
    expected_return timestamp with time zone NOT NULL,
    actual_return timestamp with time zone,
    approved_by uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT student_outpasses_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'returned'::text, 'overdue'::text])))
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    department_id uuid,
    full_name text NOT NULL,
    email text,
    phone text,
    roll_number text,
    register_number text,
    programme text DEFAULT 'UG'::text NOT NULL,
    batch_year integer,
    semester integer,
    section text,
    admission_date date,
    is_active boolean DEFAULT true NOT NULL,
    profile_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    student_program text,
    student_year integer,
    roll_no text,
    gender text,
    category text,
    is_pwd boolean DEFAULT false NOT NULL,
    is_graduated boolean DEFAULT false NOT NULL,
    CONSTRAINT students_category_check CHECK ((category = ANY (ARRAY['general'::text, 'obc'::text, 'sc'::text, 'st'::text, 'ews'::text, 'other'::text]))),
    CONSTRAINT students_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text]))),
    CONSTRAINT students_programme_check CHECK ((programme = ANY (ARRAY['UG'::text, 'PG'::text, 'MPhil'::text, 'PhD'::text, 'Diploma'::text, 'Certificate'::text])))
);


--
-- Name: study_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    curriculum_unit_id uuid,
    title text NOT NULL,
    material_type text NOT NULL,
    file_url text,
    external_url text,
    uploaded_by uuid,
    is_published boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT study_materials_material_type_check CHECK ((material_type = ANY (ARRAY['notes'::text, 'slides'::text, 'video_link'::text, 'scorm_package'::text, 'question_paper'::text, 'reference'::text])))
);


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    department_id uuid,
    institution_id uuid,
    code text,
    subject_type text DEFAULT 'theory'::text NOT NULL,
    semester integer,
    credits integer DEFAULT 3 NOT NULL,
    hours_per_week integer DEFAULT 5 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subjects_subject_type_check CHECK ((subject_type = ANY (ARRAY['theory'::text, 'lab'::text, 'elective'::text, 'project'::text])))
);


--
-- Name: subscription_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    invoice_number text NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    razorpay_payment_id text,
    invoice_pdf_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscription_invoices_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT subscription_invoices_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text])))
);


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    price_monthly numeric(10,2) NOT NULL,
    price_annual numeric(10,2),
    max_students integer,
    max_staff integer,
    features jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscription_plans_price_annual_check CHECK (((price_annual IS NULL) OR (price_annual >= (0)::numeric))),
    CONSTRAINT subscription_plans_price_monthly_check CHECK ((price_monthly >= (0)::numeric))
);


--
-- Name: syllabus_completion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.syllabus_completion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    curriculum_unit_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    institution_id uuid NOT NULL,
    academic_year_id uuid,
    completed_at date,
    completion_notes text,
    is_completed boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: teaching_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teaching_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    academic_year_id uuid,
    semester integer NOT NULL,
    is_primary boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transport_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    bus_route_id uuid NOT NULL,
    student_id uuid NOT NULL,
    boarding_stop text NOT NULL,
    academic_year_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    vehicle_number text NOT NULL,
    vehicle_type text DEFAULT 'bus'::text NOT NULL,
    capacity integer DEFAULT 40 NOT NULL,
    driver_name text NOT NULL,
    driver_phone text NOT NULL,
    driver_license text,
    insurance_expiry date,
    fitness_expiry date,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vehicles_capacity_check CHECK ((capacity > 0)),
    CONSTRAINT vehicles_vehicle_type_check CHECK ((vehicle_type = ANY (ARRAY['bus'::text, 'van'::text, 'mini_bus'::text])))
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    name text NOT NULL,
    gst_number text,
    category text NOT NULL,
    contact_person text,
    phone text,
    email text,
    address text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendors_category_check CHECK ((category = ANY (ARRAY['lab_equipment'::text, 'stationery'::text, 'furniture'::text, 'it_hardware'::text, 'software'::text, 'maintenance'::text, 'other'::text])))
);


--
-- Name: venue_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venue_bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    venue_id uuid NOT NULL,
    booked_by uuid NOT NULL,
    event_title text NOT NULL,
    purpose text,
    start_datetime timestamp with time zone NOT NULL,
    end_datetime timestamp with time zone NOT NULL,
    attendees_count integer,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT venue_bookings_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])))
);


--
-- Name: venues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    name text NOT NULL,
    venue_type text NOT NULL,
    capacity integer,
    amenities jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT venues_venue_type_check CHECK ((venue_type = ANY (ARRAY['auditorium'::text, 'seminar_hall'::text, 'lab'::text, 'conference_room'::text, 'ground'::text, 'other'::text])))
);


--
-- Name: visitor_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitor_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid NOT NULL,
    visitor_name text NOT NULL,
    visitor_phone text,
    id_proof_type text,
    id_proof_number text,
    purpose text NOT NULL,
    meeting_with uuid,
    vehicle_number text,
    check_in_time timestamp with time zone DEFAULT now() NOT NULL,
    check_out_time timestamp with time zone,
    status text DEFAULT 'checked_in'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT visitor_log_status_check CHECK ((status = ANY (ARRAY['checked_in'::text, 'checked_out'::text])))
);


--
-- Name: academic_events academic_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_events
    ADD CONSTRAINT academic_events_pkey PRIMARY KEY (id);


--
-- Name: academic_years academic_years_institution_id_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_institution_id_label_key UNIQUE (institution_id, label);


--
-- Name: academic_years academic_years_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_pkey PRIMARY KEY (id);


--
-- Name: admission_enquiries admission_enquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_enquiries
    ADD CONSTRAINT admission_enquiries_pkey PRIMARY KEY (id);


--
-- Name: admissions admissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_pkey PRIMARY KEY (id);


--
-- Name: alumni_announcements alumni_announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_announcements
    ADD CONSTRAINT alumni_announcements_pkey PRIMARY KEY (id);


--
-- Name: alumni alumni_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni
    ADD CONSTRAINT alumni_pkey PRIMARY KEY (id);


--
-- Name: asset_allocations asset_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_allocations
    ADD CONSTRAINT asset_allocations_pkey PRIMARY KEY (id);


--
-- Name: asset_categories asset_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_categories
    ADD CONSTRAINT asset_categories_pkey PRIMARY KEY (id);


--
-- Name: asset_maintenance_logs asset_maintenance_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_maintenance_logs
    ADD CONSTRAINT asset_maintenance_logs_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: attendance_audit attendance_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_audit
    ADD CONSTRAINT attendance_audit_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: budget_line_items budget_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_line_items
    ADD CONSTRAINT budget_line_items_pkey PRIMARY KEY (id);


--
-- Name: bus_routes bus_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bus_routes
    ADD CONSTRAINT bus_routes_pkey PRIMARY KEY (id);


--
-- Name: campus_events campus_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campus_events
    ADD CONSTRAINT campus_events_pkey PRIMARY KEY (id);


--
-- Name: certificate_requests certificate_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_requests
    ADD CONSTRAINT certificate_requests_pkey PRIMARY KEY (id);


--
-- Name: cia_component_outcomes cia_component_outcomes_cia_component_id_course_outcome_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_component_outcomes
    ADD CONSTRAINT cia_component_outcomes_cia_component_id_course_outcome_id_key UNIQUE (cia_component_id, course_outcome_id);


--
-- Name: cia_component_outcomes cia_component_outcomes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_component_outcomes
    ADD CONSTRAINT cia_component_outcomes_pkey PRIMARY KEY (id);


--
-- Name: cia_components cia_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_components
    ADD CONSTRAINT cia_components_pkey PRIMARY KEY (id);


--
-- Name: cia_marks cia_marks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_marks
    ADD CONSTRAINT cia_marks_pkey PRIMARY KEY (id);


--
-- Name: cia_marks cia_marks_student_id_cia_component_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_marks
    ADD CONSTRAINT cia_marks_student_id_cia_component_id_key UNIQUE (student_id, cia_component_id);


--
-- Name: cia_results cia_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_results
    ADD CONSTRAINT cia_results_pkey PRIMARY KEY (id);


--
-- Name: class_schedules class_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_schedules
    ADD CONSTRAINT class_schedules_pkey PRIMARY KEY (id);


--
-- Name: co_po_map co_po_map_course_outcome_id_program_outcome_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.co_po_map
    ADD CONSTRAINT co_po_map_course_outcome_id_program_outcome_id_key UNIQUE (course_outcome_id, program_outcome_id);


--
-- Name: co_po_map co_po_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.co_po_map
    ADD CONSTRAINT co_po_map_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: course_outcomes course_outcomes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_outcomes
    ADD CONSTRAINT course_outcomes_pkey PRIMARY KEY (id);


--
-- Name: course_outcomes course_outcomes_subject_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_outcomes
    ADD CONSTRAINT course_outcomes_subject_id_code_key UNIQUE (subject_id, code);


--
-- Name: curriculum_units curriculum_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum_units
    ADD CONSTRAINT curriculum_units_pkey PRIMARY KEY (id);


--
-- Name: curriculum_units curriculum_units_subject_id_unit_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum_units
    ADD CONSTRAINT curriculum_units_subject_id_unit_number_key UNIQUE (subject_id, unit_number);


--
-- Name: data_consent_logs data_consent_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_consent_logs
    ADD CONSTRAINT data_consent_logs_pkey PRIMARY KEY (id);


--
-- Name: data_erasure_requests data_erasure_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_erasure_requests
    ADD CONSTRAINT data_erasure_requests_pkey PRIMARY KEY (id);


--
-- Name: department_budgets department_budgets_department_id_academic_year_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_budgets
    ADD CONSTRAINT department_budgets_department_id_academic_year_id_key UNIQUE (department_id, academic_year_id);


--
-- Name: department_budgets department_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_budgets
    ADD CONSTRAINT department_budgets_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: devices devices_device_uid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_device_uid_key UNIQUE (device_uid);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: disciplinary_actions disciplinary_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinary_actions
    ADD CONSTRAINT disciplinary_actions_pkey PRIMARY KEY (id);


--
-- Name: disciplinary_incidents disciplinary_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinary_incidents
    ADD CONSTRAINT disciplinary_incidents_pkey PRIMARY KEY (id);


--
-- Name: draft_schedules draft_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_schedules
    ADD CONSTRAINT draft_schedules_pkey PRIMARY KEY (id);


--
-- Name: event_participants event_participants_event_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_event_id_student_id_key UNIQUE (event_id, student_id);


--
-- Name: event_participants event_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_pkey PRIMARY KEY (id);


--
-- Name: exam_schedules exam_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: fee_concessions fee_concessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_concessions
    ADD CONSTRAINT fee_concessions_pkey PRIMARY KEY (id);


--
-- Name: fee_demands fee_demands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_demands
    ADD CONSTRAINT fee_demands_pkey PRIMARY KEY (id);


--
-- Name: fee_demands fee_demands_student_id_fee_structure_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_demands
    ADD CONSTRAINT fee_demands_student_id_fee_structure_id_key UNIQUE (student_id, fee_structure_id);


--
-- Name: fee_payments fee_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_pkey PRIMARY KEY (id);


--
-- Name: fee_payments fee_payments_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_receipt_number_key UNIQUE (receipt_number);


--
-- Name: fee_structures fee_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_pkey PRIMARY KEY (id);


--
-- Name: feedback_forms feedback_forms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_forms
    ADD CONSTRAINT feedback_forms_pkey PRIMARY KEY (id);


--
-- Name: feedback_responses feedback_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_responses
    ADD CONSTRAINT feedback_responses_pkey PRIMARY KEY (id);


--
-- Name: feedback_submissions feedback_submissions_form_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_submissions
    ADD CONSTRAINT feedback_submissions_form_id_student_id_key UNIQUE (form_id, student_id);


--
-- Name: feedback_submissions feedback_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_submissions
    ADD CONSTRAINT feedback_submissions_pkey PRIMARY KEY (id);


--
-- Name: grievances grievances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grievances
    ADD CONSTRAINT grievances_pkey PRIMARY KEY (id);


--
-- Name: guest_lectures guest_lectures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_lectures
    ADD CONSTRAINT guest_lectures_pkey PRIMARY KEY (id);


--
-- Name: hostel_allocations hostel_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_allocations
    ADD CONSTRAINT hostel_allocations_pkey PRIMARY KEY (id);


--
-- Name: hostel_announcements hostel_announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_announcements
    ADD CONSTRAINT hostel_announcements_pkey PRIMARY KEY (id);


--
-- Name: hostel_maintenance_requests hostel_maintenance_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_maintenance_requests
    ADD CONSTRAINT hostel_maintenance_requests_pkey PRIMARY KEY (id);


--
-- Name: hostel_rooms hostel_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_rooms
    ADD CONSTRAINT hostel_rooms_pkey PRIMARY KEY (id);


--
-- Name: hostels hostels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostels
    ADD CONSTRAINT hostels_pkey PRIMARY KEY (id);


--
-- Name: industry_interactions industry_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_interactions
    ADD CONSTRAINT industry_interactions_pkey PRIMARY KEY (id);


--
-- Name: institution_subscriptions institution_subscriptions_institution_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_subscriptions
    ADD CONSTRAINT institution_subscriptions_institution_id_key UNIQUE (institution_id);


--
-- Name: institution_subscriptions institution_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_subscriptions
    ADD CONSTRAINT institution_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: institutions institutions_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_slug_unique UNIQUE (slug);


--
-- Name: internships internships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internships
    ADD CONSTRAINT internships_pkey PRIMARY KEY (id);


--
-- Name: iqac_action_items iqac_action_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iqac_action_items
    ADD CONSTRAINT iqac_action_items_pkey PRIMARY KEY (id);


--
-- Name: iqac_meetings iqac_meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iqac_meetings
    ADD CONSTRAINT iqac_meetings_pkey PRIMARY KEY (id);


--
-- Name: job_applications job_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_pkey PRIMARY KEY (id);


--
-- Name: job_postings job_postings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_pkey PRIMARY KEY (id);


--
-- Name: laboratories laboratories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratories
    ADD CONSTRAINT laboratories_pkey PRIMARY KEY (id);


--
-- Name: laboratory_attendance laboratory_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratory_attendance
    ADD CONSTRAINT laboratory_attendance_pkey PRIMARY KEY (id);


--
-- Name: laboratory_attendance laboratory_attendance_session_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratory_attendance
    ADD CONSTRAINT laboratory_attendance_session_id_student_id_key UNIQUE (session_id, student_id);


--
-- Name: laboratory_batches laboratory_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratory_batches
    ADD CONSTRAINT laboratory_batches_pkey PRIMARY KEY (id);


--
-- Name: laboratory_experiments laboratory_experiments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratory_experiments
    ADD CONSTRAINT laboratory_experiments_pkey PRIMARY KEY (id);


--
-- Name: laboratory_sessions laboratory_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratory_sessions
    ADD CONSTRAINT laboratory_sessions_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: lesson_plans lesson_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_plans
    ADD CONSTRAINT lesson_plans_pkey PRIMARY KEY (id);


--
-- Name: library_books library_books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_books
    ADD CONSTRAINT library_books_pkey PRIMARY KEY (id);


--
-- Name: library_lendings library_lendings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_lendings
    ADD CONSTRAINT library_lendings_pkey PRIMARY KEY (id);


--
-- Name: lms_assignments lms_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_assignments
    ADD CONSTRAINT lms_assignments_pkey PRIMARY KEY (id);


--
-- Name: lms_submissions lms_submissions_assignment_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_submissions
    ADD CONSTRAINT lms_submissions_assignment_id_student_id_key UNIQUE (assignment_id, student_id);


--
-- Name: lms_submissions lms_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_submissions
    ADD CONSTRAINT lms_submissions_pkey PRIMARY KEY (id);


--
-- Name: medical_records medical_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_pkey PRIMARY KEY (id);


--
-- Name: medical_records medical_records_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_student_id_key UNIQUE (student_id);


--
-- Name: medical_visits medical_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_visits
    ADD CONSTRAINT medical_visits_pkey PRIMARY KEY (id);


--
-- Name: mess_billing mess_billing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mess_billing
    ADD CONSTRAINT mess_billing_pkey PRIMARY KEY (id);


--
-- Name: mess_billing mess_billing_student_id_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mess_billing
    ADD CONSTRAINT mess_billing_student_id_month_key UNIQUE (student_id, month);


--
-- Name: mess_menu mess_menu_hostel_id_day_of_week_meal_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mess_menu
    ADD CONSTRAINT mess_menu_hostel_id_day_of_week_meal_type_key UNIQUE (hostel_id, day_of_week, meal_type);


--
-- Name: mess_menu mess_menu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mess_menu
    ADD CONSTRAINT mess_menu_pkey PRIMARY KEY (id);


--
-- Name: monthly_statutory_deductions monthly_statutory_deductions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_statutory_deductions
    ADD CONSTRAINT monthly_statutory_deductions_pkey PRIMARY KEY (id);


--
-- Name: monthly_statutory_deductions monthly_statutory_deductions_staff_month_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_statutory_deductions
    ADD CONSTRAINT monthly_statutory_deductions_staff_month_unique UNIQUE (staff_id, month);


--
-- Name: mou_partners mou_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mou_partners
    ADD CONSTRAINT mou_partners_pkey PRIMARY KEY (id);


--
-- Name: notices notices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: online_exam_answers online_exam_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_exam_answers
    ADD CONSTRAINT online_exam_answers_pkey PRIMARY KEY (id);


--
-- Name: online_exam_answers online_exam_answers_session_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_exam_answers
    ADD CONSTRAINT online_exam_answers_session_id_question_id_key UNIQUE (session_id, question_id);


--
-- Name: online_exam_questions online_exam_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_exam_questions
    ADD CONSTRAINT online_exam_questions_pkey PRIMARY KEY (id);


--
-- Name: online_exam_sessions online_exam_sessions_exam_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_exam_sessions
    ADD CONSTRAINT online_exam_sessions_exam_id_student_id_key UNIQUE (exam_id, student_id);


--
-- Name: online_exam_sessions online_exam_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_exam_sessions
    ADD CONSTRAINT online_exam_sessions_pkey PRIMARY KEY (id);


--
-- Name: online_exam_violations online_exam_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_exam_violations
    ADD CONSTRAINT online_exam_violations_pkey PRIMARY KEY (id);


--
-- Name: online_exams online_exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_exams
    ADD CONSTRAINT online_exams_pkey PRIMARY KEY (id);


--
-- Name: parent_student_links parent_student_links_parent_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parent_student_links
    ADD CONSTRAINT parent_student_links_parent_id_student_id_key UNIQUE (parent_id, student_id);


--
-- Name: parent_student_links parent_student_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parent_student_links
    ADD CONSTRAINT parent_student_links_pkey PRIMARY KEY (id);


--
-- Name: parents parents_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parents
    ADD CONSTRAINT parents_email_key UNIQUE (email);


--
-- Name: parents parents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parents
    ADD CONSTRAINT parents_pkey PRIMARY KEY (id);


--
-- Name: placement_drives placement_drives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_drives
    ADD CONSTRAINT placement_drives_pkey PRIMARY KEY (id);


--
-- Name: placement_registrations placement_registrations_drive_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_registrations
    ADD CONSTRAINT placement_registrations_drive_id_student_id_key UNIQUE (drive_id, student_id);


--
-- Name: placement_registrations placement_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_registrations
    ADD CONSTRAINT placement_registrations_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: program_outcomes program_outcomes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_outcomes
    ADD CONSTRAINT program_outcomes_pkey PRIMARY KEY (id);


--
-- Name: promotion_logs promotion_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_logs
    ADD CONSTRAINT promotion_logs_pkey PRIMARY KEY (id);


--
-- Name: publications publications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publications
    ADD CONSTRAINT publications_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_institution_id_po_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_institution_id_po_number_key UNIQUE (institution_id, po_number);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: razorpay_webhook_events razorpay_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razorpay_webhook_events
    ADD CONSTRAINT razorpay_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: research_projects research_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_projects
    ADD CONSTRAINT research_projects_pkey PRIMARY KEY (id);


--
-- Name: salary_disbursements salary_disbursements_institution_id_staff_id_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_disbursements
    ADD CONSTRAINT salary_disbursements_institution_id_staff_id_month_key UNIQUE (institution_id, staff_id, month);


--
-- Name: salary_disbursements salary_disbursements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_disbursements
    ADD CONSTRAINT salary_disbursements_pkey PRIMARY KEY (id);


--
-- Name: salary_structures salary_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_structures
    ADD CONSTRAINT salary_structures_pkey PRIMARY KEY (id);


--
-- Name: scheduler_error_logs scheduler_error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduler_error_logs
    ADD CONSTRAINT scheduler_error_logs_pkey PRIMARY KEY (id);


--
-- Name: schedules schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_pkey PRIMARY KEY (id);


--
-- Name: scholarship_applications scholarship_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_applications
    ADD CONSTRAINT scholarship_applications_pkey PRIMARY KEY (id);


--
-- Name: scholarship_applications scholarship_applications_scheme_id_student_id_academic_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_applications
    ADD CONSTRAINT scholarship_applications_scheme_id_student_id_academic_year_key UNIQUE (scheme_id, student_id, academic_year_id);


--
-- Name: scholarship_schemes scholarship_schemes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_schemes
    ADD CONSTRAINT scholarship_schemes_pkey PRIMARY KEY (id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: smart_cards smart_cards_card_uid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smart_cards
    ADD CONSTRAINT smart_cards_card_uid_key UNIQUE (card_uid);


--
-- Name: smart_cards smart_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smart_cards
    ADD CONSTRAINT smart_cards_pkey PRIMARY KEY (id);


--
-- Name: sports_achievements sports_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports_achievements
    ADD CONSTRAINT sports_achievements_pkey PRIMARY KEY (id);


--
-- Name: sports_facilities sports_facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports_facilities
    ADD CONSTRAINT sports_facilities_pkey PRIMARY KEY (id);


--
-- Name: sports_team_members sports_team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports_team_members
    ADD CONSTRAINT sports_team_members_pkey PRIMARY KEY (id);


--
-- Name: sports_team_members sports_team_members_team_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports_team_members
    ADD CONSTRAINT sports_team_members_team_id_student_id_key UNIQUE (team_id, student_id);


--
-- Name: sports_teams sports_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports_teams
    ADD CONSTRAINT sports_teams_pkey PRIMARY KEY (id);


--
-- Name: staff_appraisal_activities staff_appraisal_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_appraisal_activities
    ADD CONSTRAINT staff_appraisal_activities_pkey PRIMARY KEY (id);


--
-- Name: staff_appraisals staff_appraisals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_appraisals
    ADD CONSTRAINT staff_appraisals_pkey PRIMARY KEY (id);


--
-- Name: staff_appraisals staff_appraisals_staff_id_appraisal_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_appraisals
    ADD CONSTRAINT staff_appraisals_staff_id_appraisal_period_key UNIQUE (staff_id, appraisal_period);


--
-- Name: staff_attendance staff_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_pkey PRIMARY KEY (id);


--
-- Name: staff_attendance staff_attendance_staff_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_staff_id_date_key UNIQUE (staff_id, date);


--
-- Name: staff_career_events staff_career_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_career_events
    ADD CONSTRAINT staff_career_events_pkey PRIMARY KEY (id);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: staff_tax_declarations staff_tax_declarations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_tax_declarations
    ADD CONSTRAINT staff_tax_declarations_pkey PRIMARY KEY (id);


--
-- Name: staff_tax_declarations staff_tax_declarations_staff_year_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_tax_declarations
    ADD CONSTRAINT staff_tax_declarations_staff_year_unique UNIQUE (staff_id, academic_year_id);


--
-- Name: statutory_payroll_config statutory_payroll_config_institution_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statutory_payroll_config
    ADD CONSTRAINT statutory_payroll_config_institution_unique UNIQUE (institution_id);


--
-- Name: statutory_payroll_config statutory_payroll_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statutory_payroll_config
    ADD CONSTRAINT statutory_payroll_config_pkey PRIMARY KEY (id);


--
-- Name: student_outpasses student_outpasses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_outpasses
    ADD CONSTRAINT student_outpasses_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: study_materials study_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_materials
    ADD CONSTRAINT study_materials_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_institution_id_department_id_code_semester_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_institution_id_department_id_code_semester_key UNIQUE (institution_id, department_id, code, semester);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: subscription_invoices subscription_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoices
    ADD CONSTRAINT subscription_invoices_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_name_key UNIQUE (name);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: syllabus_completion syllabus_completion_curriculum_unit_id_staff_id_academic_ye_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_completion
    ADD CONSTRAINT syllabus_completion_curriculum_unit_id_staff_id_academic_ye_key UNIQUE (curriculum_unit_id, staff_id, academic_year_id);


--
-- Name: syllabus_completion syllabus_completion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_completion
    ADD CONSTRAINT syllabus_completion_pkey PRIMARY KEY (id);


--
-- Name: teaching_assignments teaching_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_assignments
    ADD CONSTRAINT teaching_assignments_pkey PRIMARY KEY (id);


--
-- Name: teaching_assignments teaching_assignments_staff_id_subject_id_academic_year_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_assignments
    ADD CONSTRAINT teaching_assignments_staff_id_subject_id_academic_year_id_key UNIQUE (staff_id, subject_id, academic_year_id);


--
-- Name: institution_members tenant_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_members
    ADD CONSTRAINT tenant_users_pkey PRIMARY KEY (id);


--
-- Name: institution_members tenant_users_profile_id_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_members
    ADD CONSTRAINT tenant_users_profile_id_tenant_id_key UNIQUE (profile_id, institution_id);


--
-- Name: institutions tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: institutions tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT tenants_slug_key UNIQUE (subdomain);


--
-- Name: transport_allocations transport_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_allocations
    ADD CONSTRAINT transport_allocations_pkey PRIMARY KEY (id);


--
-- Name: transport_allocations transport_allocations_student_id_academic_year_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_allocations
    ADD CONSTRAINT transport_allocations_student_id_academic_year_id_key UNIQUE (student_id, academic_year_id);


--
-- Name: vehicles vehicles_institution_id_vehicle_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_institution_id_vehicle_number_key UNIQUE (institution_id, vehicle_number);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: venue_bookings venue_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_pkey PRIMARY KEY (id);


--
-- Name: venues venues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_pkey PRIMARY KEY (id);


--
-- Name: visitor_log visitor_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_log
    ADD CONSTRAINT visitor_log_pkey PRIMARY KEY (id);


--
-- Name: academic_years_one_current_per_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX academic_years_one_current_per_institution ON public.academic_years USING btree (institution_id) WHERE (is_current = true);


--
-- Name: cia_results_student_scope_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cia_results_student_scope_uniq ON public.cia_results USING btree (institution_id, student_id, department_id, semester, academic_year_id) NULLS NOT DISTINCT;


--
-- Name: devices_profile_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX devices_profile_id_idx ON public.devices USING btree (profile_id);


--
-- Name: devices_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX devices_tenant_id_idx ON public.devices USING btree (tenant_id);


--
-- Name: idx_admissions_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admissions_email ON public.admissions USING btree (applicant_email);


--
-- Name: idx_admissions_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admissions_inst ON public.admissions USING btree (institution_id, status);


--
-- Name: idx_alumni_ann_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alumni_ann_inst ON public.alumni_announcements USING btree (institution_id, created_at DESC);


--
-- Name: idx_alumni_dept; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alumni_dept ON public.alumni USING btree (department_id);


--
-- Name: idx_alumni_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alumni_inst ON public.alumni USING btree (institution_id, graduation_year);


--
-- Name: idx_alumni_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alumni_profile ON public.alumni USING btree (profile_id);


--
-- Name: idx_appraisal_activities; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appraisal_activities ON public.staff_appraisal_activities USING btree (appraisal_id);


--
-- Name: idx_appraisals_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appraisals_inst ON public.staff_appraisals USING btree (institution_id, appraisal_period);


--
-- Name: idx_appraisals_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appraisals_staff ON public.staff_appraisals USING btree (staff_id);


--
-- Name: idx_asset_alloc_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_alloc_asset ON public.asset_allocations USING btree (asset_id);


--
-- Name: idx_asset_alloc_dept; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_alloc_dept ON public.asset_allocations USING btree (department_id);


--
-- Name: idx_asset_alloc_lab; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_alloc_lab ON public.asset_allocations USING btree (laboratory_id);


--
-- Name: idx_asset_categories_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_categories_inst ON public.asset_categories USING btree (institution_id);


--
-- Name: idx_asset_maint_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_maint_asset ON public.asset_maintenance_logs USING btree (asset_id);


--
-- Name: idx_assets_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_category ON public.assets USING btree (category_id);


--
-- Name: idx_assets_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_inst ON public.assets USING btree (institution_id);


--
-- Name: idx_audit_logs_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_institution ON public.audit_logs USING btree (institution_id, created_at DESC);


--
-- Name: idx_audit_logs_performed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_performed_by ON public.audit_logs USING btree (performed_by);


--
-- Name: idx_audit_logs_table_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_table_record ON public.audit_logs USING btree (table_name, record_id);


--
-- Name: idx_budget_line_items_budget; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_line_items_budget ON public.budget_line_items USING btree (budget_id);


--
-- Name: idx_bus_routes_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bus_routes_inst ON public.bus_routes USING btree (institution_id);


--
-- Name: idx_bus_routes_vehicle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bus_routes_vehicle ON public.bus_routes USING btree (vehicle_id);


--
-- Name: idx_campus_events_academic_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campus_events_academic_year ON public.campus_events USING btree (academic_year_id);


--
-- Name: idx_campus_events_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campus_events_date ON public.campus_events USING btree (event_date DESC);


--
-- Name: idx_campus_events_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campus_events_institution ON public.campus_events USING btree (institution_id);


--
-- Name: idx_campus_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campus_events_type ON public.campus_events USING btree (event_type);


--
-- Name: idx_cert_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cert_inst ON public.certificate_requests USING btree (institution_id);


--
-- Name: idx_cert_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cert_staff ON public.certificate_requests USING btree (staff_id);


--
-- Name: idx_cert_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cert_status ON public.certificate_requests USING btree (institution_id, status);


--
-- Name: idx_cert_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cert_student ON public.certificate_requests USING btree (student_id);


--
-- Name: idx_cia_results_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cia_results_scope ON public.cia_results USING btree (institution_id, department_id, semester);


--
-- Name: idx_companies_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_companies_inst ON public.companies USING btree (institution_id, name);


--
-- Name: idx_course_outcomes_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_outcomes_subject ON public.course_outcomes USING btree (institution_id, subject_id);


--
-- Name: idx_data_consent_logs_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_data_consent_logs_institution ON public.data_consent_logs USING btree (institution_id, consented_at DESC);


--
-- Name: idx_data_consent_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_data_consent_logs_user ON public.data_consent_logs USING btree (user_id, consent_type, consented_at DESC);


--
-- Name: idx_data_erasure_requests_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_data_erasure_requests_institution ON public.data_erasure_requests USING btree (institution_id, status, requested_at DESC);


--
-- Name: idx_data_erasure_requests_requester; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_data_erasure_requests_requester ON public.data_erasure_requests USING btree (requested_by);


--
-- Name: idx_dept_budgets_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dept_budgets_inst ON public.department_budgets USING btree (institution_id, academic_year_id);


--
-- Name: idx_disc_actions; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_disc_actions ON public.disciplinary_actions USING btree (incident_id);


--
-- Name: idx_disc_inc_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_disc_inc_inst ON public.disciplinary_incidents USING btree (institution_id, status);


--
-- Name: idx_disc_inc_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_disc_inc_student ON public.disciplinary_incidents USING btree (student_id);


--
-- Name: idx_disc_inc_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_disc_inc_type ON public.disciplinary_incidents USING btree (institution_id, incident_type);


--
-- Name: idx_drives_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drives_inst ON public.placement_drives USING btree (institution_id, drive_date DESC);


--
-- Name: idx_enquiries_followup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enquiries_followup ON public.admission_enquiries USING btree (institution_id, follow_up_date);


--
-- Name: idx_enquiries_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enquiries_inst ON public.admission_enquiries USING btree (institution_id, status);


--
-- Name: idx_event_participants_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_participants_event ON public.event_participants USING btree (event_id);


--
-- Name: idx_event_participants_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_participants_student ON public.event_participants USING btree (student_id);


--
-- Name: idx_exam_schedules_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_schedules_date ON public.exam_schedules USING btree (institution_id, exam_date);


--
-- Name: idx_exam_schedules_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_schedules_institution ON public.exam_schedules USING btree (institution_id);


--
-- Name: idx_expenses_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_category ON public.expenses USING btree (category);


--
-- Name: idx_expenses_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_date ON public.expenses USING btree (expense_date);


--
-- Name: idx_expenses_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_department ON public.expenses USING btree (department_id);


--
-- Name: idx_expenses_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_institution ON public.expenses USING btree (institution_id);


--
-- Name: idx_fee_demands_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_demands_due ON public.fee_demands USING btree (due_date);


--
-- Name: idx_fee_demands_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_demands_inst ON public.fee_demands USING btree (institution_id, status);


--
-- Name: idx_fee_demands_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_demands_student ON public.fee_demands USING btree (student_id);


--
-- Name: idx_fee_payments_demand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_payments_demand ON public.fee_payments USING btree (demand_id);


--
-- Name: idx_fee_payments_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_payments_institution ON public.fee_payments USING btree (institution_id);


--
-- Name: idx_fee_payments_paid_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_payments_paid_at ON public.fee_payments USING btree (paid_at);


--
-- Name: idx_fee_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_payments_status ON public.fee_payments USING btree (payment_status);


--
-- Name: idx_fee_payments_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_payments_student ON public.fee_payments USING btree (student_id);


--
-- Name: idx_fee_structures_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_structures_institution ON public.fee_structures USING btree (institution_id);


--
-- Name: idx_fform_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fform_inst ON public.feedback_forms USING btree (institution_id);


--
-- Name: idx_fform_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fform_staff ON public.feedback_forms USING btree (staff_id);


--
-- Name: idx_fresp_form; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fresp_form ON public.feedback_responses USING btree (form_id);


--
-- Name: idx_fsub_form; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fsub_form ON public.feedback_submissions USING btree (form_id);


--
-- Name: idx_grievances_assigned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grievances_assigned ON public.grievances USING btree (assigned_to);


--
-- Name: idx_grievances_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grievances_category ON public.grievances USING btree (institution_id, category);


--
-- Name: idx_grievances_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grievances_inst ON public.grievances USING btree (institution_id, status);


--
-- Name: idx_grievances_submitter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grievances_submitter ON public.grievances USING btree (submitted_by);


--
-- Name: idx_guest_lectures_academic_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guest_lectures_academic_year ON public.guest_lectures USING btree (academic_year_id);


--
-- Name: idx_guest_lectures_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guest_lectures_department_id ON public.guest_lectures USING btree (department_id);


--
-- Name: idx_guest_lectures_event_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guest_lectures_event_date ON public.guest_lectures USING btree (event_date);


--
-- Name: idx_guest_lectures_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guest_lectures_institution_id ON public.guest_lectures USING btree (institution_id);


--
-- Name: idx_hostel_alloc_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hostel_alloc_room ON public.hostel_allocations USING btree (room_id);


--
-- Name: idx_hostel_alloc_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hostel_alloc_student ON public.hostel_allocations USING btree (student_id);


--
-- Name: idx_hostel_ann_hostel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hostel_ann_hostel ON public.hostel_announcements USING btree (hostel_id, created_at DESC);


--
-- Name: idx_hostel_maint_hostel_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hostel_maint_hostel_status ON public.hostel_maintenance_requests USING btree (hostel_id, status);


--
-- Name: idx_hostel_maint_raiser; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hostel_maint_raiser ON public.hostel_maintenance_requests USING btree (raised_by);


--
-- Name: idx_hostel_rooms_hostel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hostel_rooms_hostel ON public.hostel_rooms USING btree (hostel_id, floor);


--
-- Name: idx_hostels_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hostels_inst ON public.hostels USING btree (institution_id);


--
-- Name: idx_iint_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iint_inst ON public.industry_interactions USING btree (institution_id);


--
-- Name: idx_iint_partner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iint_partner ON public.industry_interactions USING btree (mou_partner_id);


--
-- Name: idx_inst_sub_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inst_sub_plan ON public.institution_subscriptions USING btree (plan_id);


--
-- Name: idx_internships_academic_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internships_academic_year ON public.internships USING btree (academic_year_id);


--
-- Name: idx_internships_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internships_institution_id ON public.internships USING btree (institution_id);


--
-- Name: idx_internships_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internships_start_date ON public.internships USING btree (start_date);


--
-- Name: idx_internships_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internships_student_id ON public.internships USING btree (student_id);


--
-- Name: idx_internships_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internships_type ON public.internships USING btree (type);


--
-- Name: idx_iqac_action_mtg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iqac_action_mtg ON public.iqac_action_items USING btree (meeting_id);


--
-- Name: idx_iqac_mtg_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iqac_mtg_inst ON public.iqac_meetings USING btree (institution_id);


--
-- Name: idx_iqac_mtg_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iqac_mtg_year ON public.iqac_meetings USING btree (academic_year_id);


--
-- Name: idx_job_applications_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_applications_institution ON public.job_applications USING btree (institution_id, status);


--
-- Name: idx_job_applications_posting; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_applications_posting ON public.job_applications USING btree (job_posting_id, status);


--
-- Name: idx_job_postings_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_postings_institution ON public.job_postings USING btree (institution_id, status);


--
-- Name: idx_lab_attendance_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_attendance_session ON public.laboratory_attendance USING btree (session_id);


--
-- Name: idx_lab_attendance_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_attendance_student ON public.laboratory_attendance USING btree (student_id);


--
-- Name: idx_lab_batches_lab; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_batches_lab ON public.laboratory_batches USING btree (laboratory_id);


--
-- Name: idx_lab_experiments_lab; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_experiments_lab ON public.laboratory_experiments USING btree (laboratory_id);


--
-- Name: idx_lab_sessions_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_sessions_batch ON public.laboratory_sessions USING btree (laboratory_batch_id);


--
-- Name: idx_lab_sessions_experiment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_sessions_experiment ON public.laboratory_sessions USING btree (experiment_id);


--
-- Name: idx_laboratories_dept; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_laboratories_dept ON public.laboratories USING btree (department_id);


--
-- Name: idx_laboratories_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_laboratories_inst ON public.laboratories USING btree (institution_id);


--
-- Name: idx_lasn_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lasn_inst ON public.lms_assignments USING btree (institution_id);


--
-- Name: idx_lasn_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lasn_subject ON public.lms_assignments USING btree (subject_id);


--
-- Name: idx_leave_requests_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_institution ON public.leave_requests USING btree (institution_id);


--
-- Name: idx_leave_requests_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_staff ON public.leave_requests USING btree (staff_id);


--
-- Name: idx_leave_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_status ON public.leave_requests USING btree (status);


--
-- Name: idx_lesson_plans_academic_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_plans_academic_year ON public.lesson_plans USING btree (academic_year_id);


--
-- Name: idx_lesson_plans_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_plans_institution_id ON public.lesson_plans USING btree (institution_id);


--
-- Name: idx_lesson_plans_lesson_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_plans_lesson_date ON public.lesson_plans USING btree (lesson_date);


--
-- Name: idx_lesson_plans_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_plans_staff_id ON public.lesson_plans USING btree (staff_id);


--
-- Name: idx_lesson_plans_subject_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_plans_subject_id ON public.lesson_plans USING btree (subject_id);


--
-- Name: idx_library_books_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_library_books_inst ON public.library_books USING btree (institution_id);


--
-- Name: idx_library_lendings_book; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_library_lendings_book ON public.library_lendings USING btree (book_id);


--
-- Name: idx_library_lendings_borrower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_library_lendings_borrower ON public.library_lendings USING btree (borrower_id);


--
-- Name: idx_library_lendings_open; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_library_lendings_open ON public.library_lendings USING btree (institution_id, status);


--
-- Name: idx_lsub_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lsub_assignment ON public.lms_submissions USING btree (assignment_id);


--
-- Name: idx_lsub_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lsub_student ON public.lms_submissions USING btree (student_id);


--
-- Name: idx_medical_records_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medical_records_institution ON public.medical_records USING btree (institution_id);


--
-- Name: idx_medical_records_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medical_records_student ON public.medical_records USING btree (student_id);


--
-- Name: idx_medical_visits_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medical_visits_date ON public.medical_visits USING btree (visit_date DESC);


--
-- Name: idx_medical_visits_followup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medical_visits_followup ON public.medical_visits USING btree (follow_up_date) WHERE (follow_up_date IS NOT NULL);


--
-- Name: idx_medical_visits_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medical_visits_institution ON public.medical_visits USING btree (institution_id);


--
-- Name: idx_medical_visits_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medical_visits_patient ON public.medical_visits USING btree (patient_id);


--
-- Name: idx_mess_billing_hostel_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mess_billing_hostel_month ON public.mess_billing USING btree (hostel_id, month);


--
-- Name: idx_mess_billing_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mess_billing_student ON public.mess_billing USING btree (student_id);


--
-- Name: idx_mess_menu_hostel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mess_menu_hostel ON public.mess_menu USING btree (hostel_id);


--
-- Name: idx_mou_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mou_expiry ON public.mou_partners USING btree (institution_id, expiry_date);


--
-- Name: idx_mou_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mou_inst ON public.mou_partners USING btree (institution_id);


--
-- Name: idx_notices_inst_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notices_inst_active ON public.notices USING btree (institution_id, expires_at);


--
-- Name: idx_notices_inst_pinned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notices_inst_pinned ON public.notices USING btree (institution_id, is_pinned, created_at DESC);


--
-- Name: idx_notifications_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_id);


--
-- Name: idx_notifications_recipient_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_recipient_created ON public.notifications USING btree (recipient_id, created_at DESC);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (recipient_id, is_read);


--
-- Name: idx_oanswer_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oanswer_session ON public.online_exam_answers USING btree (session_id);


--
-- Name: idx_oexam_dept; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oexam_dept ON public.online_exams USING btree (department_id);


--
-- Name: idx_oexam_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oexam_inst ON public.online_exams USING btree (institution_id);


--
-- Name: idx_oquestion_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oquestion_exam ON public.online_exam_questions USING btree (exam_id);


--
-- Name: idx_osession_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_osession_exam ON public.online_exam_sessions USING btree (exam_id);


--
-- Name: idx_osession_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_osession_student ON public.online_exam_sessions USING btree (student_id);


--
-- Name: idx_outpass_hostel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outpass_hostel ON public.student_outpasses USING btree (hostel_id);


--
-- Name: idx_outpass_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outpass_inst ON public.student_outpasses USING btree (institution_id, status);


--
-- Name: idx_outpass_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outpass_student ON public.student_outpasses USING btree (student_id);


--
-- Name: idx_oviolation_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oviolation_session ON public.online_exam_violations USING btree (session_id);


--
-- Name: idx_parents_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parents_inst ON public.parents USING btree (institution_id);


--
-- Name: idx_parents_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parents_user ON public.parents USING btree (user_id);


--
-- Name: idx_po_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_inst ON public.purchase_orders USING btree (institution_id);


--
-- Name: idx_po_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_status ON public.purchase_orders USING btree (institution_id, status);


--
-- Name: idx_po_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_vendor ON public.purchase_orders USING btree (vendor_id);


--
-- Name: idx_promotion_logs_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promotion_logs_institution ON public.promotion_logs USING btree (institution_id, run_at DESC);


--
-- Name: idx_psl_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psl_parent ON public.parent_student_links USING btree (parent_id);


--
-- Name: idx_psl_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psl_student ON public.parent_student_links USING btree (student_id);


--
-- Name: idx_pub_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pub_inst ON public.publications USING btree (institution_id, pub_year);


--
-- Name: idx_pub_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pub_staff ON public.publications USING btree (staff_id);


--
-- Name: idx_razorpay_webhook_events_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_razorpay_webhook_events_order ON public.razorpay_webhook_events USING btree (razorpay_order_id);


--
-- Name: idx_razorpay_webhook_events_received; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_razorpay_webhook_events_received ON public.razorpay_webhook_events USING btree (received_at);


--
-- Name: idx_registrations_drive; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registrations_drive ON public.placement_registrations USING btree (drive_id);


--
-- Name: idx_registrations_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_registrations_student ON public.placement_registrations USING btree (student_id);


--
-- Name: idx_research_proj_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_proj_inst ON public.research_projects USING btree (institution_id, status);


--
-- Name: idx_research_proj_pi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_proj_pi ON public.research_projects USING btree (principal_investigator);


--
-- Name: idx_salary_disbursements_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_disbursements_institution ON public.salary_disbursements USING btree (institution_id);


--
-- Name: idx_salary_disbursements_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_disbursements_month ON public.salary_disbursements USING btree (month);


--
-- Name: idx_salary_disbursements_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_disbursements_status ON public.salary_disbursements USING btree (status);


--
-- Name: idx_salary_structures_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_structures_institution ON public.salary_structures USING btree (institution_id);


--
-- Name: idx_salary_structures_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_structures_staff ON public.salary_structures USING btree (staff_id);


--
-- Name: idx_scheduler_error_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduler_error_logs_created ON public.scheduler_error_logs USING btree (created_at DESC);


--
-- Name: idx_schemes_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schemes_inst ON public.scholarship_schemes USING btree (institution_id, scheme_type);


--
-- Name: idx_schol_apps_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schol_apps_inst ON public.scholarship_applications USING btree (institution_id, status);


--
-- Name: idx_schol_apps_scheme; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schol_apps_scheme ON public.scholarship_applications USING btree (scheme_id);


--
-- Name: idx_schol_apps_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schol_apps_student ON public.scholarship_applications USING btree (student_id);


--
-- Name: idx_shifts_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shifts_tenant_id ON public.shifts USING btree (tenant_id);


--
-- Name: idx_smart_cards_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_smart_cards_inst ON public.smart_cards USING btree (institution_id);


--
-- Name: idx_smart_cards_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_smart_cards_staff ON public.smart_cards USING btree (staff_id);


--
-- Name: idx_smart_cards_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_smart_cards_student ON public.smart_cards USING btree (student_id);


--
-- Name: idx_smart_cards_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_smart_cards_uid ON public.smart_cards USING btree (card_uid);


--
-- Name: idx_smat_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_smat_inst ON public.study_materials USING btree (institution_id);


--
-- Name: idx_smat_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_smat_subject ON public.study_materials USING btree (subject_id);


--
-- Name: idx_smat_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_smat_unit ON public.study_materials USING btree (curriculum_unit_id);


--
-- Name: idx_sports_achievements_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sports_achievements_date ON public.sports_achievements USING btree (event_date DESC);


--
-- Name: idx_sports_achievements_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sports_achievements_institution ON public.sports_achievements USING btree (institution_id);


--
-- Name: idx_sports_achievements_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sports_achievements_level ON public.sports_achievements USING btree (level);


--
-- Name: idx_sports_achievements_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sports_achievements_student ON public.sports_achievements USING btree (student_id);


--
-- Name: idx_sports_achievements_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sports_achievements_team ON public.sports_achievements USING btree (team_id);


--
-- Name: idx_sports_facilities_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sports_facilities_institution ON public.sports_facilities USING btree (institution_id);


--
-- Name: idx_sports_team_members_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sports_team_members_student ON public.sports_team_members USING btree (student_id);


--
-- Name: idx_sports_team_members_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sports_team_members_team ON public.sports_team_members USING btree (team_id);


--
-- Name: idx_sports_teams_academic_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sports_teams_academic_year ON public.sports_teams USING btree (academic_year_id);


--
-- Name: idx_sports_teams_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sports_teams_institution ON public.sports_teams USING btree (institution_id);


--
-- Name: idx_staff_att_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_att_inst ON public.staff_attendance USING btree (institution_id, date);


--
-- Name: idx_staff_att_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_att_staff ON public.staff_attendance USING btree (staff_id, date);


--
-- Name: idx_staff_attendance_inst_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_attendance_inst_date ON public.staff_attendance USING btree (institution_id, date DESC);


--
-- Name: idx_staff_career_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_career_inst ON public.staff_career_events USING btree (institution_id, effective_date);


--
-- Name: idx_staff_career_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_career_staff ON public.staff_career_events USING btree (staff_id, effective_date);


--
-- Name: idx_staff_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_department ON public.staff USING btree (department_id);


--
-- Name: idx_staff_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_email ON public.staff USING btree (email);


--
-- Name: idx_staff_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_institution ON public.staff USING btree (institution_id);


--
-- Name: idx_students_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_department ON public.students USING btree (department_id);


--
-- Name: idx_students_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_institution ON public.students USING btree (institution_id);


--
-- Name: idx_students_roll; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_roll ON public.students USING btree (roll_number);


--
-- Name: idx_sub_inv_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_inv_inst ON public.subscription_invoices USING btree (institution_id);


--
-- Name: idx_talloc_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_talloc_inst ON public.transport_allocations USING btree (institution_id);


--
-- Name: idx_talloc_route; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_talloc_route ON public.transport_allocations USING btree (bus_route_id);


--
-- Name: idx_talloc_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_talloc_student ON public.transport_allocations USING btree (student_id);


--
-- Name: idx_vehicles_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_inst ON public.vehicles USING btree (institution_id);


--
-- Name: idx_vendors_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_inst ON public.vendors USING btree (institution_id);


--
-- Name: idx_venue_bookings_booker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_venue_bookings_booker ON public.venue_bookings USING btree (booked_by);


--
-- Name: idx_venue_bookings_inst_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_venue_bookings_inst_status ON public.venue_bookings USING btree (institution_id, status);


--
-- Name: idx_venue_bookings_venue_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_venue_bookings_venue_time ON public.venue_bookings USING btree (venue_id, start_datetime, end_datetime);


--
-- Name: idx_venues_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_venues_inst ON public.venues USING btree (institution_id);


--
-- Name: idx_visitor_log_inst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitor_log_inst ON public.visitor_log USING btree (institution_id, status);


--
-- Name: ix_academic_events_academic_year_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_academic_events_academic_year_id ON public.academic_events USING btree (academic_year_id);


--
-- Name: ix_academic_events_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_academic_events_institution_id ON public.academic_events USING btree (institution_id);


--
-- Name: ix_admission_enquiries_converted_admission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_admission_enquiries_converted_admission_id ON public.admission_enquiries USING btree (converted_admission_id);


--
-- Name: ix_admission_enquiries_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_admission_enquiries_department_id ON public.admission_enquiries USING btree (department_id);


--
-- Name: ix_admissions_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_admissions_department_id ON public.admissions USING btree (department_id);


--
-- Name: ix_alumni_announcements_posted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_alumni_announcements_posted_by ON public.alumni_announcements USING btree (posted_by);


--
-- Name: ix_alumni_source_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_alumni_source_student_id ON public.alumni USING btree (source_student_id);


--
-- Name: ix_asset_allocations_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_asset_allocations_staff_id ON public.asset_allocations USING btree (staff_id);


--
-- Name: ix_asset_maintenance_logs_logged_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_asset_maintenance_logs_logged_by ON public.asset_maintenance_logs USING btree (logged_by);


--
-- Name: ix_attendance_audit_attendance_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_attendance_audit_attendance_id ON public.attendance_audit USING btree (attendance_id);


--
-- Name: ix_attendance_audit_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_attendance_audit_changed_by ON public.attendance_audit USING btree (changed_by);


--
-- Name: ix_attendance_captured_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_attendance_captured_by ON public.attendance USING btree (captured_by);


--
-- Name: ix_attendance_schedule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_attendance_schedule_id ON public.attendance USING btree (schedule_id);


--
-- Name: ix_attendance_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_attendance_student_id ON public.attendance USING btree (student_id);


--
-- Name: ix_certificate_requests_requested_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_certificate_requests_requested_by ON public.certificate_requests USING btree (requested_by);


--
-- Name: ix_certificate_requests_reviewed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_certificate_requests_reviewed_by ON public.certificate_requests USING btree (reviewed_by);


--
-- Name: ix_cia_component_outcomes_course_outcome_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cia_component_outcomes_course_outcome_id ON public.cia_component_outcomes USING btree (course_outcome_id);


--
-- Name: ix_cia_component_outcomes_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cia_component_outcomes_institution_id ON public.cia_component_outcomes USING btree (institution_id);


--
-- Name: ix_cia_components_academic_year_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cia_components_academic_year_id ON public.cia_components USING btree (academic_year_id);


--
-- Name: ix_cia_components_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cia_components_department_id ON public.cia_components USING btree (department_id);


--
-- Name: ix_cia_components_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cia_components_institution_id ON public.cia_components USING btree (institution_id);


--
-- Name: ix_cia_components_subject_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cia_components_subject_id ON public.cia_components USING btree (subject_id);


--
-- Name: ix_cia_marks_cia_component_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cia_marks_cia_component_id ON public.cia_marks USING btree (cia_component_id);


--
-- Name: ix_cia_marks_entered_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cia_marks_entered_by ON public.cia_marks USING btree (entered_by);


--
-- Name: ix_cia_marks_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cia_marks_institution_id ON public.cia_marks USING btree (institution_id);


--
-- Name: ix_cia_marks_subject_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cia_marks_subject_id ON public.cia_marks USING btree (subject_id);


--
-- Name: ix_cia_results_academic_year_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cia_results_academic_year_id ON public.cia_results USING btree (academic_year_id);


--
-- Name: ix_cia_results_computed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cia_results_computed_by ON public.cia_results USING btree (computed_by);


--
-- Name: ix_cia_results_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cia_results_department_id ON public.cia_results USING btree (department_id);


--
-- Name: ix_cia_results_published_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cia_results_published_by ON public.cia_results USING btree (published_by);


--
-- Name: ix_cia_results_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cia_results_student_id ON public.cia_results USING btree (student_id);


--
-- Name: ix_class_schedules_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_class_schedules_department_id ON public.class_schedules USING btree (department_id);


--
-- Name: ix_class_schedules_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_class_schedules_institution_id ON public.class_schedules USING btree (institution_id);


--
-- Name: ix_class_schedules_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_class_schedules_staff_id ON public.class_schedules USING btree (staff_id);


--
-- Name: ix_class_schedules_subject_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_class_schedules_subject_id ON public.class_schedules USING btree (subject_id);


--
-- Name: ix_co_po_map_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_co_po_map_institution_id ON public.co_po_map USING btree (institution_id);


--
-- Name: ix_co_po_map_program_outcome_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_co_po_map_program_outcome_id ON public.co_po_map USING btree (program_outcome_id);


--
-- Name: ix_curriculum_units_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_curriculum_units_institution_id ON public.curriculum_units USING btree (institution_id);


--
-- Name: ix_department_budgets_academic_year_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_department_budgets_academic_year_id ON public.department_budgets USING btree (academic_year_id);


--
-- Name: ix_department_budgets_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_department_budgets_approved_by ON public.department_budgets USING btree (approved_by);


--
-- Name: ix_department_budgets_submitted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_department_budgets_submitted_by ON public.department_budgets USING btree (submitted_by);


--
-- Name: ix_departments_hod_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_departments_hod_id ON public.departments USING btree (hod_id);


--
-- Name: ix_departments_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_departments_institution_id ON public.departments USING btree (institution_id);


--
-- Name: ix_disciplinary_actions_issued_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_disciplinary_actions_issued_by ON public.disciplinary_actions USING btree (issued_by);


--
-- Name: ix_disciplinary_incidents_reported_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_disciplinary_incidents_reported_by ON public.disciplinary_incidents USING btree (reported_by);


--
-- Name: ix_draft_schedules_academic_year_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_draft_schedules_academic_year_id ON public.draft_schedules USING btree (academic_year_id);


--
-- Name: ix_draft_schedules_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_draft_schedules_department_id ON public.draft_schedules USING btree (department_id);


--
-- Name: ix_draft_schedules_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_draft_schedules_institution_id ON public.draft_schedules USING btree (institution_id);


--
-- Name: ix_exam_schedules_academic_year_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_exam_schedules_academic_year_id ON public.exam_schedules USING btree (academic_year_id);


--
-- Name: ix_exam_schedules_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_exam_schedules_department_id ON public.exam_schedules USING btree (department_id);


--
-- Name: ix_expenses_recorded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_expenses_recorded_by ON public.expenses USING btree (recorded_by);


--
-- Name: ix_fee_concessions_academic_year_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fee_concessions_academic_year_id ON public.fee_concessions USING btree (academic_year_id);


--
-- Name: ix_fee_concessions_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fee_concessions_approved_by ON public.fee_concessions USING btree (approved_by);


--
-- Name: ix_fee_concessions_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fee_concessions_institution_id ON public.fee_concessions USING btree (institution_id);


--
-- Name: ix_fee_concessions_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fee_concessions_student_id ON public.fee_concessions USING btree (student_id);


--
-- Name: ix_fee_demands_academic_year_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fee_demands_academic_year_id ON public.fee_demands USING btree (academic_year_id);


--
-- Name: ix_fee_demands_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fee_demands_created_by ON public.fee_demands USING btree (created_by);


--
-- Name: ix_fee_demands_fee_structure_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fee_demands_fee_structure_id ON public.fee_demands USING btree (fee_structure_id);


--
-- Name: ix_fee_payments_fee_structure_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fee_payments_fee_structure_id ON public.fee_payments USING btree (fee_structure_id);


--
-- Name: ix_fee_payments_recorded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fee_payments_recorded_by ON public.fee_payments USING btree (recorded_by);


--
-- Name: ix_fee_structures_academic_year_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fee_structures_academic_year_id ON public.fee_structures USING btree (academic_year_id);


--
-- Name: ix_fee_structures_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fee_structures_department_id ON public.fee_structures USING btree (department_id);


--
-- Name: ix_feedback_forms_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_feedback_forms_created_by ON public.feedback_forms USING btree (created_by);


--
-- Name: ix_feedback_forms_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_feedback_forms_department_id ON public.feedback_forms USING btree (department_id);


--
-- Name: ix_feedback_responses_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_feedback_responses_institution_id ON public.feedback_responses USING btree (institution_id);


--
-- Name: ix_feedback_submissions_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_feedback_submissions_student_id ON public.feedback_submissions USING btree (student_id);


--
-- Name: ix_guest_lectures_organized_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_guest_lectures_organized_by ON public.guest_lectures USING btree (organized_by);


--
-- Name: ix_guest_lectures_subject_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_guest_lectures_subject_id ON public.guest_lectures USING btree (subject_id);


--
-- Name: ix_hostel_allocations_hostel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_hostel_allocations_hostel_id ON public.hostel_allocations USING btree (hostel_id);


--
-- Name: ix_hostel_announcements_posted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_hostel_announcements_posted_by ON public.hostel_announcements USING btree (posted_by);


--
-- Name: ix_hostel_maintenance_requests_room_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_hostel_maintenance_requests_room_id ON public.hostel_maintenance_requests USING btree (room_id);


--
-- Name: ix_hostels_warden_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_hostels_warden_id ON public.hostels USING btree (warden_id);


--
-- Name: ix_institution_members_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_institution_members_department_id ON public.institution_members USING btree (department_id);


--
-- Name: ix_institution_members_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_institution_members_institution_id ON public.institution_members USING btree (institution_id);


--
-- Name: ix_institution_members_shift_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_institution_members_shift_id ON public.institution_members USING btree (shift_id);


--
-- Name: ix_iqac_action_items_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_iqac_action_items_assigned_to ON public.iqac_action_items USING btree (assigned_to);


--
-- Name: ix_iqac_meetings_chaired_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_iqac_meetings_chaired_by ON public.iqac_meetings USING btree (chaired_by);


--
-- Name: ix_job_applications_converted_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_job_applications_converted_staff_id ON public.job_applications USING btree (converted_staff_id);


--
-- Name: ix_job_postings_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_job_postings_created_by ON public.job_postings USING btree (created_by);


--
-- Name: ix_job_postings_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_job_postings_department_id ON public.job_postings USING btree (department_id);


--
-- Name: ix_laboratories_lab_assistant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_laboratories_lab_assistant_id ON public.laboratories USING btree (lab_assistant_id);


--
-- Name: ix_leave_requests_reviewed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_leave_requests_reviewed_by ON public.leave_requests USING btree (reviewed_by);


--
-- Name: ix_lesson_plans_curriculum_unit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lesson_plans_curriculum_unit_id ON public.lesson_plans USING btree (curriculum_unit_id);


--
-- Name: ix_library_books_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_library_books_department_id ON public.library_books USING btree (department_id);


--
-- Name: ix_lms_assignments_academic_year_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lms_assignments_academic_year_id ON public.lms_assignments USING btree (academic_year_id);


--
-- Name: ix_lms_assignments_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lms_assignments_created_by ON public.lms_assignments USING btree (created_by);


--
-- Name: ix_lms_submissions_graded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_lms_submissions_graded_by ON public.lms_submissions USING btree (graded_by);


--
-- Name: ix_mess_billing_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_mess_billing_institution_id ON public.mess_billing USING btree (institution_id);


--
-- Name: ix_monthly_statutory_deductions_salary_disbursement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_monthly_statutory_deductions_salary_disbursement_id ON public.monthly_statutory_deductions USING btree (salary_disbursement_id);


--
-- Name: ix_notices_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notices_department_id ON public.notices USING btree (department_id);


--
-- Name: ix_notices_posted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notices_posted_by ON public.notices USING btree (posted_by);


--
-- Name: ix_notifications_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_institution_id ON public.notifications USING btree (institution_id);


--
-- Name: ix_online_exam_answers_question_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_online_exam_answers_question_id ON public.online_exam_answers USING btree (question_id);


--
-- Name: ix_online_exam_violations_exam_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_online_exam_violations_exam_id ON public.online_exam_violations USING btree (exam_id);


--
-- Name: ix_online_exam_violations_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_online_exam_violations_student_id ON public.online_exam_violations USING btree (student_id);


--
-- Name: ix_online_exams_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_online_exams_created_by ON public.online_exams USING btree (created_by);


--
-- Name: ix_placement_drives_academic_year_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_placement_drives_academic_year_id ON public.placement_drives USING btree (academic_year_id);


--
-- Name: ix_placement_drives_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_placement_drives_company_id ON public.placement_drives USING btree (company_id);


--
-- Name: ix_profiles_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_profiles_department_id ON public.profiles USING btree (department_id);


--
-- Name: ix_profiles_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_profiles_tenant_id ON public.profiles USING btree (tenant_id);


--
-- Name: ix_program_outcomes_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_program_outcomes_department_id ON public.program_outcomes USING btree (department_id);


--
-- Name: ix_promotion_logs_academic_year_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_promotion_logs_academic_year_id ON public.promotion_logs USING btree (academic_year_id);


--
-- Name: ix_promotion_logs_run_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_promotion_logs_run_by ON public.promotion_logs USING btree (run_by);


--
-- Name: ix_purchase_orders_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_purchase_orders_approved_by ON public.purchase_orders USING btree (approved_by);


--
-- Name: ix_purchase_orders_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_purchase_orders_department_id ON public.purchase_orders USING btree (department_id);


--
-- Name: ix_purchase_orders_raised_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_purchase_orders_raised_by ON public.purchase_orders USING btree (raised_by);


--
-- Name: ix_razorpay_webhook_events_fee_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_razorpay_webhook_events_fee_payment_id ON public.razorpay_webhook_events USING btree (fee_payment_id);


--
-- Name: ix_razorpay_webhook_events_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_razorpay_webhook_events_institution_id ON public.razorpay_webhook_events USING btree (institution_id);


--
-- Name: ix_research_projects_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_research_projects_department_id ON public.research_projects USING btree (department_id);


--
-- Name: ix_salary_disbursements_processed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_salary_disbursements_processed_by ON public.salary_disbursements USING btree (processed_by);


--
-- Name: ix_salary_disbursements_salary_structure_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_salary_disbursements_salary_structure_id ON public.salary_disbursements USING btree (salary_structure_id);


--
-- Name: ix_salary_disbursements_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_salary_disbursements_staff_id ON public.salary_disbursements USING btree (staff_id);


--
-- Name: ix_scheduler_error_logs_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_scheduler_error_logs_institution_id ON public.scheduler_error_logs USING btree (institution_id);


--
-- Name: ix_schedules_draft_schedule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_schedules_draft_schedule_id ON public.schedules USING btree (draft_schedule_id);


--
-- Name: ix_schedules_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_schedules_staff_id ON public.schedules USING btree (staff_id);


--
-- Name: ix_scholarship_applications_academic_year_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_scholarship_applications_academic_year_id ON public.scholarship_applications USING btree (academic_year_id);


--
-- Name: ix_smart_cards_replaced_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_smart_cards_replaced_by ON public.smart_cards USING btree (replaced_by);


--
-- Name: ix_sports_teams_coach_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sports_teams_coach_id ON public.sports_teams USING btree (coach_id);


--
-- Name: ix_staff_appraisals_academic_year_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_staff_appraisals_academic_year_id ON public.staff_appraisals USING btree (academic_year_id);


--
-- Name: ix_staff_appraisals_appraised_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_staff_appraisals_appraised_by ON public.staff_appraisals USING btree (appraised_by);


--
-- Name: ix_staff_career_events_recorded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_staff_career_events_recorded_by ON public.staff_career_events USING btree (recorded_by);


--
-- Name: ix_staff_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_staff_profile_id ON public.staff USING btree (profile_id);


--
-- Name: ix_staff_tax_declarations_academic_year_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_staff_tax_declarations_academic_year_id ON public.staff_tax_declarations USING btree (academic_year_id);


--
-- Name: ix_staff_tax_declarations_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_staff_tax_declarations_institution_id ON public.staff_tax_declarations USING btree (institution_id);


--
-- Name: ix_student_outpasses_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_student_outpasses_approved_by ON public.student_outpasses USING btree (approved_by);


--
-- Name: ix_students_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_students_profile_id ON public.students USING btree (profile_id);


--
-- Name: ix_study_materials_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_study_materials_uploaded_by ON public.study_materials USING btree (uploaded_by);


--
-- Name: ix_subjects_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subjects_department_id ON public.subjects USING btree (department_id);


--
-- Name: ix_syllabus_completion_academic_year_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_syllabus_completion_academic_year_id ON public.syllabus_completion USING btree (academic_year_id);


--
-- Name: ix_syllabus_completion_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_syllabus_completion_institution_id ON public.syllabus_completion USING btree (institution_id);


--
-- Name: ix_syllabus_completion_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_syllabus_completion_staff_id ON public.syllabus_completion USING btree (staff_id);


--
-- Name: ix_teaching_assignments_academic_year_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_teaching_assignments_academic_year_id ON public.teaching_assignments USING btree (academic_year_id);


--
-- Name: ix_teaching_assignments_institution_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_teaching_assignments_institution_id ON public.teaching_assignments USING btree (institution_id);


--
-- Name: ix_teaching_assignments_subject_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_teaching_assignments_subject_id ON public.teaching_assignments USING btree (subject_id);


--
-- Name: ix_transport_allocations_academic_year_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_transport_allocations_academic_year_id ON public.transport_allocations USING btree (academic_year_id);


--
-- Name: ix_visitor_log_meeting_with; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_visitor_log_meeting_with ON public.visitor_log USING btree (meeting_with);


--
-- Name: monthly_statutory_deductions_inst_month_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX monthly_statutory_deductions_inst_month_idx ON public.monthly_statutory_deductions USING btree (institution_id, month);


--
-- Name: program_outcomes_scope_code_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX program_outcomes_scope_code_uniq ON public.program_outcomes USING btree (institution_id, department_id, code) NULLS NOT DISTINCT;


--
-- Name: uq_alumni_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_alumni_profile ON public.alumni USING btree (profile_id) WHERE (profile_id IS NOT NULL);


--
-- Name: uq_fee_demands_source_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_fee_demands_source_ref ON public.fee_demands USING btree (source, source_ref) WHERE (source_ref IS NOT NULL);


--
-- Name: uq_hostel_alloc_active_student; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_hostel_alloc_active_student ON public.hostel_allocations USING btree (student_id) WHERE (status = 'active'::text);


--
-- Name: uq_razorpay_webhook_events_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_razorpay_webhook_events_event_id ON public.razorpay_webhook_events USING btree (event_id) WHERE (event_id IS NOT NULL);


--
-- Name: uq_smart_cards_active_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_smart_cards_active_staff ON public.smart_cards USING btree (staff_id) WHERE ((status = 'active'::text) AND (staff_id IS NOT NULL));


--
-- Name: uq_smart_cards_active_student; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_smart_cards_active_student ON public.smart_cards USING btree (student_id) WHERE ((status = 'active'::text) AND (student_id IS NOT NULL));


--
-- Name: expenses trg_expenses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: fee_payments trg_fee_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_fee_payments_updated_at BEFORE UPDATE ON public.fee_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: fee_structures trg_fee_structures_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_fee_structures_updated_at BEFORE UPDATE ON public.fee_structures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: salary_disbursements trg_salary_disbursements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_salary_disbursements_updated_at BEFORE UPDATE ON public.salary_disbursements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: salary_structures trg_salary_structures_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_salary_structures_updated_at BEFORE UPDATE ON public.salary_structures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: staff trg_staff_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: students trg_students_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: academic_events academic_events_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_events
    ADD CONSTRAINT academic_events_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: academic_events academic_events_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_events
    ADD CONSTRAINT academic_events_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: academic_years academic_years_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: admission_enquiries admission_enquiries_converted_admission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_enquiries
    ADD CONSTRAINT admission_enquiries_converted_admission_id_fkey FOREIGN KEY (converted_admission_id) REFERENCES public.admissions(id) ON DELETE SET NULL;


--
-- Name: admission_enquiries admission_enquiries_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_enquiries
    ADD CONSTRAINT admission_enquiries_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: admission_enquiries admission_enquiries_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admission_enquiries
    ADD CONSTRAINT admission_enquiries_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: admissions admissions_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: admissions admissions_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: alumni_announcements alumni_announcements_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_announcements
    ADD CONSTRAINT alumni_announcements_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: alumni_announcements alumni_announcements_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_announcements
    ADD CONSTRAINT alumni_announcements_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: alumni alumni_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni
    ADD CONSTRAINT alumni_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: alumni alumni_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni
    ADD CONSTRAINT alumni_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: alumni alumni_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni
    ADD CONSTRAINT alumni_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: alumni alumni_source_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni
    ADD CONSTRAINT alumni_source_student_id_fkey FOREIGN KEY (source_student_id) REFERENCES public.students(id) ON DELETE SET NULL;


--
-- Name: asset_allocations asset_allocations_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_allocations
    ADD CONSTRAINT asset_allocations_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: asset_allocations asset_allocations_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_allocations
    ADD CONSTRAINT asset_allocations_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: asset_allocations asset_allocations_laboratory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_allocations
    ADD CONSTRAINT asset_allocations_laboratory_id_fkey FOREIGN KEY (laboratory_id) REFERENCES public.laboratories(id) ON DELETE SET NULL;


--
-- Name: asset_allocations asset_allocations_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_allocations
    ADD CONSTRAINT asset_allocations_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: asset_categories asset_categories_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_categories
    ADD CONSTRAINT asset_categories_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: asset_maintenance_logs asset_maintenance_logs_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_maintenance_logs
    ADD CONSTRAINT asset_maintenance_logs_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: asset_maintenance_logs asset_maintenance_logs_logged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_maintenance_logs
    ADD CONSTRAINT asset_maintenance_logs_logged_by_fkey FOREIGN KEY (logged_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: assets assets_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.asset_categories(id) ON DELETE CASCADE;


--
-- Name: assets assets_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: attendance_audit attendance_audit_attendance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_audit
    ADD CONSTRAINT attendance_audit_attendance_id_fkey FOREIGN KEY (attendance_id) REFERENCES public.attendance(id);


--
-- Name: attendance_audit attendance_audit_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_audit
    ADD CONSTRAINT attendance_audit_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.staff(id);


--
-- Name: attendance attendance_captured_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_captured_by_fkey FOREIGN KEY (captured_by) REFERENCES public.staff(id);


--
-- Name: attendance attendance_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.class_schedules(id);


--
-- Name: attendance attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: audit_logs audit_logs_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES auth.users(id);


--
-- Name: budget_line_items budget_line_items_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_line_items
    ADD CONSTRAINT budget_line_items_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.department_budgets(id) ON DELETE CASCADE;


--
-- Name: bus_routes bus_routes_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bus_routes
    ADD CONSTRAINT bus_routes_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: bus_routes bus_routes_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bus_routes
    ADD CONSTRAINT bus_routes_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- Name: campus_events campus_events_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campus_events
    ADD CONSTRAINT campus_events_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: campus_events campus_events_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campus_events
    ADD CONSTRAINT campus_events_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: certificate_requests certificate_requests_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_requests
    ADD CONSTRAINT certificate_requests_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: certificate_requests certificate_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_requests
    ADD CONSTRAINT certificate_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: certificate_requests certificate_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_requests
    ADD CONSTRAINT certificate_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: certificate_requests certificate_requests_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_requests
    ADD CONSTRAINT certificate_requests_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: certificate_requests certificate_requests_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_requests
    ADD CONSTRAINT certificate_requests_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: cia_component_outcomes cia_component_outcomes_cia_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_component_outcomes
    ADD CONSTRAINT cia_component_outcomes_cia_component_id_fkey FOREIGN KEY (cia_component_id) REFERENCES public.cia_components(id) ON DELETE CASCADE;


--
-- Name: cia_component_outcomes cia_component_outcomes_course_outcome_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_component_outcomes
    ADD CONSTRAINT cia_component_outcomes_course_outcome_id_fkey FOREIGN KEY (course_outcome_id) REFERENCES public.course_outcomes(id) ON DELETE CASCADE;


--
-- Name: cia_component_outcomes cia_component_outcomes_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_component_outcomes
    ADD CONSTRAINT cia_component_outcomes_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: cia_components cia_components_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_components
    ADD CONSTRAINT cia_components_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: cia_components cia_components_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_components
    ADD CONSTRAINT cia_components_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: cia_components cia_components_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_components
    ADD CONSTRAINT cia_components_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: cia_components cia_components_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_components
    ADD CONSTRAINT cia_components_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE SET NULL;


--
-- Name: cia_marks cia_marks_cia_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_marks
    ADD CONSTRAINT cia_marks_cia_component_id_fkey FOREIGN KEY (cia_component_id) REFERENCES public.cia_components(id) ON DELETE CASCADE;


--
-- Name: cia_marks cia_marks_entered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_marks
    ADD CONSTRAINT cia_marks_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES auth.users(id);


--
-- Name: cia_marks cia_marks_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_marks
    ADD CONSTRAINT cia_marks_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: cia_marks cia_marks_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_marks
    ADD CONSTRAINT cia_marks_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: cia_marks cia_marks_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_marks
    ADD CONSTRAINT cia_marks_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE SET NULL;


--
-- Name: cia_results cia_results_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_results
    ADD CONSTRAINT cia_results_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: cia_results cia_results_computed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_results
    ADD CONSTRAINT cia_results_computed_by_fkey FOREIGN KEY (computed_by) REFERENCES auth.users(id);


--
-- Name: cia_results cia_results_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_results
    ADD CONSTRAINT cia_results_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: cia_results cia_results_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_results
    ADD CONSTRAINT cia_results_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: cia_results cia_results_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_results
    ADD CONSTRAINT cia_results_published_by_fkey FOREIGN KEY (published_by) REFERENCES auth.users(id);


--
-- Name: cia_results cia_results_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cia_results
    ADD CONSTRAINT cia_results_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: class_schedules class_schedules_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_schedules
    ADD CONSTRAINT class_schedules_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: class_schedules class_schedules_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_schedules
    ADD CONSTRAINT class_schedules_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: class_schedules class_schedules_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_schedules
    ADD CONSTRAINT class_schedules_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: class_schedules class_schedules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_schedules
    ADD CONSTRAINT class_schedules_tenant_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: co_po_map co_po_map_course_outcome_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.co_po_map
    ADD CONSTRAINT co_po_map_course_outcome_id_fkey FOREIGN KEY (course_outcome_id) REFERENCES public.course_outcomes(id) ON DELETE CASCADE;


--
-- Name: co_po_map co_po_map_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.co_po_map
    ADD CONSTRAINT co_po_map_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: co_po_map co_po_map_program_outcome_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.co_po_map
    ADD CONSTRAINT co_po_map_program_outcome_id_fkey FOREIGN KEY (program_outcome_id) REFERENCES public.program_outcomes(id) ON DELETE CASCADE;


--
-- Name: companies companies_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: course_outcomes course_outcomes_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_outcomes
    ADD CONSTRAINT course_outcomes_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: course_outcomes course_outcomes_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_outcomes
    ADD CONSTRAINT course_outcomes_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: curriculum_units curriculum_units_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum_units
    ADD CONSTRAINT curriculum_units_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: curriculum_units curriculum_units_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum_units
    ADD CONSTRAINT curriculum_units_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: data_consent_logs data_consent_logs_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_consent_logs
    ADD CONSTRAINT data_consent_logs_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: data_consent_logs data_consent_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_consent_logs
    ADD CONSTRAINT data_consent_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: data_erasure_requests data_erasure_requests_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_erasure_requests
    ADD CONSTRAINT data_erasure_requests_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: data_erasure_requests data_erasure_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_erasure_requests
    ADD CONSTRAINT data_erasure_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);


--
-- Name: department_budgets department_budgets_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_budgets
    ADD CONSTRAINT department_budgets_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE CASCADE;


--
-- Name: department_budgets department_budgets_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_budgets
    ADD CONSTRAINT department_budgets_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: department_budgets department_budgets_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_budgets
    ADD CONSTRAINT department_budgets_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: department_budgets department_budgets_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_budgets
    ADD CONSTRAINT department_budgets_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: department_budgets department_budgets_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_budgets
    ADD CONSTRAINT department_budgets_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: departments departments_hod_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_hod_id_fkey FOREIGN KEY (hod_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: departments departments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_tenant_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: devices devices_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: devices devices_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: disciplinary_actions disciplinary_actions_incident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinary_actions
    ADD CONSTRAINT disciplinary_actions_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.disciplinary_incidents(id) ON DELETE CASCADE;


--
-- Name: disciplinary_actions disciplinary_actions_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinary_actions
    ADD CONSTRAINT disciplinary_actions_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: disciplinary_incidents disciplinary_incidents_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinary_incidents
    ADD CONSTRAINT disciplinary_incidents_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: disciplinary_incidents disciplinary_incidents_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinary_incidents
    ADD CONSTRAINT disciplinary_incidents_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: disciplinary_incidents disciplinary_incidents_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disciplinary_incidents
    ADD CONSTRAINT disciplinary_incidents_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;


--
-- Name: draft_schedules draft_schedules_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_schedules
    ADD CONSTRAINT draft_schedules_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: draft_schedules draft_schedules_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_schedules
    ADD CONSTRAINT draft_schedules_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: draft_schedules draft_schedules_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_schedules
    ADD CONSTRAINT draft_schedules_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: event_participants event_participants_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.campus_events(id) ON DELETE CASCADE;


--
-- Name: event_participants event_participants_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: exam_schedules exam_schedules_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: exam_schedules exam_schedules_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: exam_schedules exam_schedules_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: fee_concessions fee_concessions_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_concessions
    ADD CONSTRAINT fee_concessions_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: fee_concessions fee_concessions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_concessions
    ADD CONSTRAINT fee_concessions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: fee_concessions fee_concessions_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_concessions
    ADD CONSTRAINT fee_concessions_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: fee_concessions fee_concessions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_concessions
    ADD CONSTRAINT fee_concessions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: fee_demands fee_demands_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_demands
    ADD CONSTRAINT fee_demands_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: fee_demands fee_demands_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_demands
    ADD CONSTRAINT fee_demands_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: fee_demands fee_demands_fee_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_demands
    ADD CONSTRAINT fee_demands_fee_structure_id_fkey FOREIGN KEY (fee_structure_id) REFERENCES public.fee_structures(id) ON DELETE CASCADE;


--
-- Name: fee_demands fee_demands_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_demands
    ADD CONSTRAINT fee_demands_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: fee_demands fee_demands_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_demands
    ADD CONSTRAINT fee_demands_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: fee_payments fee_payments_demand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_demand_id_fkey FOREIGN KEY (demand_id) REFERENCES public.fee_demands(id) ON DELETE SET NULL;


--
-- Name: fee_payments fee_payments_fee_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_fee_structure_id_fkey FOREIGN KEY (fee_structure_id) REFERENCES public.fee_structures(id) ON DELETE SET NULL;


--
-- Name: fee_payments fee_payments_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: fee_payments fee_payments_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: fee_payments fee_payments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: fee_structures fee_structures_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: fee_structures fee_structures_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: fee_structures fee_structures_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: feedback_forms feedback_forms_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_forms
    ADD CONSTRAINT feedback_forms_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: feedback_forms feedback_forms_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_forms
    ADD CONSTRAINT feedback_forms_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: feedback_forms feedback_forms_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_forms
    ADD CONSTRAINT feedback_forms_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: feedback_forms feedback_forms_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_forms
    ADD CONSTRAINT feedback_forms_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: feedback_responses feedback_responses_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_responses
    ADD CONSTRAINT feedback_responses_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.feedback_forms(id) ON DELETE CASCADE;


--
-- Name: feedback_responses feedback_responses_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_responses
    ADD CONSTRAINT feedback_responses_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: feedback_submissions feedback_submissions_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_submissions
    ADD CONSTRAINT feedback_submissions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.feedback_forms(id) ON DELETE CASCADE;


--
-- Name: feedback_submissions feedback_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_submissions
    ADD CONSTRAINT feedback_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: grievances grievances_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grievances
    ADD CONSTRAINT grievances_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: grievances grievances_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grievances
    ADD CONSTRAINT grievances_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: grievances grievances_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grievances
    ADD CONSTRAINT grievances_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: guest_lectures guest_lectures_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_lectures
    ADD CONSTRAINT guest_lectures_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: guest_lectures guest_lectures_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_lectures
    ADD CONSTRAINT guest_lectures_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: guest_lectures guest_lectures_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_lectures
    ADD CONSTRAINT guest_lectures_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: guest_lectures guest_lectures_organized_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_lectures
    ADD CONSTRAINT guest_lectures_organized_by_fkey FOREIGN KEY (organized_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: guest_lectures guest_lectures_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_lectures
    ADD CONSTRAINT guest_lectures_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE SET NULL;


--
-- Name: hostel_allocations hostel_allocations_hostel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_allocations
    ADD CONSTRAINT hostel_allocations_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES public.hostels(id) ON DELETE CASCADE;


--
-- Name: hostel_allocations hostel_allocations_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_allocations
    ADD CONSTRAINT hostel_allocations_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.hostel_rooms(id) ON DELETE CASCADE;


--
-- Name: hostel_allocations hostel_allocations_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_allocations
    ADD CONSTRAINT hostel_allocations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: hostel_announcements hostel_announcements_hostel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_announcements
    ADD CONSTRAINT hostel_announcements_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES public.hostels(id) ON DELETE CASCADE;


--
-- Name: hostel_announcements hostel_announcements_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_announcements
    ADD CONSTRAINT hostel_announcements_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: hostel_maintenance_requests hostel_maintenance_requests_hostel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_maintenance_requests
    ADD CONSTRAINT hostel_maintenance_requests_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES public.hostels(id) ON DELETE CASCADE;


--
-- Name: hostel_maintenance_requests hostel_maintenance_requests_raised_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_maintenance_requests
    ADD CONSTRAINT hostel_maintenance_requests_raised_by_fkey FOREIGN KEY (raised_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: hostel_maintenance_requests hostel_maintenance_requests_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_maintenance_requests
    ADD CONSTRAINT hostel_maintenance_requests_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.hostel_rooms(id) ON DELETE SET NULL;


--
-- Name: hostel_rooms hostel_rooms_hostel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_rooms
    ADD CONSTRAINT hostel_rooms_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES public.hostels(id) ON DELETE CASCADE;


--
-- Name: hostels hostels_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostels
    ADD CONSTRAINT hostels_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: hostels hostels_warden_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostels
    ADD CONSTRAINT hostels_warden_id_fkey FOREIGN KEY (warden_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: industry_interactions industry_interactions_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_interactions
    ADD CONSTRAINT industry_interactions_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: industry_interactions industry_interactions_mou_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_interactions
    ADD CONSTRAINT industry_interactions_mou_partner_id_fkey FOREIGN KEY (mou_partner_id) REFERENCES public.mou_partners(id) ON DELETE SET NULL;


--
-- Name: institution_subscriptions institution_subscriptions_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_subscriptions
    ADD CONSTRAINT institution_subscriptions_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: institution_subscriptions institution_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_subscriptions
    ADD CONSTRAINT institution_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: internships internships_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internships
    ADD CONSTRAINT internships_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: internships internships_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internships
    ADD CONSTRAINT internships_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: internships internships_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internships
    ADD CONSTRAINT internships_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: iqac_action_items iqac_action_items_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iqac_action_items
    ADD CONSTRAINT iqac_action_items_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: iqac_action_items iqac_action_items_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iqac_action_items
    ADD CONSTRAINT iqac_action_items_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.iqac_meetings(id) ON DELETE CASCADE;


--
-- Name: iqac_meetings iqac_meetings_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iqac_meetings
    ADD CONSTRAINT iqac_meetings_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: iqac_meetings iqac_meetings_chaired_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iqac_meetings
    ADD CONSTRAINT iqac_meetings_chaired_by_fkey FOREIGN KEY (chaired_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: iqac_meetings iqac_meetings_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iqac_meetings
    ADD CONSTRAINT iqac_meetings_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: job_applications job_applications_converted_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_converted_staff_id_fkey FOREIGN KEY (converted_staff_id) REFERENCES public.staff(id);


--
-- Name: job_applications job_applications_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: job_applications job_applications_job_posting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_job_posting_id_fkey FOREIGN KEY (job_posting_id) REFERENCES public.job_postings(id) ON DELETE CASCADE;


--
-- Name: job_postings job_postings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: job_postings job_postings_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: job_postings job_postings_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: laboratories laboratories_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratories
    ADD CONSTRAINT laboratories_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: laboratories laboratories_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratories
    ADD CONSTRAINT laboratories_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: laboratories laboratories_lab_assistant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratories
    ADD CONSTRAINT laboratories_lab_assistant_id_fkey FOREIGN KEY (lab_assistant_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: laboratory_attendance laboratory_attendance_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratory_attendance
    ADD CONSTRAINT laboratory_attendance_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.laboratory_sessions(id) ON DELETE CASCADE;


--
-- Name: laboratory_attendance laboratory_attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratory_attendance
    ADD CONSTRAINT laboratory_attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: laboratory_batches laboratory_batches_laboratory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratory_batches
    ADD CONSTRAINT laboratory_batches_laboratory_id_fkey FOREIGN KEY (laboratory_id) REFERENCES public.laboratories(id) ON DELETE CASCADE;


--
-- Name: laboratory_experiments laboratory_experiments_laboratory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratory_experiments
    ADD CONSTRAINT laboratory_experiments_laboratory_id_fkey FOREIGN KEY (laboratory_id) REFERENCES public.laboratories(id) ON DELETE CASCADE;


--
-- Name: laboratory_sessions laboratory_sessions_experiment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratory_sessions
    ADD CONSTRAINT laboratory_sessions_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES public.laboratory_experiments(id) ON DELETE CASCADE;


--
-- Name: laboratory_sessions laboratory_sessions_laboratory_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratory_sessions
    ADD CONSTRAINT laboratory_sessions_laboratory_batch_id_fkey FOREIGN KEY (laboratory_batch_id) REFERENCES public.laboratory_batches(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: leave_requests leave_requests_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: lesson_plans lesson_plans_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_plans
    ADD CONSTRAINT lesson_plans_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: lesson_plans lesson_plans_curriculum_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_plans
    ADD CONSTRAINT lesson_plans_curriculum_unit_id_fkey FOREIGN KEY (curriculum_unit_id) REFERENCES public.curriculum_units(id) ON DELETE SET NULL;


--
-- Name: lesson_plans lesson_plans_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_plans
    ADD CONSTRAINT lesson_plans_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: lesson_plans lesson_plans_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_plans
    ADD CONSTRAINT lesson_plans_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: lesson_plans lesson_plans_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_plans
    ADD CONSTRAINT lesson_plans_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: library_books library_books_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_books
    ADD CONSTRAINT library_books_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: library_books library_books_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_books
    ADD CONSTRAINT library_books_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: library_lendings library_lendings_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_lendings
    ADD CONSTRAINT library_lendings_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.library_books(id) ON DELETE CASCADE;


--
-- Name: library_lendings library_lendings_borrower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_lendings
    ADD CONSTRAINT library_lendings_borrower_id_fkey FOREIGN KEY (borrower_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: library_lendings library_lendings_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_lendings
    ADD CONSTRAINT library_lendings_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: lms_assignments lms_assignments_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_assignments
    ADD CONSTRAINT lms_assignments_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: lms_assignments lms_assignments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_assignments
    ADD CONSTRAINT lms_assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: lms_assignments lms_assignments_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_assignments
    ADD CONSTRAINT lms_assignments_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: lms_assignments lms_assignments_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_assignments
    ADD CONSTRAINT lms_assignments_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: lms_submissions lms_submissions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_submissions
    ADD CONSTRAINT lms_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.lms_assignments(id) ON DELETE CASCADE;


--
-- Name: lms_submissions lms_submissions_graded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_submissions
    ADD CONSTRAINT lms_submissions_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: lms_submissions lms_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_submissions
    ADD CONSTRAINT lms_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: medical_records medical_records_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: medical_records medical_records_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: medical_visits medical_visits_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_visits
    ADD CONSTRAINT medical_visits_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: medical_visits medical_visits_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_visits
    ADD CONSTRAINT medical_visits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES auth.users(id);


--
-- Name: mess_billing mess_billing_hostel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mess_billing
    ADD CONSTRAINT mess_billing_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES public.hostels(id) ON DELETE CASCADE;


--
-- Name: mess_billing mess_billing_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mess_billing
    ADD CONSTRAINT mess_billing_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: mess_billing mess_billing_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mess_billing
    ADD CONSTRAINT mess_billing_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: mess_menu mess_menu_hostel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mess_menu
    ADD CONSTRAINT mess_menu_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES public.hostels(id) ON DELETE CASCADE;


--
-- Name: monthly_statutory_deductions monthly_statutory_deductions_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_statutory_deductions
    ADD CONSTRAINT monthly_statutory_deductions_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: monthly_statutory_deductions monthly_statutory_deductions_salary_disbursement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_statutory_deductions
    ADD CONSTRAINT monthly_statutory_deductions_salary_disbursement_id_fkey FOREIGN KEY (salary_disbursement_id) REFERENCES public.salary_disbursements(id);


--
-- Name: monthly_statutory_deductions monthly_statutory_deductions_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_statutory_deductions
    ADD CONSTRAINT monthly_statutory_deductions_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: mou_partners mou_partners_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mou_partners
    ADD CONSTRAINT mou_partners_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: notices notices_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: notices notices_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: notices notices_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: online_exam_answers online_exam_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_exam_answers
    ADD CONSTRAINT online_exam_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.online_exam_questions(id) ON DELETE CASCADE;


--
-- Name: online_exam_answers online_exam_answers_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_exam_answers
    ADD CONSTRAINT online_exam_answers_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.online_exam_sessions(id) ON DELETE CASCADE;


--
-- Name: online_exam_questions online_exam_questions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_exam_questions
    ADD CONSTRAINT online_exam_questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.online_exams(id) ON DELETE CASCADE;


--
-- Name: online_exam_sessions online_exam_sessions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_exam_sessions
    ADD CONSTRAINT online_exam_sessions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.online_exams(id) ON DELETE CASCADE;


--
-- Name: online_exam_sessions online_exam_sessions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_exam_sessions
    ADD CONSTRAINT online_exam_sessions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: online_exam_violations online_exam_violations_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_exam_violations
    ADD CONSTRAINT online_exam_violations_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.online_exams(id) ON DELETE CASCADE;


--
-- Name: online_exam_violations online_exam_violations_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_exam_violations
    ADD CONSTRAINT online_exam_violations_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.online_exam_sessions(id) ON DELETE CASCADE;


--
-- Name: online_exam_violations online_exam_violations_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_exam_violations
    ADD CONSTRAINT online_exam_violations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: online_exams online_exams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_exams
    ADD CONSTRAINT online_exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: online_exams online_exams_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_exams
    ADD CONSTRAINT online_exams_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: online_exams online_exams_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.online_exams
    ADD CONSTRAINT online_exams_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: parent_student_links parent_student_links_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parent_student_links
    ADD CONSTRAINT parent_student_links_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.parents(id) ON DELETE CASCADE;


--
-- Name: parent_student_links parent_student_links_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parent_student_links
    ADD CONSTRAINT parent_student_links_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: parents parents_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parents
    ADD CONSTRAINT parents_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: parents parents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parents
    ADD CONSTRAINT parents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: placement_drives placement_drives_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_drives
    ADD CONSTRAINT placement_drives_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: placement_drives placement_drives_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_drives
    ADD CONSTRAINT placement_drives_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: placement_drives placement_drives_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_drives
    ADD CONSTRAINT placement_drives_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: placement_registrations placement_registrations_drive_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_registrations
    ADD CONSTRAINT placement_registrations_drive_id_fkey FOREIGN KEY (drive_id) REFERENCES public.placement_drives(id) ON DELETE CASCADE;


--
-- Name: placement_registrations placement_registrations_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.placement_registrations
    ADD CONSTRAINT placement_registrations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.institutions(id);


--
-- Name: program_outcomes program_outcomes_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_outcomes
    ADD CONSTRAINT program_outcomes_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: program_outcomes program_outcomes_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_outcomes
    ADD CONSTRAINT program_outcomes_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: promotion_logs promotion_logs_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_logs
    ADD CONSTRAINT promotion_logs_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: promotion_logs promotion_logs_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_logs
    ADD CONSTRAINT promotion_logs_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: promotion_logs promotion_logs_run_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_logs
    ADD CONSTRAINT promotion_logs_run_by_fkey FOREIGN KEY (run_by) REFERENCES auth.users(id);


--
-- Name: publications publications_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publications
    ADD CONSTRAINT publications_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: publications publications_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publications
    ADD CONSTRAINT publications_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_raised_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_raised_by_fkey FOREIGN KEY (raised_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE RESTRICT;


--
-- Name: razorpay_webhook_events razorpay_webhook_events_fee_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razorpay_webhook_events
    ADD CONSTRAINT razorpay_webhook_events_fee_payment_id_fkey FOREIGN KEY (fee_payment_id) REFERENCES public.fee_payments(id) ON DELETE SET NULL;


--
-- Name: razorpay_webhook_events razorpay_webhook_events_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.razorpay_webhook_events
    ADD CONSTRAINT razorpay_webhook_events_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE SET NULL;


--
-- Name: research_projects research_projects_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_projects
    ADD CONSTRAINT research_projects_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: research_projects research_projects_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_projects
    ADD CONSTRAINT research_projects_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: research_projects research_projects_principal_investigator_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_projects
    ADD CONSTRAINT research_projects_principal_investigator_fkey FOREIGN KEY (principal_investigator) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: salary_disbursements salary_disbursements_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_disbursements
    ADD CONSTRAINT salary_disbursements_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: salary_disbursements salary_disbursements_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_disbursements
    ADD CONSTRAINT salary_disbursements_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: salary_disbursements salary_disbursements_salary_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_disbursements
    ADD CONSTRAINT salary_disbursements_salary_structure_id_fkey FOREIGN KEY (salary_structure_id) REFERENCES public.salary_structures(id) ON DELETE SET NULL;


--
-- Name: salary_disbursements salary_disbursements_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_disbursements
    ADD CONSTRAINT salary_disbursements_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: salary_structures salary_structures_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_structures
    ADD CONSTRAINT salary_structures_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: salary_structures salary_structures_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_structures
    ADD CONSTRAINT salary_structures_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: scheduler_error_logs scheduler_error_logs_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduler_error_logs
    ADD CONSTRAINT scheduler_error_logs_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE SET NULL;


--
-- Name: schedules schedules_draft_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_draft_schedule_id_fkey FOREIGN KEY (draft_schedule_id) REFERENCES public.draft_schedules(id) ON DELETE SET NULL;


--
-- Name: schedules schedules_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: scholarship_applications scholarship_applications_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_applications
    ADD CONSTRAINT scholarship_applications_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: scholarship_applications scholarship_applications_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_applications
    ADD CONSTRAINT scholarship_applications_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: scholarship_applications scholarship_applications_scheme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_applications
    ADD CONSTRAINT scholarship_applications_scheme_id_fkey FOREIGN KEY (scheme_id) REFERENCES public.scholarship_schemes(id) ON DELETE CASCADE;


--
-- Name: scholarship_applications scholarship_applications_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_applications
    ADD CONSTRAINT scholarship_applications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: scholarship_schemes scholarship_schemes_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_schemes
    ADD CONSTRAINT scholarship_schemes_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: smart_cards smart_cards_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smart_cards
    ADD CONSTRAINT smart_cards_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: smart_cards smart_cards_replaced_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smart_cards
    ADD CONSTRAINT smart_cards_replaced_by_fkey FOREIGN KEY (replaced_by) REFERENCES public.smart_cards(id) ON DELETE SET NULL;


--
-- Name: smart_cards smart_cards_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smart_cards
    ADD CONSTRAINT smart_cards_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: smart_cards smart_cards_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smart_cards
    ADD CONSTRAINT smart_cards_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;


--
-- Name: sports_achievements sports_achievements_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports_achievements
    ADD CONSTRAINT sports_achievements_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: sports_achievements sports_achievements_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports_achievements
    ADD CONSTRAINT sports_achievements_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;


--
-- Name: sports_achievements sports_achievements_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports_achievements
    ADD CONSTRAINT sports_achievements_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.sports_teams(id) ON DELETE SET NULL;


--
-- Name: sports_facilities sports_facilities_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports_facilities
    ADD CONSTRAINT sports_facilities_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: sports_team_members sports_team_members_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports_team_members
    ADD CONSTRAINT sports_team_members_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: sports_team_members sports_team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports_team_members
    ADD CONSTRAINT sports_team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.sports_teams(id) ON DELETE CASCADE;


--
-- Name: sports_teams sports_teams_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports_teams
    ADD CONSTRAINT sports_teams_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: sports_teams sports_teams_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports_teams
    ADD CONSTRAINT sports_teams_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: sports_teams sports_teams_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports_teams
    ADD CONSTRAINT sports_teams_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: staff_appraisal_activities staff_appraisal_activities_appraisal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_appraisal_activities
    ADD CONSTRAINT staff_appraisal_activities_appraisal_id_fkey FOREIGN KEY (appraisal_id) REFERENCES public.staff_appraisals(id) ON DELETE CASCADE;


--
-- Name: staff_appraisals staff_appraisals_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_appraisals
    ADD CONSTRAINT staff_appraisals_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: staff_appraisals staff_appraisals_appraised_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_appraisals
    ADD CONSTRAINT staff_appraisals_appraised_by_fkey FOREIGN KEY (appraised_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: staff_appraisals staff_appraisals_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_appraisals
    ADD CONSTRAINT staff_appraisals_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: staff_appraisals staff_appraisals_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_appraisals
    ADD CONSTRAINT staff_appraisals_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: staff_attendance staff_attendance_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: staff_attendance staff_attendance_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: staff_career_events staff_career_events_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_career_events
    ADD CONSTRAINT staff_career_events_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: staff_career_events staff_career_events_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_career_events
    ADD CONSTRAINT staff_career_events_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: staff_career_events staff_career_events_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_career_events
    ADD CONSTRAINT staff_career_events_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: staff staff_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: staff staff_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: staff staff_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: staff_tax_declarations staff_tax_declarations_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_tax_declarations
    ADD CONSTRAINT staff_tax_declarations_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);


--
-- Name: staff_tax_declarations staff_tax_declarations_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_tax_declarations
    ADD CONSTRAINT staff_tax_declarations_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: staff_tax_declarations staff_tax_declarations_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_tax_declarations
    ADD CONSTRAINT staff_tax_declarations_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: statutory_payroll_config statutory_payroll_config_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statutory_payroll_config
    ADD CONSTRAINT statutory_payroll_config_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: student_outpasses student_outpasses_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_outpasses
    ADD CONSTRAINT student_outpasses_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: student_outpasses student_outpasses_hostel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_outpasses
    ADD CONSTRAINT student_outpasses_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES public.hostels(id) ON DELETE SET NULL;


--
-- Name: student_outpasses student_outpasses_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_outpasses
    ADD CONSTRAINT student_outpasses_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: student_outpasses student_outpasses_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_outpasses
    ADD CONSTRAINT student_outpasses_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: students students_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: students students_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: students students_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: study_materials study_materials_curriculum_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_materials
    ADD CONSTRAINT study_materials_curriculum_unit_id_fkey FOREIGN KEY (curriculum_unit_id) REFERENCES public.curriculum_units(id) ON DELETE SET NULL;


--
-- Name: study_materials study_materials_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_materials
    ADD CONSTRAINT study_materials_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: study_materials study_materials_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_materials
    ADD CONSTRAINT study_materials_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: study_materials study_materials_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_materials
    ADD CONSTRAINT study_materials_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: subjects subjects_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: subjects subjects_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_tenant_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: subscription_invoices subscription_invoices_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_invoices
    ADD CONSTRAINT subscription_invoices_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: syllabus_completion syllabus_completion_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_completion
    ADD CONSTRAINT syllabus_completion_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: syllabus_completion syllabus_completion_curriculum_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_completion
    ADD CONSTRAINT syllabus_completion_curriculum_unit_id_fkey FOREIGN KEY (curriculum_unit_id) REFERENCES public.curriculum_units(id) ON DELETE CASCADE;


--
-- Name: syllabus_completion syllabus_completion_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_completion
    ADD CONSTRAINT syllabus_completion_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: syllabus_completion syllabus_completion_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.syllabus_completion
    ADD CONSTRAINT syllabus_completion_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: teaching_assignments teaching_assignments_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_assignments
    ADD CONSTRAINT teaching_assignments_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: teaching_assignments teaching_assignments_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_assignments
    ADD CONSTRAINT teaching_assignments_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: teaching_assignments teaching_assignments_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_assignments
    ADD CONSTRAINT teaching_assignments_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: teaching_assignments teaching_assignments_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teaching_assignments
    ADD CONSTRAINT teaching_assignments_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: institution_members tenant_users_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_members
    ADD CONSTRAINT tenant_users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: institution_members tenant_users_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_members
    ADD CONSTRAINT tenant_users_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: institution_members tenant_users_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_members
    ADD CONSTRAINT tenant_users_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE SET NULL;


--
-- Name: institution_members tenant_users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.institution_members
    ADD CONSTRAINT tenant_users_tenant_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: transport_allocations transport_allocations_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_allocations
    ADD CONSTRAINT transport_allocations_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;


--
-- Name: transport_allocations transport_allocations_bus_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_allocations
    ADD CONSTRAINT transport_allocations_bus_route_id_fkey FOREIGN KEY (bus_route_id) REFERENCES public.bus_routes(id) ON DELETE CASCADE;


--
-- Name: transport_allocations transport_allocations_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_allocations
    ADD CONSTRAINT transport_allocations_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: transport_allocations transport_allocations_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_allocations
    ADD CONSTRAINT transport_allocations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: vehicles vehicles_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: vendors vendors_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: venue_bookings venue_bookings_booked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_booked_by_fkey FOREIGN KEY (booked_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: venue_bookings venue_bookings_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: venue_bookings venue_bookings_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE;


--
-- Name: venues venues_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: visitor_log visitor_log_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_log
    ADD CONSTRAINT visitor_log_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;


--
-- Name: visitor_log visitor_log_meeting_with_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_log
    ADD CONSTRAINT visitor_log_meeting_with_fkey FOREIGN KEY (meeting_with) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: draft_schedules Institution members can manage their own draft schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Institution members can manage their own draft schedules" ON public.draft_schedules USING ((institution_id = ( SELECT draft_schedules.institution_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())
 LIMIT 1)));


--
-- Name: academic_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;

--
-- Name: academic_events academic_events: institution members can manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "academic_events: institution members can manage" ON public.academic_events USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())))) WITH CHECK ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid()))));


--
-- Name: academic_years; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

--
-- Name: academic_years academic_years: institution members can manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "academic_years: institution members can manage" ON public.academic_years USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())))) WITH CHECK ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid()))));


--
-- Name: admission_enquiries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admission_enquiries ENABLE ROW LEVEL SECURITY;

--
-- Name: admission_enquiries admission_enquiries: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admission_enquiries: admins manage" ON public.admission_enquiries TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = admission_enquiries.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = admission_enquiries.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: admission_enquiries admission_enquiries: admins read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admission_enquiries: admins read" ON public.admission_enquiries FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = admission_enquiries.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: admissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;

--
-- Name: admissions admissions: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admissions: admins manage" ON public.admissions TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = admissions.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = admissions.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: admissions admissions: admins read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admissions: admins read" ON public.admissions FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = admissions.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: admissions admissions: public apply; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admissions: public apply" ON public.admissions FOR INSERT TO authenticated, anon WITH CHECK ((status = 'applied'::text));


--
-- Name: alumni; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;

--
-- Name: alumni alumni: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "alumni: admins manage" ON public.alumni TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = alumni.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = alumni.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: alumni alumni: read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "alumni: read" ON public.alumni FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = alumni.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (institution_id IN ( SELECT private.alumni_institution_ids() AS alumni_institution_ids))));


--
-- Name: alumni alumni: self update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "alumni: self update" ON public.alumni FOR UPDATE TO authenticated USING ((profile_id = auth.uid())) WITH CHECK ((profile_id = auth.uid()));


--
-- Name: alumni_announcements alumni_ann: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "alumni_ann: admins manage" ON public.alumni_announcements TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = alumni_announcements.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = alumni_announcements.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: alumni_announcements alumni_ann: read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "alumni_ann: read" ON public.alumni_announcements FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = alumni_announcements.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (institution_id IN ( SELECT private.alumni_institution_ids() AS alumni_institution_ids))));


--
-- Name: alumni_announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alumni_announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_appraisal_activities appraisal_activities: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "appraisal_activities: admins manage" ON public.staff_appraisal_activities TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.staff_appraisals a
  WHERE ((a.id = staff_appraisal_activities.appraisal_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = a.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
           FROM (private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
             JOIN public.staff s ON ((s.id = a.staff_id)))
          WHERE ((g.tenant_id = a.institution_id) AND (g.role = ANY (ARRAY['HOD'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.department_id = s.department_id))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.staff_appraisals a
  WHERE ((a.id = staff_appraisal_activities.appraisal_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = a.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
           FROM (private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
             JOIN public.staff s ON ((s.id = a.staff_id)))
          WHERE ((g.tenant_id = a.institution_id) AND (g.role = ANY (ARRAY['HOD'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.department_id = s.department_id)))))))));


--
-- Name: staff_appraisal_activities appraisal_activities: staff manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "appraisal_activities: staff manage" ON public.staff_appraisal_activities TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.staff_appraisals a
  WHERE ((a.id = staff_appraisal_activities.appraisal_id) AND (a.staff_id IN ( SELECT staff.id
           FROM public.staff
          WHERE (staff.profile_id = auth.uid()))) AND (a.status = ANY (ARRAY['pending'::text, 'submitted'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.staff_appraisals a
  WHERE ((a.id = staff_appraisal_activities.appraisal_id) AND (a.staff_id IN ( SELECT staff.id
           FROM public.staff
          WHERE (staff.profile_id = auth.uid()))) AND (a.status = ANY (ARRAY['pending'::text, 'submitted'::text]))))));


--
-- Name: staff_appraisal_activities appraisal_activities: staff read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "appraisal_activities: staff read own" ON public.staff_appraisal_activities FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.staff_appraisals a
     JOIN public.staff s ON ((s.id = a.staff_id)))
  WHERE ((a.id = staff_appraisal_activities.appraisal_id) AND (s.profile_id = auth.uid())))));


--
-- Name: staff_appraisals appraisals: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "appraisals: admins manage" ON public.staff_appraisals TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = staff_appraisals.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
   FROM (private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
     JOIN public.staff s ON ((s.id = staff_appraisals.staff_id)))
  WHERE ((g.tenant_id = s.institution_id) AND (g.role = ANY (ARRAY['HOD'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.department_id = s.department_id)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = staff_appraisals.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
   FROM (private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
     JOIN public.staff s ON ((s.id = staff_appraisals.staff_id)))
  WHERE ((g.tenant_id = s.institution_id) AND (g.role = ANY (ARRAY['HOD'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.department_id = s.department_id))))));


--
-- Name: staff_appraisals appraisals: staff read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "appraisals: staff read own" ON public.staff_appraisals FOR SELECT TO authenticated USING ((staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid()))));


--
-- Name: staff_appraisals appraisals: staff self update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "appraisals: staff self update" ON public.staff_appraisals FOR UPDATE TO authenticated USING (((staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid()))) AND (status = ANY (ARRAY['pending'::text, 'submitted'::text])))) WITH CHECK ((staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid()))));


--
-- Name: asset_allocations asset_alloc: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "asset_alloc: admins manage" ON public.asset_allocations TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = asset_allocations.asset_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = a.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = asset_allocations.asset_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = a.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))))));


--
-- Name: asset_allocations asset_alloc: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "asset_alloc: members read" ON public.asset_allocations FOR SELECT TO authenticated USING ((asset_id IN ( SELECT a.id
   FROM public.assets a
  WHERE (a.institution_id IN ( SELECT institution_members.institution_id
           FROM public.institution_members
          WHERE (institution_members.profile_id = auth.uid())
        UNION
         SELECT staff.institution_id
           FROM public.staff
          WHERE (staff.profile_id = auth.uid())
        UNION
         SELECT students.institution_id
           FROM public.students
          WHERE (students.profile_id = auth.uid()))))));


--
-- Name: asset_allocations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_allocations ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_categories asset_categories: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "asset_categories: admins manage" ON public.asset_categories TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = asset_categories.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = asset_categories.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: asset_categories asset_categories: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "asset_categories: members read" ON public.asset_categories FOR SELECT TO authenticated USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid())
UNION
 SELECT students.institution_id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))));


--
-- Name: asset_maintenance_logs asset_maint: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "asset_maint: admins manage" ON public.asset_maintenance_logs TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = asset_maintenance_logs.asset_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = a.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = asset_maintenance_logs.asset_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = a.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))))));


--
-- Name: asset_maintenance_logs asset_maint: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "asset_maint: members read" ON public.asset_maintenance_logs FOR SELECT TO authenticated USING ((asset_id IN ( SELECT a.id
   FROM public.assets a
  WHERE (a.institution_id IN ( SELECT institution_members.institution_id
           FROM public.institution_members
          WHERE (institution_members.profile_id = auth.uid())
        UNION
         SELECT staff.institution_id
           FROM public.staff
          WHERE (staff.profile_id = auth.uid())
        UNION
         SELECT students.institution_id
           FROM public.students
          WHERE (students.profile_id = auth.uid()))))));


--
-- Name: asset_maintenance_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_maintenance_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

--
-- Name: assets assets: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "assets: admins manage" ON public.assets TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = assets.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = assets.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: assets assets: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "assets: members read" ON public.assets FOR SELECT TO authenticated USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid())
UNION
 SELECT students.institution_id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))));


--
-- Name: attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance attendance rbac: delete by admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "attendance rbac: delete by admin" ON public.attendance FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM (private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
     JOIN public.class_schedules cs ON ((cs.id = attendance.schedule_id)))
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = cs.institution_id))))));


--
-- Name: attendance attendance rbac: insert scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "attendance rbac: insert scoped" ON public.attendance FOR INSERT TO authenticated WITH CHECK (((captured_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM (private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
     JOIN public.class_schedules cs ON ((cs.id = attendance.schedule_id)))
  WHERE ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.tenant_id = cs.institution_id))))));


--
-- Name: attendance attendance rbac: select scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "attendance rbac: select scoped" ON public.attendance FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR (captured_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM (private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
     JOIN public.class_schedules cs ON ((cs.id = attendance.schedule_id)))
  WHERE ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.tenant_id = cs.institution_id))))));


--
-- Name: attendance attendance rbac: update scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "attendance rbac: update scoped" ON public.attendance FOR UPDATE TO authenticated USING (((captured_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM (private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
     JOIN public.class_schedules cs ON ((cs.id = attendance.schedule_id)))
  WHERE ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.tenant_id = cs.institution_id)))))) WITH CHECK (((captured_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM (private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
     JOIN public.class_schedules cs ON ((cs.id = attendance.schedule_id)))
  WHERE ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.tenant_id = cs.institution_id))))));


--
-- Name: attendance_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance_audit attendance_audit rbac: insert scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "attendance_audit rbac: insert scoped" ON public.attendance_audit FOR INSERT TO authenticated WITH CHECK (((changed_by = auth.uid()) AND ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM ((private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
     JOIN public.attendance a ON ((a.id = attendance_audit.attendance_id)))
     JOIN public.class_schedules cs ON ((cs.id = a.schedule_id)))
  WHERE ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.tenant_id = cs.institution_id)))))));


--
-- Name: attendance_audit attendance_audit rbac: select scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "attendance_audit rbac: select scoped" ON public.attendance_audit FOR SELECT TO authenticated USING (((changed_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM ((private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
     JOIN public.attendance a ON ((a.id = attendance_audit.attendance_id)))
     JOIN public.class_schedules cs ON ((cs.id = a.schedule_id)))
  WHERE ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.tenant_id = cs.institution_id))))));


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs audit_logs_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_logs_select_admin ON public.audit_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() a(role, tenant_id, department_id, shift_id)
  WHERE ((a.tenant_id = audit_logs.institution_id) AND (a.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role, 'INST_ADMIN'::public.user_role]))))));


--
-- Name: budget_line_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budget_line_items ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_line_items budget_line_items: admins and hod manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "budget_line_items: admins and hod manage" ON public.budget_line_items TO authenticated USING ((budget_id IN ( SELECT db.id
   FROM public.department_budgets db
  WHERE ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = db.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = db.institution_id) AND (g.role = ANY (ARRAY['HOD'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.department_id = db.department_id)))))))) WITH CHECK ((budget_id IN ( SELECT db.id
   FROM public.department_budgets db
  WHERE ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = db.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = db.institution_id) AND (g.role = ANY (ARRAY['HOD'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.department_id = db.department_id))))))));


--
-- Name: bus_routes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bus_routes ENABLE ROW LEVEL SECURITY;

--
-- Name: bus_routes bus_routes: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "bus_routes: admins manage" ON public.bus_routes TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = bus_routes.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = bus_routes.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: bus_routes bus_routes: allocated student reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "bus_routes: allocated student reads" ON public.bus_routes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.transport_allocations ta
     JOIN public.students s ON ((s.id = ta.student_id)))
  WHERE ((ta.bus_route_id = bus_routes.id) AND (s.email = auth.email())))));


--
-- Name: campus_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campus_events ENABLE ROW LEVEL SECURITY;

--
-- Name: campus_events campus_events: admin write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "campus_events: admin write" ON public.campus_events USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE ((institution_members.profile_id = auth.uid()) AND (institution_members.role = ANY (ARRAY['ADMIN'::text, 'PRINCIPAL'::text])))))) WITH CHECK ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE ((institution_members.profile_id = auth.uid()) AND (institution_members.role = ANY (ARRAY['ADMIN'::text, 'PRINCIPAL'::text]))))));


--
-- Name: campus_events campus_events: institution members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "campus_events: institution members read" ON public.campus_events FOR SELECT USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid()))));


--
-- Name: certificate_requests cert: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cert: admins manage" ON public.certificate_requests TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = certificate_requests.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = certificate_requests.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: certificate_requests cert: student reads own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cert: student reads own" ON public.certificate_requests FOR SELECT TO authenticated USING (((requester_type = 'student'::text) AND (student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.email = auth.email())))));


--
-- Name: certificate_requests cert: student requests own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cert: student requests own" ON public.certificate_requests FOR INSERT TO authenticated WITH CHECK (((requester_type = 'student'::text) AND (status = 'requested'::text) AND (student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.email = auth.email())))));


--
-- Name: certificate_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.certificate_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: cia_component_outcomes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cia_component_outcomes ENABLE ROW LEVEL SECURITY;

--
-- Name: cia_component_outcomes cia_component_outcomes: manage own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cia_component_outcomes: manage own institution" ON public.cia_component_outcomes TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role, 'HOD'::public.user_role])) AND (g.tenant_id = cia_component_outcomes.institution_id)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role, 'HOD'::public.user_role])) AND (g.tenant_id = cia_component_outcomes.institution_id))))));


--
-- Name: cia_component_outcomes cia_component_outcomes: select own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cia_component_outcomes: select own institution" ON public.cia_component_outcomes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR (g.tenant_id = cia_component_outcomes.institution_id)))));


--
-- Name: cia_components; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cia_components ENABLE ROW LEVEL SECURITY;

--
-- Name: cia_components cia_components: manage own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cia_components: manage own institution" ON public.cia_components TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.tenant_id = cia_components.institution_id)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.tenant_id = cia_components.institution_id))))));


--
-- Name: cia_components cia_components: select own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cia_components: select own institution" ON public.cia_components FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR (g.tenant_id = cia_components.institution_id)))));


--
-- Name: cia_marks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cia_marks ENABLE ROW LEVEL SECURITY;

--
-- Name: cia_marks cia_marks: manage own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cia_marks: manage own institution" ON public.cia_marks TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.tenant_id = cia_marks.institution_id)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.tenant_id = cia_marks.institution_id))))));


--
-- Name: cia_marks cia_marks: select own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cia_marks: select own institution" ON public.cia_marks FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR (g.tenant_id = cia_marks.institution_id)))));


--
-- Name: cia_marks cia_marks: staff manage own teaching subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cia_marks: staff manage own teaching subjects" ON public.cia_marks TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((public.cia_components cc
     JOIN public.teaching_assignments ta ON (((ta.subject_id = cc.subject_id) AND (ta.institution_id = cc.institution_id))))
     JOIN public.staff s ON ((s.id = ta.staff_id)))
  WHERE ((cc.id = cia_marks.cia_component_id) AND (s.profile_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.cia_components cc
     JOIN public.teaching_assignments ta ON (((ta.subject_id = cc.subject_id) AND (ta.institution_id = cc.institution_id))))
     JOIN public.staff s ON ((s.id = ta.staff_id)))
  WHERE ((cc.id = cia_marks.cia_component_id) AND (s.profile_id = auth.uid())))));


--
-- Name: cia_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cia_results ENABLE ROW LEVEL SECURITY;

--
-- Name: cia_results cia_results: manage own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cia_results: manage own institution" ON public.cia_results TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.tenant_id = cia_results.institution_id)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.tenant_id = cia_results.institution_id))))));


--
-- Name: cia_results cia_results: members read published; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cia_results: members read published" ON public.cia_results FOR SELECT TO authenticated USING (((status = 'published'::text) AND (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.tenant_id = cia_results.institution_id)))));


--
-- Name: cia_results cia_results: staff read all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cia_results: staff read all" ON public.cia_results FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role, 'HOD'::public.user_role, 'STAFF'::public.user_role])) AND (g.tenant_id = cia_results.institution_id))))));


--
-- Name: class_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: class_schedules class_schedules rbac: delete swimlanes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "class_schedules rbac: delete swimlanes" ON public.class_schedules FOR DELETE USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = class_schedules.institution_id)))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'DEPARTMENT_HEAD'::public.user_role) AND (g.department_id = class_schedules.department_id))))));


--
-- Name: class_schedules class_schedules rbac: insert swimlanes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "class_schedules rbac: insert swimlanes" ON public.class_schedules FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = class_schedules.institution_id)))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'DEPARTMENT_HEAD'::public.user_role) AND (g.department_id = class_schedules.department_id))))));


--
-- Name: class_schedules class_schedules rbac: select own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "class_schedules rbac: select own institution" ON public.class_schedules FOR SELECT USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.tenant_id = class_schedules.institution_id)))));


--
-- Name: class_schedules class_schedules rbac: update swimlanes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "class_schedules rbac: update swimlanes" ON public.class_schedules FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = class_schedules.institution_id)))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'DEPARTMENT_HEAD'::public.user_role) AND (g.department_id = class_schedules.department_id)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = class_schedules.institution_id)))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'DEPARTMENT_HEAD'::public.user_role) AND (g.department_id = class_schedules.department_id))))));


--
-- Name: co_po_map; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.co_po_map ENABLE ROW LEVEL SECURITY;

--
-- Name: co_po_map co_po_map: manage own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "co_po_map: manage own institution" ON public.co_po_map TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role, 'HOD'::public.user_role])) AND (g.tenant_id = co_po_map.institution_id)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role, 'HOD'::public.user_role])) AND (g.tenant_id = co_po_map.institution_id))))));


--
-- Name: co_po_map co_po_map: select own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "co_po_map: select own institution" ON public.co_po_map FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR (g.tenant_id = co_po_map.institution_id)))));


--
-- Name: companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: companies companies: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "companies: admins manage" ON public.companies TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = companies.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = companies.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: companies companies: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "companies: members read" ON public.companies FOR SELECT TO authenticated USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid())
UNION
 SELECT students.institution_id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))));


--
-- Name: data_consent_logs consent_logs_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY consent_logs_insert_own ON public.data_consent_logs FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: data_consent_logs consent_logs_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY consent_logs_select_admin ON public.data_consent_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() a(role, tenant_id, department_id, shift_id)
  WHERE ((a.tenant_id = data_consent_logs.institution_id) AND (a.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role, 'INST_ADMIN'::public.user_role]))))));


--
-- Name: data_consent_logs consent_logs_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY consent_logs_select_own ON public.data_consent_logs FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: data_consent_logs consent_logs_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY consent_logs_update_own ON public.data_consent_logs FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: course_outcomes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_outcomes ENABLE ROW LEVEL SECURITY;

--
-- Name: course_outcomes course_outcomes: manage own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "course_outcomes: manage own institution" ON public.course_outcomes TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role, 'HOD'::public.user_role])) AND (g.tenant_id = course_outcomes.institution_id)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role, 'HOD'::public.user_role])) AND (g.tenant_id = course_outcomes.institution_id))))));


--
-- Name: course_outcomes course_outcomes: select own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "course_outcomes: select own institution" ON public.course_outcomes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR (g.tenant_id = course_outcomes.institution_id)))));


--
-- Name: curriculum_units; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.curriculum_units ENABLE ROW LEVEL SECURITY;

--
-- Name: curriculum_units curriculum_units: manage own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "curriculum_units: manage own institution" ON public.curriculum_units TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.tenant_id = curriculum_units.institution_id)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.tenant_id = curriculum_units.institution_id))))));


--
-- Name: curriculum_units curriculum_units: select own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "curriculum_units: select own institution" ON public.curriculum_units FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR (g.tenant_id = curriculum_units.institution_id)))));


--
-- Name: data_consent_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.data_consent_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: data_erasure_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.data_erasure_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: department_budgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.department_budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: department_budgets department_budgets: admins and hod manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "department_budgets: admins and hod manage" ON public.department_budgets TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = department_budgets.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = department_budgets.institution_id) AND (g.role = ANY (ARRAY['HOD'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.department_id = department_budgets.department_id)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = department_budgets.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = department_budgets.institution_id) AND (g.role = ANY (ARRAY['HOD'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.department_id = department_budgets.department_id))))));


--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: departments departments rbac: manage own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "departments rbac: manage own institution" ON public.departments TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = departments.institution_id)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = departments.institution_id))))));


--
-- Name: departments departments rbac: select own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "departments rbac: select own institution" ON public.departments FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.tenant_id = departments.institution_id)))));


--
-- Name: devices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

--
-- Name: devices devices rbac: inst admin manage own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "devices rbac: inst admin manage own institution" ON public.devices TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = devices.tenant_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = devices.tenant_id)))));


--
-- Name: devices devices rbac: manage own or super admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "devices rbac: manage own or super admin" ON public.devices TO authenticated USING (((profile_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))))) WITH CHECK (((profile_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role)))));


--
-- Name: devices devices rbac: select own or super admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "devices rbac: select own or super admin" ON public.devices FOR SELECT TO authenticated USING (((profile_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role)))));


--
-- Name: disciplinary_actions disc_act: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "disc_act: admins manage" ON public.disciplinary_actions TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.disciplinary_incidents i
  WHERE ((i.id = disciplinary_actions.incident_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = i.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.disciplinary_incidents i
  WHERE ((i.id = disciplinary_actions.incident_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = i.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))))));


--
-- Name: disciplinary_incidents disc_inc: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "disc_inc: admins manage" ON public.disciplinary_incidents TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = disciplinary_incidents.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = disciplinary_incidents.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: disciplinary_incidents disc_inc: admins read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "disc_inc: admins read" ON public.disciplinary_incidents FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = disciplinary_incidents.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: disciplinary_incidents disc_inc: members report; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "disc_inc: members report" ON public.disciplinary_incidents FOR INSERT TO authenticated WITH CHECK (((status = 'reported'::text) AND (institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid())
UNION
 SELECT students.institution_id
   FROM public.students
  WHERE (students.profile_id = auth.uid())))));


--
-- Name: disciplinary_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.disciplinary_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: disciplinary_incidents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.disciplinary_incidents ENABLE ROW LEVEL SECURITY;

--
-- Name: draft_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.draft_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: placement_drives drives: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "drives: admins manage" ON public.placement_drives TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = placement_drives.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = placement_drives.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: placement_drives drives: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "drives: members read" ON public.placement_drives FOR SELECT TO authenticated USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid())
UNION
 SELECT students.institution_id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))));


--
-- Name: data_erasure_requests erasure_requests_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY erasure_requests_insert_own ON public.data_erasure_requests FOR INSERT TO authenticated WITH CHECK ((requested_by = auth.uid()));


--
-- Name: data_erasure_requests erasure_requests_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY erasure_requests_select_admin ON public.data_erasure_requests FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() a(role, tenant_id, department_id, shift_id)
  WHERE ((a.tenant_id = data_erasure_requests.institution_id) AND (a.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role, 'INST_ADMIN'::public.user_role]))))));


--
-- Name: data_erasure_requests erasure_requests_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY erasure_requests_select_own ON public.data_erasure_requests FOR SELECT TO authenticated USING ((requested_by = auth.uid()));


--
-- Name: data_erasure_requests erasure_requests_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY erasure_requests_update_admin ON public.data_erasure_requests FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() a(role, tenant_id, department_id, shift_id)
  WHERE ((a.tenant_id = data_erasure_requests.institution_id) AND (a.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role, 'INST_ADMIN'::public.user_role]))))));


--
-- Name: event_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: event_participants event_participants: admin write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "event_participants: admin write" ON public.event_participants USING ((event_id IN ( SELECT campus_events.id
   FROM public.campus_events
  WHERE (campus_events.institution_id IN ( SELECT institution_members.institution_id
           FROM public.institution_members
          WHERE ((institution_members.profile_id = auth.uid()) AND (institution_members.role = ANY (ARRAY['ADMIN'::text, 'PRINCIPAL'::text])))))))) WITH CHECK ((event_id IN ( SELECT campus_events.id
   FROM public.campus_events
  WHERE (campus_events.institution_id IN ( SELECT institution_members.institution_id
           FROM public.institution_members
          WHERE ((institution_members.profile_id = auth.uid()) AND (institution_members.role = ANY (ARRAY['ADMIN'::text, 'PRINCIPAL'::text]))))))));


--
-- Name: event_participants event_participants: institution members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "event_participants: institution members read" ON public.event_participants FOR SELECT USING ((event_id IN ( SELECT campus_events.id
   FROM public.campus_events
  WHERE (campus_events.institution_id IN ( SELECT institution_members.institution_id
           FROM public.institution_members
          WHERE (institution_members.profile_id = auth.uid()))))));


--
-- Name: event_participants event_participants: student read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "event_participants: student read own" ON public.event_participants FOR SELECT USING ((student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))));


--
-- Name: event_participants event_participants: student self-register; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "event_participants: student self-register" ON public.event_participants FOR INSERT WITH CHECK (((student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))) AND (role = 'participant'::text)));


--
-- Name: exam_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_schedules exam_schedules: institution members can manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "exam_schedules: institution members can manage" ON public.exam_schedules USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid()))));


--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_concessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_concessions ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_concessions fee_concessions: institution members can manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "fee_concessions: institution members can manage" ON public.fee_concessions USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())))) WITH CHECK ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid()))));


--
-- Name: fee_demands; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_demands ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_demands fee_demands: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "fee_demands: admins manage" ON public.fee_demands TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = fee_demands.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = fee_demands.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: fee_demands fee_demands: student reads own or admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "fee_demands: student reads own or admin" ON public.fee_demands FOR SELECT TO authenticated USING (((student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = fee_demands.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: fee_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_structures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_forms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedback_forms ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_forms fform: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "fform: admins manage" ON public.feedback_forms TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = feedback_forms.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = feedback_forms.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: feedback_forms fform: eligible student reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "fform: eligible student reads" ON public.feedback_forms FOR SELECT TO authenticated USING ((is_active AND (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.email = auth.email()) AND (s.institution_id = feedback_forms.institution_id) AND ((feedback_forms.department_id IS NULL) OR (s.department_id = feedback_forms.department_id)))))));


--
-- Name: feedback_forms fform: rated staff reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "fform: rated staff reads" ON public.feedback_forms FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.staff st
  WHERE ((st.id = feedback_forms.staff_id) AND (st.email = auth.email())))));


--
-- Name: expenses finance: expenses delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "finance: expenses delete" ON public.expenses FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = expenses.institution_id))))));


--
-- Name: expenses finance: expenses insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "finance: expenses insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR (g.tenant_id = expenses.institution_id)))));


--
-- Name: expenses finance: expenses select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "finance: expenses select" ON public.expenses FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR (g.tenant_id = expenses.institution_id)))));


--
-- Name: expenses finance: expenses update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "finance: expenses update" ON public.expenses FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = expenses.institution_id))))));


--
-- Name: fee_payments finance: fee_payments delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "finance: fee_payments delete" ON public.fee_payments FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = fee_payments.institution_id))))));


--
-- Name: fee_payments finance: fee_payments insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "finance: fee_payments insert" ON public.fee_payments FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = fee_payments.institution_id))))));


--
-- Name: fee_payments finance: fee_payments select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "finance: fee_payments select" ON public.fee_payments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR (g.tenant_id = fee_payments.institution_id)))));


--
-- Name: fee_payments finance: fee_payments update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "finance: fee_payments update" ON public.fee_payments FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = fee_payments.institution_id))))));


--
-- Name: fee_structures finance: fee_structures delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "finance: fee_structures delete" ON public.fee_structures FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = fee_structures.institution_id))))));


--
-- Name: fee_structures finance: fee_structures insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "finance: fee_structures insert" ON public.fee_structures FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = fee_structures.institution_id))))));


--
-- Name: fee_structures finance: fee_structures select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "finance: fee_structures select" ON public.fee_structures FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR (g.tenant_id = fee_structures.institution_id)))));


--
-- Name: fee_structures finance: fee_structures update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "finance: fee_structures update" ON public.fee_structures FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = fee_structures.institution_id))))));


--
-- Name: salary_disbursements finance: salary_disbursements select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "finance: salary_disbursements select" ON public.salary_disbursements FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR (g.tenant_id = salary_disbursements.institution_id)))));


--
-- Name: salary_disbursements finance: salary_disbursements write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "finance: salary_disbursements write" ON public.salary_disbursements TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = salary_disbursements.institution_id))))));


--
-- Name: salary_structures finance: salary_structures select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "finance: salary_structures select" ON public.salary_structures FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR (g.tenant_id = salary_structures.institution_id)))));


--
-- Name: salary_structures finance: salary_structures write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "finance: salary_structures write" ON public.salary_structures TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = salary_structures.institution_id))))));


--
-- Name: feedback_responses fresp: admins read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "fresp: admins read" ON public.feedback_responses FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = feedback_responses.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: feedback_responses fresp: eligible student submits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "fresp: eligible student submits" ON public.feedback_responses FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.feedback_forms f
     JOIN public.students s ON ((s.email = auth.email())))
  WHERE ((f.id = feedback_responses.form_id) AND (f.institution_id = feedback_responses.institution_id) AND f.is_active AND (s.institution_id = f.institution_id) AND ((f.department_id IS NULL) OR (s.department_id = f.department_id))))));


--
-- Name: feedback_responses fresp: rated staff read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "fresp: rated staff read" ON public.feedback_responses FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.feedback_forms f
     JOIN public.staff st ON ((st.id = f.staff_id)))
  WHERE ((f.id = feedback_responses.form_id) AND (st.email = auth.email())))));


--
-- Name: feedback_submissions fsub: admins read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "fsub: admins read" ON public.feedback_submissions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.feedback_forms f
  WHERE ((f.id = feedback_submissions.form_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = f.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))))));


--
-- Name: feedback_submissions fsub: student own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "fsub: student own" ON public.feedback_submissions TO authenticated USING ((student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.email = auth.email())))) WITH CHECK ((student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.email = auth.email()))));


--
-- Name: grievances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;

--
-- Name: grievances grievances: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "grievances: admins manage" ON public.grievances TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = grievances.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = grievances.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: grievances grievances: complainant reads own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "grievances: complainant reads own" ON public.grievances FOR SELECT TO authenticated USING (((submitted_by IS NOT NULL) AND (submitted_by = auth.uid())));


--
-- Name: grievances grievances: members file; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "grievances: members file" ON public.grievances FOR INSERT TO authenticated WITH CHECK (((status = 'submitted'::text) AND ((submitted_by = auth.uid()) OR (submitted_by IS NULL)) AND (institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid())
UNION
 SELECT students.institution_id
   FROM public.students
  WHERE (students.profile_id = auth.uid())))));


--
-- Name: guest_lectures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.guest_lectures ENABLE ROW LEVEL SECURITY;

--
-- Name: guest_lectures guest_lectures_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY guest_lectures_delete ON public.guest_lectures FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() a(role, tenant_id, department_id, shift_id)
  WHERE ((a.tenant_id = guest_lectures.institution_id) AND (a.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role, 'INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role]))))));


--
-- Name: guest_lectures guest_lectures_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY guest_lectures_insert ON public.guest_lectures FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() a(role, tenant_id, department_id, shift_id)
  WHERE ((a.tenant_id = guest_lectures.institution_id) AND (a.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role, 'INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role, 'STAFF'::public.user_role]))))));


--
-- Name: guest_lectures guest_lectures_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY guest_lectures_select ON public.guest_lectures FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() a(role, tenant_id, department_id, shift_id)
  WHERE (a.tenant_id = guest_lectures.institution_id))));


--
-- Name: guest_lectures guest_lectures_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY guest_lectures_update ON public.guest_lectures FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() a(role, tenant_id, department_id, shift_id)
  WHERE ((a.tenant_id = guest_lectures.institution_id) AND ((a.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role, 'INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) OR ((a.role = 'STAFF'::public.user_role) AND (guest_lectures.organized_by = ( SELECT s.id
           FROM public.staff s
          WHERE ((s.profile_id = auth.uid()) AND (s.institution_id = guest_lectures.institution_id))
         LIMIT 1))))))));


--
-- Name: hostel_allocations hostel_alloc: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "hostel_alloc: admins manage" ON public.hostel_allocations TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.hostels h
  WHERE ((h.id = hostel_allocations.hostel_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = h.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.hostels h
  WHERE ((h.id = hostel_allocations.hostel_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = h.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))))));


--
-- Name: hostel_allocations hostel_alloc: student reads own or admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "hostel_alloc: student reads own or admin" ON public.hostel_allocations FOR SELECT TO authenticated USING (((student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.hostels h
  WHERE ((h.id = hostel_allocations.hostel_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = h.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))))))));


--
-- Name: hostel_allocations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hostel_allocations ENABLE ROW LEVEL SECURITY;

--
-- Name: hostel_announcements hostel_ann: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "hostel_ann: admins manage" ON public.hostel_announcements TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.hostels h
  WHERE ((h.id = hostel_announcements.hostel_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = h.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.hostels h
  WHERE ((h.id = hostel_announcements.hostel_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = h.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))))));


--
-- Name: hostel_announcements hostel_ann: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "hostel_ann: members read" ON public.hostel_announcements FOR SELECT TO authenticated USING ((hostel_id IN ( SELECT h.id
   FROM public.hostels h
  WHERE (h.institution_id IN ( SELECT institution_members.institution_id
           FROM public.institution_members
          WHERE (institution_members.profile_id = auth.uid())
        UNION
         SELECT staff.institution_id
           FROM public.staff
          WHERE (staff.profile_id = auth.uid())
        UNION
         SELECT students.institution_id
           FROM public.students
          WHERE (students.profile_id = auth.uid()))))));


--
-- Name: hostel_announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hostel_announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: hostel_maintenance_requests hostel_maint: admins update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "hostel_maint: admins update" ON public.hostel_maintenance_requests FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.hostels h
  WHERE ((h.id = hostel_maintenance_requests.hostel_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = h.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.hostels h
  WHERE ((h.id = hostel_maintenance_requests.hostel_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = h.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))))));


--
-- Name: hostel_maintenance_requests hostel_maint: member raises own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "hostel_maint: member raises own" ON public.hostel_maintenance_requests FOR INSERT TO authenticated WITH CHECK ((raised_by = auth.uid()));


--
-- Name: hostel_maintenance_requests hostel_maint: raiser or admin read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "hostel_maint: raiser or admin read" ON public.hostel_maintenance_requests FOR SELECT TO authenticated USING (((raised_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.hostels h
  WHERE ((h.id = hostel_maintenance_requests.hostel_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = h.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))))))));


--
-- Name: hostel_maintenance_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hostel_maintenance_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: hostel_rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hostel_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: hostel_rooms hostel_rooms: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "hostel_rooms: admins manage" ON public.hostel_rooms TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.hostels h
  WHERE ((h.id = hostel_rooms.hostel_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = h.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.hostels h
  WHERE ((h.id = hostel_rooms.hostel_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = h.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))))));


--
-- Name: hostel_rooms hostel_rooms: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "hostel_rooms: members read" ON public.hostel_rooms FOR SELECT TO authenticated USING ((hostel_id IN ( SELECT h.id
   FROM public.hostels h
  WHERE (h.institution_id IN ( SELECT institution_members.institution_id
           FROM public.institution_members
          WHERE (institution_members.profile_id = auth.uid())
        UNION
         SELECT staff.institution_id
           FROM public.staff
          WHERE (staff.profile_id = auth.uid())
        UNION
         SELECT students.institution_id
           FROM public.students
          WHERE (students.profile_id = auth.uid()))))));


--
-- Name: hostels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;

--
-- Name: hostels hostels: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "hostels: admins manage" ON public.hostels TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = hostels.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = hostels.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: hostels hostels: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "hostels: members read" ON public.hostels FOR SELECT TO authenticated USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid())
UNION
 SELECT students.institution_id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))));


--
-- Name: industry_interactions iint: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "iint: admins manage" ON public.industry_interactions TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = industry_interactions.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = industry_interactions.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: industry_interactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_interactions ENABLE ROW LEVEL SECURITY;

--
-- Name: institution_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.institution_members ENABLE ROW LEVEL SECURITY;

--
-- Name: institution_members institution_members: delete super and inst admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "institution_members: delete super and inst admin" ON public.institution_members FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = institution_members.institution_id))))));


--
-- Name: institution_members institution_members: insert super and inst admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "institution_members: insert super and inst admin" ON public.institution_members FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = institution_members.institution_id))))));


--
-- Name: institution_members institution_members: select own and scoped admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "institution_members: select own and scoped admins" ON public.institution_members FOR SELECT TO authenticated USING (((profile_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = institution_members.institution_id)))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'DEPARTMENT_HEAD'::public.user_role) AND (g.tenant_id = institution_members.institution_id) AND (NOT (g.department_id IS DISTINCT FROM institution_members.department_id)))))));


--
-- Name: institution_members institution_members: update super and inst admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "institution_members: update super and inst admin" ON public.institution_members FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = institution_members.institution_id)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = institution_members.institution_id))))));


--
-- Name: institution_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.institution_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: institutions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

--
-- Name: institutions institutions rbac: inst admin update own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "institutions rbac: inst admin update own" ON public.institutions FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = institutions.id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = institutions.id)))));


--
-- Name: institutions institutions rbac: select own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "institutions rbac: select own" ON public.institutions FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.tenant_id = institutions.id)))));


--
-- Name: institutions institutions rbac: super admin manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "institutions rbac: super admin manage" ON public.institutions TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role)))) WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))));


--
-- Name: internships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;

--
-- Name: internships internships_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY internships_delete ON public.internships FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() a(role, tenant_id, department_id, shift_id)
  WHERE ((a.tenant_id = internships.institution_id) AND ((a.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role, 'INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) OR ((a.role = 'STUDENT'::public.user_role) AND (internships.student_id = ( SELECT s.id
           FROM public.students s
          WHERE ((s.profile_id = auth.uid()) AND (s.institution_id = internships.institution_id))
         LIMIT 1))))))));


--
-- Name: internships internships_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY internships_insert ON public.internships FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() a(role, tenant_id, department_id, shift_id)
  WHERE ((a.tenant_id = internships.institution_id) AND ((a.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role, 'INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) OR ((a.role = 'STUDENT'::public.user_role) AND (internships.student_id = ( SELECT s.id
           FROM public.students s
          WHERE ((s.profile_id = auth.uid()) AND (s.institution_id = internships.institution_id))
         LIMIT 1))))))));


--
-- Name: internships internships_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY internships_select ON public.internships FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() a(role, tenant_id, department_id, shift_id)
  WHERE (a.tenant_id = internships.institution_id))));


--
-- Name: internships internships_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY internships_update ON public.internships FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() a(role, tenant_id, department_id, shift_id)
  WHERE ((a.tenant_id = internships.institution_id) AND ((a.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role, 'INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) OR ((a.role = 'STUDENT'::public.user_role) AND (internships.student_id = ( SELECT s.id
           FROM public.students s
          WHERE ((s.profile_id = auth.uid()) AND (s.institution_id = internships.institution_id))
         LIMIT 1))))))));


--
-- Name: subscription_invoices invoices: institution admin reads own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invoices: institution admin reads own" ON public.subscription_invoices FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = subscription_invoices.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))));


--
-- Name: subscription_invoices invoices: super admin manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invoices: super admin manage" ON public.subscription_invoices TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role)))) WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))));


--
-- Name: iqac_action_items iqac_action: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "iqac_action: admins manage" ON public.iqac_action_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.iqac_meetings m
  WHERE ((m.id = iqac_action_items.meeting_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = m.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.iqac_meetings m
  WHERE ((m.id = iqac_action_items.meeting_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = m.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))))));


--
-- Name: iqac_action_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.iqac_action_items ENABLE ROW LEVEL SECURITY;

--
-- Name: iqac_meetings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.iqac_meetings ENABLE ROW LEVEL SECURITY;

--
-- Name: iqac_meetings iqac_mtg: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "iqac_mtg: admins manage" ON public.iqac_meetings TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = iqac_meetings.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = iqac_meetings.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: job_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: job_applications job_applications: institution members can manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "job_applications: institution members can manage" ON public.job_applications USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid()))));


--
-- Name: job_applications job_applications: super admin full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "job_applications: super admin full access" ON public.job_applications USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'SUPER_ADMIN'::text)))));


--
-- Name: job_postings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

--
-- Name: job_postings job_postings: institution members can manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "job_postings: institution members can manage" ON public.job_postings USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid()))));


--
-- Name: job_postings job_postings: super admin full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "job_postings: super admin full access" ON public.job_postings USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'SUPER_ADMIN'::text)))));


--
-- Name: laboratory_attendance lab_attendance: staff manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lab_attendance: staff manage" ON public.laboratory_attendance TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((public.laboratory_sessions s
     JOIN public.laboratory_batches b ON ((b.id = s.laboratory_batch_id)))
     JOIN public.laboratories l ON ((l.id = b.laboratory_id)))
  WHERE ((s.id = laboratory_attendance.session_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = l.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
           FROM public.staff st
          WHERE ((st.id = l.lab_assistant_id) AND (st.profile_id = auth.uid()))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.laboratory_sessions s
     JOIN public.laboratory_batches b ON ((b.id = s.laboratory_batch_id)))
     JOIN public.laboratories l ON ((l.id = b.laboratory_id)))
  WHERE ((s.id = laboratory_attendance.session_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = l.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
           FROM public.staff st
          WHERE ((st.id = l.lab_assistant_id) AND (st.profile_id = auth.uid())))))))));


--
-- Name: laboratory_attendance lab_attendance: student reads own or staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lab_attendance: student reads own or staff" ON public.laboratory_attendance FOR SELECT TO authenticated USING (((student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM ((public.laboratory_sessions s
     JOIN public.laboratory_batches b ON ((b.id = s.laboratory_batch_id)))
     JOIN public.laboratories l ON ((l.id = b.laboratory_id)))
  WHERE ((s.id = laboratory_attendance.session_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = l.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
           FROM public.staff st
          WHERE ((st.id = l.lab_assistant_id) AND (st.profile_id = auth.uid()))))))))));


--
-- Name: laboratory_batches lab_batches: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lab_batches: members read" ON public.laboratory_batches FOR SELECT TO authenticated USING ((laboratory_id IN ( SELECT l.id
   FROM public.laboratories l
  WHERE (l.institution_id IN ( SELECT institution_members.institution_id
           FROM public.institution_members
          WHERE (institution_members.profile_id = auth.uid())
        UNION
         SELECT staff.institution_id
           FROM public.staff
          WHERE (staff.profile_id = auth.uid())
        UNION
         SELECT students.institution_id
           FROM public.students
          WHERE (students.profile_id = auth.uid()))))));


--
-- Name: laboratory_batches lab_batches: staff manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lab_batches: staff manage" ON public.laboratory_batches TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.laboratories l
  WHERE ((l.id = laboratory_batches.laboratory_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = l.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
           FROM public.staff st
          WHERE ((st.id = l.lab_assistant_id) AND (st.profile_id = auth.uid()))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.laboratories l
  WHERE ((l.id = laboratory_batches.laboratory_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = l.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
           FROM public.staff st
          WHERE ((st.id = l.lab_assistant_id) AND (st.profile_id = auth.uid())))))))));


--
-- Name: laboratory_experiments lab_experiments: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lab_experiments: members read" ON public.laboratory_experiments FOR SELECT TO authenticated USING ((laboratory_id IN ( SELECT l.id
   FROM public.laboratories l
  WHERE (l.institution_id IN ( SELECT institution_members.institution_id
           FROM public.institution_members
          WHERE (institution_members.profile_id = auth.uid())
        UNION
         SELECT staff.institution_id
           FROM public.staff
          WHERE (staff.profile_id = auth.uid())
        UNION
         SELECT students.institution_id
           FROM public.students
          WHERE (students.profile_id = auth.uid()))))));


--
-- Name: laboratory_experiments lab_experiments: staff manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lab_experiments: staff manage" ON public.laboratory_experiments TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.laboratories l
  WHERE ((l.id = laboratory_experiments.laboratory_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = l.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
           FROM public.staff st
          WHERE ((st.id = l.lab_assistant_id) AND (st.profile_id = auth.uid()))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.laboratories l
  WHERE ((l.id = laboratory_experiments.laboratory_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = l.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
           FROM public.staff st
          WHERE ((st.id = l.lab_assistant_id) AND (st.profile_id = auth.uid())))))))));


--
-- Name: laboratory_sessions lab_sessions: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lab_sessions: members read" ON public.laboratory_sessions FOR SELECT TO authenticated USING ((laboratory_batch_id IN ( SELECT b.id
   FROM (public.laboratory_batches b
     JOIN public.laboratories l ON ((l.id = b.laboratory_id)))
  WHERE (l.institution_id IN ( SELECT institution_members.institution_id
           FROM public.institution_members
          WHERE (institution_members.profile_id = auth.uid())
        UNION
         SELECT staff.institution_id
           FROM public.staff
          WHERE (staff.profile_id = auth.uid())
        UNION
         SELECT students.institution_id
           FROM public.students
          WHERE (students.profile_id = auth.uid()))))));


--
-- Name: laboratory_sessions lab_sessions: staff manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lab_sessions: staff manage" ON public.laboratory_sessions TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.laboratory_batches b
     JOIN public.laboratories l ON ((l.id = b.laboratory_id)))
  WHERE ((b.id = laboratory_sessions.laboratory_batch_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = l.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
           FROM public.staff st
          WHERE ((st.id = l.lab_assistant_id) AND (st.profile_id = auth.uid()))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.laboratory_batches b
     JOIN public.laboratories l ON ((l.id = b.laboratory_id)))
  WHERE ((b.id = laboratory_sessions.laboratory_batch_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = l.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
           FROM public.staff st
          WHERE ((st.id = l.lab_assistant_id) AND (st.profile_id = auth.uid())))))))));


--
-- Name: laboratories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.laboratories ENABLE ROW LEVEL SECURITY;

--
-- Name: laboratory_attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.laboratory_attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: laboratory_batches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.laboratory_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: laboratory_experiments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.laboratory_experiments ENABLE ROW LEVEL SECURITY;

--
-- Name: laboratory_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.laboratory_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: laboratories labs: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "labs: admins manage" ON public.laboratories TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = laboratories.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = laboratories.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: laboratories labs: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "labs: members read" ON public.laboratories FOR SELECT TO authenticated USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid())
UNION
 SELECT students.institution_id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))));


--
-- Name: lms_assignments lasn: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lasn: admins manage" ON public.lms_assignments TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = lms_assignments.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = lms_assignments.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: lms_assignments lasn: dept students read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lasn: dept students read" ON public.lms_assignments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.students s
     JOIN public.subjects sub ON ((sub.id = lms_assignments.subject_id)))
  WHERE ((s.email = auth.email()) AND (s.department_id = sub.department_id)))));


--
-- Name: lms_assignments lasn: teaching staff manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lasn: teaching staff manage" ON public.lms_assignments TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.teaching_assignments ta
     JOIN public.staff st ON ((st.id = ta.staff_id)))
  WHERE ((ta.subject_id = lms_assignments.subject_id) AND (st.email = auth.email()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.teaching_assignments ta
     JOIN public.staff st ON ((st.id = ta.staff_id)))
  WHERE ((ta.subject_id = lms_assignments.subject_id) AND (st.email = auth.email())))));


--
-- Name: leave_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_requests leave_requests rbac: admins manage institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "leave_requests rbac: admins manage institution" ON public.leave_requests TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.tenant_id = leave_requests.institution_id)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.tenant_id = leave_requests.institution_id))))));


--
-- Name: leave_requests leave_requests: staff apply own pending; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "leave_requests: staff apply own pending" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (((status = 'pending'::text) AND (staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid())))));


--
-- Name: leave_requests leave_requests: staff read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "leave_requests: staff read own" ON public.leave_requests FOR SELECT TO authenticated USING ((staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid()))));


--
-- Name: lesson_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_plans lesson_plans_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lesson_plans_delete ON public.lesson_plans FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() a(role, tenant_id, department_id, shift_id)
  WHERE ((a.tenant_id = lesson_plans.institution_id) AND ((a.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role, 'INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) OR ((a.role = 'STAFF'::public.user_role) AND (lesson_plans.staff_id = ( SELECT s.id
           FROM public.staff s
          WHERE ((s.profile_id = auth.uid()) AND (s.institution_id = lesson_plans.institution_id))
         LIMIT 1))))))));


--
-- Name: lesson_plans lesson_plans_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lesson_plans_insert ON public.lesson_plans FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() a(role, tenant_id, department_id, shift_id)
  WHERE ((a.tenant_id = lesson_plans.institution_id) AND ((a.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role, 'INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) OR ((a.role = 'STAFF'::public.user_role) AND (lesson_plans.staff_id = ( SELECT s.id
           FROM public.staff s
          WHERE ((s.profile_id = auth.uid()) AND (s.institution_id = lesson_plans.institution_id))
         LIMIT 1))))))));


--
-- Name: lesson_plans lesson_plans_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lesson_plans_select ON public.lesson_plans FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() a(role, tenant_id, department_id, shift_id)
  WHERE (a.tenant_id = lesson_plans.institution_id))));


--
-- Name: lesson_plans lesson_plans_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lesson_plans_update ON public.lesson_plans FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() a(role, tenant_id, department_id, shift_id)
  WHERE ((a.tenant_id = lesson_plans.institution_id) AND ((a.role = ANY (ARRAY['SUPER_ADMIN'::public.user_role, 'INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) OR ((a.role = 'STAFF'::public.user_role) AND (lesson_plans.staff_id = ( SELECT s.id
           FROM public.staff s
          WHERE ((s.profile_id = auth.uid()) AND (s.institution_id = lesson_plans.institution_id))
         LIMIT 1))))))));


--
-- Name: library_books; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;

--
-- Name: library_books library_books: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "library_books: admins manage" ON public.library_books TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = library_books.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = library_books.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: library_books library_books: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "library_books: members read" ON public.library_books FOR SELECT TO authenticated USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid())
UNION
 SELECT students.institution_id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))));


--
-- Name: library_lendings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.library_lendings ENABLE ROW LEVEL SECURITY;

--
-- Name: library_lendings library_lendings: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "library_lendings: admins manage" ON public.library_lendings TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = library_lendings.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = library_lendings.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: library_lendings library_lendings: borrower reads own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "library_lendings: borrower reads own" ON public.library_lendings FOR SELECT TO authenticated USING (((borrower_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = library_lendings.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: lms_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lms_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: lms_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lms_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: lms_submissions lsub: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lsub: admins manage" ON public.lms_submissions TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.lms_assignments a
  WHERE ((a.id = lms_submissions.assignment_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = a.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.lms_assignments a
  WHERE ((a.id = lms_submissions.assignment_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = a.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))))));


--
-- Name: lms_submissions lsub: student own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lsub: student own" ON public.lms_submissions TO authenticated USING ((student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.email = auth.email())))) WITH CHECK ((student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.email = auth.email()))));


--
-- Name: lms_submissions lsub: teaching staff grade; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lsub: teaching staff grade" ON public.lms_submissions TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((public.lms_assignments a
     JOIN public.teaching_assignments ta ON ((ta.subject_id = a.subject_id)))
     JOIN public.staff st ON ((st.id = ta.staff_id)))
  WHERE ((a.id = lms_submissions.assignment_id) AND (st.email = auth.email()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.lms_assignments a
     JOIN public.teaching_assignments ta ON ((ta.subject_id = a.subject_id)))
     JOIN public.staff st ON ((st.id = ta.staff_id)))
  WHERE ((a.id = lms_submissions.assignment_id) AND (st.email = auth.email())))));


--
-- Name: medical_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

--
-- Name: medical_records medical_records: admin insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "medical_records: admin insert" ON public.medical_records FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.institution_members
  WHERE ((institution_members.institution_id = medical_records.institution_id) AND (institution_members.profile_id = auth.uid()) AND (institution_members.role = ANY (ARRAY['ADMIN'::text, 'PRINCIPAL'::text]))))));


--
-- Name: medical_records medical_records: admin update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "medical_records: admin update" ON public.medical_records FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.institution_members
  WHERE ((institution_members.institution_id = medical_records.institution_id) AND (institution_members.profile_id = auth.uid()) AND (institution_members.role = ANY (ARRAY['ADMIN'::text, 'PRINCIPAL'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.institution_members
  WHERE ((institution_members.institution_id = medical_records.institution_id) AND (institution_members.profile_id = auth.uid()) AND (institution_members.role = ANY (ARRAY['ADMIN'::text, 'PRINCIPAL'::text]))))));


--
-- Name: medical_records medical_records: staff admin read all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "medical_records: staff admin read all" ON public.medical_records FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.institution_members
  WHERE ((institution_members.institution_id = medical_records.institution_id) AND (institution_members.profile_id = auth.uid()) AND (institution_members.role <> 'STUDENT'::text)))));


--
-- Name: medical_records medical_records: student reads own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "medical_records: student reads own" ON public.medical_records FOR SELECT USING ((student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))));


--
-- Name: medical_visits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.medical_visits ENABLE ROW LEVEL SECURITY;

--
-- Name: medical_visits medical_visits: patient reads own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "medical_visits: patient reads own" ON public.medical_visits FOR SELECT USING ((patient_id = auth.uid()));


--
-- Name: medical_visits medical_visits: staff admin insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "medical_visits: staff admin insert" ON public.medical_visits FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.institution_members
  WHERE ((institution_members.institution_id = medical_visits.institution_id) AND (institution_members.profile_id = auth.uid()) AND (institution_members.role <> 'STUDENT'::text)))));


--
-- Name: medical_visits medical_visits: staff admin read all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "medical_visits: staff admin read all" ON public.medical_visits FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.institution_members
  WHERE ((institution_members.institution_id = medical_visits.institution_id) AND (institution_members.profile_id = auth.uid()) AND (institution_members.role <> 'STUDENT'::text)))));


--
-- Name: mess_billing; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mess_billing ENABLE ROW LEVEL SECURITY;

--
-- Name: mess_billing mess_billing: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "mess_billing: admins manage" ON public.mess_billing TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = mess_billing.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = mess_billing.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: mess_billing mess_billing: student reads own or admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "mess_billing: student reads own or admin" ON public.mess_billing FOR SELECT TO authenticated USING (((student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = mess_billing.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: mess_menu; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mess_menu ENABLE ROW LEVEL SECURITY;

--
-- Name: mess_menu mess_menu: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "mess_menu: admins manage" ON public.mess_menu TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.hostels h
  WHERE ((h.id = mess_menu.hostel_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = h.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.hostels h
  WHERE ((h.id = mess_menu.hostel_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = h.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))))));


--
-- Name: mess_menu mess_menu: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "mess_menu: members read" ON public.mess_menu FOR SELECT TO authenticated USING ((hostel_id IN ( SELECT h.id
   FROM public.hostels h
  WHERE (h.institution_id IN ( SELECT institution_members.institution_id
           FROM public.institution_members
          WHERE (institution_members.profile_id = auth.uid())
        UNION
         SELECT staff.institution_id
           FROM public.staff
          WHERE (staff.profile_id = auth.uid())
        UNION
         SELECT students.institution_id
           FROM public.students
          WHERE (students.profile_id = auth.uid()))))));


--
-- Name: monthly_statutory_deductions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monthly_statutory_deductions ENABLE ROW LEVEL SECURITY;

--
-- Name: monthly_statutory_deductions monthly_statutory_deductions: institution members manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "monthly_statutory_deductions: institution members manage" ON public.monthly_statutory_deductions USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid()))));


--
-- Name: monthly_statutory_deductions monthly_statutory_deductions: staff read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "monthly_statutory_deductions: staff read own" ON public.monthly_statutory_deductions FOR SELECT USING ((staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.email = (( SELECT users.email
           FROM auth.users
          WHERE (users.id = auth.uid())))::text))));


--
-- Name: mou_partners mou: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "mou: admins manage" ON public.mou_partners TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = mou_partners.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = mou_partners.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: mou_partners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mou_partners ENABLE ROW LEVEL SECURITY;

--
-- Name: notices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

--
-- Name: notices notices: admins delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notices: admins delete" ON public.notices FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = notices.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: notices notices: admins insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notices: admins insert" ON public.notices FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = notices.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: notices notices: admins update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notices: admins update" ON public.notices FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = notices.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = notices.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: notices notices: institution members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notices: institution members read" ON public.notices FOR SELECT TO authenticated USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid())
UNION
 SELECT students.institution_id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications: recipient marks own read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notifications: recipient marks own read" ON public.notifications FOR UPDATE TO authenticated USING ((recipient_id = auth.uid())) WITH CHECK ((recipient_id = auth.uid()));


--
-- Name: notifications notifications: recipient reads own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notifications: recipient reads own" ON public.notifications FOR SELECT TO authenticated USING ((recipient_id = auth.uid()));


--
-- Name: online_exam_answers oanswer: admins read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "oanswer: admins read" ON public.online_exam_answers TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.online_exam_sessions ses
     JOIN public.online_exams e ON ((e.id = ses.exam_id)))
  WHERE ((ses.id = online_exam_answers.session_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = e.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.online_exam_sessions ses
     JOIN public.online_exams e ON ((e.id = ses.exam_id)))
  WHERE ((ses.id = online_exam_answers.session_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = e.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))))));


--
-- Name: online_exams oexam: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "oexam: admins manage" ON public.online_exams TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = online_exams.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = online_exams.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: online_exams oexam: eligible student reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "oexam: eligible student reads" ON public.online_exams FOR SELECT TO authenticated USING (((status = ANY (ARRAY['published'::text, 'closed'::text])) AND (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.email = auth.email()) AND (s.institution_id = online_exams.institution_id) AND ((online_exams.department_id IS NULL) OR (s.department_id = online_exams.department_id)))))));


--
-- Name: online_exam_answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.online_exam_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: online_exam_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.online_exam_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: online_exam_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.online_exam_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: online_exam_violations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.online_exam_violations ENABLE ROW LEVEL SECURITY;

--
-- Name: online_exams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.online_exams ENABLE ROW LEVEL SECURITY;

--
-- Name: online_exam_questions oquestion: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "oquestion: admins manage" ON public.online_exam_questions TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.online_exams e
  WHERE ((e.id = online_exam_questions.exam_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = e.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.online_exams e
  WHERE ((e.id = online_exam_questions.exam_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = e.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))))));


--
-- Name: online_exam_sessions osession: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "osession: admins manage" ON public.online_exam_sessions TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.online_exams e
  WHERE ((e.id = online_exam_sessions.exam_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = e.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.online_exams e
  WHERE ((e.id = online_exam_sessions.exam_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = e.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))))));


--
-- Name: online_exam_sessions osession: student reads own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "osession: student reads own" ON public.online_exam_sessions FOR SELECT TO authenticated USING ((student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.email = auth.email()))));


--
-- Name: student_outpasses outpass: admin delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "outpass: admin delete" ON public.student_outpasses FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = student_outpasses.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: student_outpasses outpass: read own/warden/admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "outpass: read own/warden/admin" ON public.student_outpasses FOR SELECT TO authenticated USING (((student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = student_outpasses.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
   FROM (public.hostels h
     JOIN public.staff st ON ((st.id = h.warden_id)))
  WHERE ((h.id = student_outpasses.hostel_id) AND (st.profile_id = auth.uid()))))));


--
-- Name: student_outpasses outpass: student applies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "outpass: student applies" ON public.student_outpasses FOR INSERT TO authenticated WITH CHECK ((student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))));


--
-- Name: student_outpasses outpass: warden/admin manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "outpass: warden/admin manage" ON public.student_outpasses FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = student_outpasses.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
   FROM (public.hostels h
     JOIN public.staff st ON ((st.id = h.warden_id)))
  WHERE ((h.id = student_outpasses.hostel_id) AND (st.profile_id = auth.uid())))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = student_outpasses.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
   FROM (public.hostels h
     JOIN public.staff st ON ((st.id = h.warden_id)))
  WHERE ((h.id = student_outpasses.hostel_id) AND (st.profile_id = auth.uid()))))));


--
-- Name: online_exam_violations oviolation: admins read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "oviolation: admins read" ON public.online_exam_violations FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.online_exams e
  WHERE ((e.id = online_exam_violations.exam_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = e.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))))));


--
-- Name: parent_student_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

--
-- Name: parents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

--
-- Name: parents parents: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "parents: admins manage" ON public.parents TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = parents.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = parents.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: parents parents: self read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "parents: self read" ON public.parents FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: placement_drives; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.placement_drives ENABLE ROW LEVEL SECURITY;

--
-- Name: placement_registrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.placement_registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription_plans plans: read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "plans: read" ON public.subscription_plans FOR SELECT TO authenticated USING (true);


--
-- Name: subscription_plans plans: super admin manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "plans: super admin manage" ON public.subscription_plans TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role)))) WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles rbac: delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles rbac: delete" ON public.profiles FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = profiles.tenant_id))))));


--
-- Name: profiles profiles rbac: insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles rbac: insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = profiles.tenant_id))))));


--
-- Name: profiles profiles rbac: select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles rbac: select" ON public.profiles FOR SELECT TO authenticated USING (((id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = profiles.tenant_id) AND (g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])))))));


--
-- Name: profiles profiles rbac: update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles rbac: update" ON public.profiles FOR UPDATE TO authenticated USING (((id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = profiles.tenant_id)))))) WITH CHECK (((id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = profiles.tenant_id))))));


--
-- Name: program_outcomes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.program_outcomes ENABLE ROW LEVEL SECURITY;

--
-- Name: program_outcomes program_outcomes: manage own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "program_outcomes: manage own institution" ON public.program_outcomes TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role, 'HOD'::public.user_role])) AND (g.tenant_id = program_outcomes.institution_id)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR ((g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role, 'HOD'::public.user_role])) AND (g.tenant_id = program_outcomes.institution_id))))));


--
-- Name: program_outcomes program_outcomes: select own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "program_outcomes: select own institution" ON public.program_outcomes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR (g.tenant_id = program_outcomes.institution_id)))));


--
-- Name: promotion_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.promotion_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: promotion_logs promotion_logs: institution members can manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "promotion_logs: institution members can manage" ON public.promotion_logs USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid()))));


--
-- Name: parent_student_links psl: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "psl: admins manage" ON public.parent_student_links TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.parents p
  WHERE ((p.id = parent_student_links.parent_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = p.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.parents p
  WHERE ((p.id = parent_student_links.parent_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = p.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))))));


--
-- Name: parent_student_links psl: parent read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "psl: parent read own" ON public.parent_student_links FOR SELECT TO authenticated USING ((parent_id IN ( SELECT parents.id
   FROM public.parents
  WHERE (parents.user_id = auth.uid()))));


--
-- Name: publications pub: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "pub: admins manage" ON public.publications TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = publications.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = publications.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: publications pub: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "pub: members read" ON public.publications FOR SELECT TO authenticated USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid())
UNION
 SELECT students.institution_id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))));


--
-- Name: publications pub: staff manage own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "pub: staff manage own" ON public.publications TO authenticated USING ((staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid())))) WITH CHECK ((staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid()))));


--
-- Name: publications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_orders purchase_orders: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "purchase_orders: admins manage" ON public.purchase_orders TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = purchase_orders.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = purchase_orders.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: purchase_orders purchase_orders: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "purchase_orders: members read" ON public.purchase_orders FOR SELECT TO authenticated USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid()))));


--
-- Name: razorpay_webhook_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.razorpay_webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Name: placement_registrations registrations: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "registrations: admins manage" ON public.placement_registrations TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.placement_drives d
  WHERE ((d.id = placement_registrations.drive_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = d.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.placement_drives d
  WHERE ((d.id = placement_registrations.drive_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = d.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))))));


--
-- Name: placement_registrations registrations: admins read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "registrations: admins read" ON public.placement_registrations FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.placement_drives d
  WHERE ((d.id = placement_registrations.drive_id) AND ((EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
           FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE ((g.tenant_id = d.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))))));


--
-- Name: placement_registrations registrations: student read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "registrations: student read own" ON public.placement_registrations FOR SELECT TO authenticated USING ((student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))));


--
-- Name: placement_registrations registrations: student register; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "registrations: student register" ON public.placement_registrations FOR INSERT TO authenticated WITH CHECK (((student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))) AND (stage_status = 'registered'::text)));


--
-- Name: research_projects research_proj: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "research_proj: admins manage" ON public.research_projects TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = research_projects.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = research_projects.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: research_projects research_proj: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "research_proj: members read" ON public.research_projects FOR SELECT TO authenticated USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid())
UNION
 SELECT students.institution_id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))));


--
-- Name: research_projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_projects ENABLE ROW LEVEL SECURITY;

--
-- Name: salary_disbursements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.salary_disbursements ENABLE ROW LEVEL SECURITY;

--
-- Name: salary_structures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduler_error_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scheduler_error_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: schedules schedules rbac: delete swimlanes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "schedules rbac: delete swimlanes" ON public.schedules FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = schedules.tenant_id)))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'DEPARTMENT_HEAD'::public.user_role) AND (g.department_id = schedules.department_id))))));


--
-- Name: schedules schedules rbac: insert swimlanes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "schedules rbac: insert swimlanes" ON public.schedules FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = g.tenant_id)))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'DEPARTMENT_HEAD'::public.user_role) AND (g.department_id = g.department_id)))) OR ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'STAFF'::public.user_role))) AND (staff_id = auth.uid()))));


--
-- Name: schedules schedules rbac: select own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "schedules rbac: select own institution" ON public.schedules FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.tenant_id = schedules.tenant_id)))));


--
-- Name: schedules schedules rbac: update swimlanes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "schedules rbac: update swimlanes" ON public.schedules FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = schedules.tenant_id)))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'DEPARTMENT_HEAD'::public.user_role) AND (g.department_id = schedules.department_id)))) OR ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'STAFF'::public.user_role))) AND (staff_id = auth.uid())))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = schedules.tenant_id)))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'DEPARTMENT_HEAD'::public.user_role) AND (g.department_id = schedules.department_id)))) OR ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'STAFF'::public.user_role))) AND (staff_id = auth.uid()))));


--
-- Name: scholarship_schemes schemes: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "schemes: admins manage" ON public.scholarship_schemes TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = scholarship_schemes.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = scholarship_schemes.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: scholarship_schemes schemes: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "schemes: members read" ON public.scholarship_schemes FOR SELECT TO authenticated USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid())
UNION
 SELECT students.institution_id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))));


--
-- Name: scholarship_applications schol_apps: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "schol_apps: admins manage" ON public.scholarship_applications TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = scholarship_applications.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = scholarship_applications.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: scholarship_applications schol_apps: admins read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "schol_apps: admins read" ON public.scholarship_applications FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = scholarship_applications.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: scholarship_applications schol_apps: student apply; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "schol_apps: student apply" ON public.scholarship_applications FOR INSERT TO authenticated WITH CHECK (((student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))) AND (status = 'applied'::text)));


--
-- Name: scholarship_applications schol_apps: student read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "schol_apps: student read own" ON public.scholarship_applications FOR SELECT TO authenticated USING ((student_id IN ( SELECT students.id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))));


--
-- Name: scholarship_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scholarship_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: scholarship_schemes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scholarship_schemes ENABLE ROW LEVEL SECURITY;

--
-- Name: shifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

--
-- Name: shifts shifts rbac: manage own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "shifts rbac: manage own institution" ON public.shifts TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = shifts.tenant_id)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = shifts.tenant_id))))));


--
-- Name: shifts shifts rbac: select own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "shifts rbac: select own institution" ON public.shifts FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.tenant_id = shifts.tenant_id)))));


--
-- Name: smart_cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.smart_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: smart_cards smart_cards: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "smart_cards: admins manage" ON public.smart_cards TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = smart_cards.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = smart_cards.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: smart_cards smart_cards: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "smart_cards: members read" ON public.smart_cards FOR SELECT TO authenticated USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid())
UNION
 SELECT students.institution_id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))));


--
-- Name: study_materials smat: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "smat: admins manage" ON public.study_materials TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = study_materials.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = study_materials.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: study_materials smat: dept students read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "smat: dept students read" ON public.study_materials FOR SELECT TO authenticated USING ((is_published AND (EXISTS ( SELECT 1
   FROM (public.students s
     JOIN public.subjects sub ON ((sub.id = study_materials.subject_id)))
  WHERE ((s.email = auth.email()) AND (s.department_id = sub.department_id))))));


--
-- Name: study_materials smat: teaching staff manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "smat: teaching staff manage" ON public.study_materials TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.teaching_assignments ta
     JOIN public.staff st ON ((st.id = ta.staff_id)))
  WHERE ((ta.subject_id = study_materials.subject_id) AND (st.email = auth.email()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.teaching_assignments ta
     JOIN public.staff st ON ((st.id = ta.staff_id)))
  WHERE ((ta.subject_id = study_materials.subject_id) AND (st.email = auth.email())))));


--
-- Name: sports_achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sports_achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: sports_achievements sports_achievements: admin write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sports_achievements: admin write" ON public.sports_achievements USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE ((institution_members.profile_id = auth.uid()) AND (institution_members.role = ANY (ARRAY['ADMIN'::text, 'PRINCIPAL'::text])))))) WITH CHECK ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE ((institution_members.profile_id = auth.uid()) AND (institution_members.role = ANY (ARRAY['ADMIN'::text, 'PRINCIPAL'::text]))))));


--
-- Name: sports_achievements sports_achievements: institution members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sports_achievements: institution members read" ON public.sports_achievements FOR SELECT USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid()))));


--
-- Name: sports_facilities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sports_facilities ENABLE ROW LEVEL SECURITY;

--
-- Name: sports_facilities sports_facilities: admin write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sports_facilities: admin write" ON public.sports_facilities USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE ((institution_members.profile_id = auth.uid()) AND (institution_members.role = ANY (ARRAY['ADMIN'::text, 'PRINCIPAL'::text])))))) WITH CHECK ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE ((institution_members.profile_id = auth.uid()) AND (institution_members.role = ANY (ARRAY['ADMIN'::text, 'PRINCIPAL'::text]))))));


--
-- Name: sports_facilities sports_facilities: institution members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sports_facilities: institution members read" ON public.sports_facilities FOR SELECT USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid()))));


--
-- Name: sports_team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sports_team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: sports_team_members sports_team_members: admin write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sports_team_members: admin write" ON public.sports_team_members USING ((team_id IN ( SELECT sports_teams.id
   FROM public.sports_teams
  WHERE (sports_teams.institution_id IN ( SELECT institution_members.institution_id
           FROM public.institution_members
          WHERE ((institution_members.profile_id = auth.uid()) AND (institution_members.role = ANY (ARRAY['ADMIN'::text, 'PRINCIPAL'::text])))))))) WITH CHECK ((team_id IN ( SELECT sports_teams.id
   FROM public.sports_teams
  WHERE (sports_teams.institution_id IN ( SELECT institution_members.institution_id
           FROM public.institution_members
          WHERE ((institution_members.profile_id = auth.uid()) AND (institution_members.role = ANY (ARRAY['ADMIN'::text, 'PRINCIPAL'::text]))))))));


--
-- Name: sports_team_members sports_team_members: institution members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sports_team_members: institution members read" ON public.sports_team_members FOR SELECT USING ((team_id IN ( SELECT sports_teams.id
   FROM public.sports_teams
  WHERE (sports_teams.institution_id IN ( SELECT institution_members.institution_id
           FROM public.institution_members
          WHERE (institution_members.profile_id = auth.uid()))))));


--
-- Name: sports_teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sports_teams ENABLE ROW LEVEL SECURITY;

--
-- Name: sports_teams sports_teams: admin write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sports_teams: admin write" ON public.sports_teams USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE ((institution_members.profile_id = auth.uid()) AND (institution_members.role = ANY (ARRAY['ADMIN'::text, 'PRINCIPAL'::text])))))) WITH CHECK ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE ((institution_members.profile_id = auth.uid()) AND (institution_members.role = ANY (ARRAY['ADMIN'::text, 'PRINCIPAL'::text]))))));


--
-- Name: sports_teams sports_teams: institution members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sports_teams: institution members read" ON public.sports_teams FOR SELECT USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid()))));


--
-- Name: staff; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

--
-- Name: staff staff rbac: delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff rbac: delete" ON public.staff FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = staff.institution_id))))));


--
-- Name: staff staff rbac: insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff rbac: insert" ON public.staff FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = staff.institution_id))))));


--
-- Name: staff staff rbac: select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff rbac: select" ON public.staff FOR SELECT USING (((profile_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = staff.institution_id) AND (g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])))))));


--
-- Name: staff staff rbac: update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff rbac: update" ON public.staff FOR UPDATE USING (((profile_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = staff.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((profile_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = staff.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: staff_appraisal_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_appraisal_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_appraisals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_appraisals ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_attendance staff_att: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff_att: admins manage" ON public.staff_attendance TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = staff_attendance.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
   FROM (private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
     JOIN public.staff s ON ((s.id = staff_attendance.staff_id)))
  WHERE ((g.tenant_id = s.institution_id) AND (g.role = ANY (ARRAY['HOD'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.department_id = s.department_id)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = staff_attendance.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
   FROM (private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
     JOIN public.staff s ON ((s.id = staff_attendance.staff_id)))
  WHERE ((g.tenant_id = s.institution_id) AND (g.role = ANY (ARRAY['HOD'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.department_id = s.department_id))))));


--
-- Name: staff_attendance staff_att: staff read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff_att: staff read own" ON public.staff_attendance FOR SELECT TO authenticated USING ((staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid()))));


--
-- Name: staff_attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_attendance staff_attendance: institution members can manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff_attendance: institution members can manage" ON public.staff_attendance USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid()))));


--
-- Name: staff_career_events staff_career: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff_career: admins manage" ON public.staff_career_events TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = staff_career_events.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
   FROM (private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
     JOIN public.staff s ON ((s.id = staff_career_events.staff_id)))
  WHERE ((g.tenant_id = s.institution_id) AND (g.role = ANY (ARRAY['HOD'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.department_id = s.department_id)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = staff_career_events.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))) OR (EXISTS ( SELECT 1
   FROM (private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
     JOIN public.staff s ON ((s.id = staff_career_events.staff_id)))
  WHERE ((g.tenant_id = s.institution_id) AND (g.role = ANY (ARRAY['HOD'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])) AND (g.department_id = s.department_id))))));


--
-- Name: staff_career_events staff_career: staff read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff_career: staff read own" ON public.staff_career_events FOR SELECT TO authenticated USING ((staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid()))));


--
-- Name: staff_career_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_career_events ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_tax_declarations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_tax_declarations ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_tax_declarations staff_tax_declarations: institution members manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff_tax_declarations: institution members manage" ON public.staff_tax_declarations USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid()))));


--
-- Name: staff_tax_declarations staff_tax_declarations: staff read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff_tax_declarations: staff read own" ON public.staff_tax_declarations FOR SELECT USING ((staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.email = (( SELECT users.email
           FROM auth.users
          WHERE (users.id = auth.uid())))::text))));


--
-- Name: staff_tax_declarations staff_tax_declarations: staff update own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff_tax_declarations: staff update own" ON public.staff_tax_declarations FOR UPDATE USING ((staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.email = (( SELECT users.email
           FROM auth.users
          WHERE (users.id = auth.uid())))::text))));


--
-- Name: staff_tax_declarations staff_tax_declarations: staff upsert own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff_tax_declarations: staff upsert own" ON public.staff_tax_declarations FOR INSERT WITH CHECK ((staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.email = (( SELECT users.email
           FROM auth.users
          WHERE (users.id = auth.uid())))::text))));


--
-- Name: statutory_payroll_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.statutory_payroll_config ENABLE ROW LEVEL SECURITY;

--
-- Name: statutory_payroll_config statutory_payroll_config: institution members read/write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "statutory_payroll_config: institution members read/write" ON public.statutory_payroll_config USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid()))));


--
-- Name: statutory_payroll_config statutory_payroll_config: super_admin full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "statutory_payroll_config: super_admin full access" ON public.statutory_payroll_config USING ((EXISTS ( SELECT 1
   FROM public.institution_members
  WHERE ((institution_members.profile_id = auth.uid()) AND (institution_members.role = 'SUPER_ADMIN'::text)))));


--
-- Name: student_outpasses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_outpasses ENABLE ROW LEVEL SECURITY;

--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: students students rbac: delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "students rbac: delete" ON public.students FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = students.institution_id))))));


--
-- Name: students students rbac: insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "students rbac: insert" ON public.students FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = students.institution_id))))));


--
-- Name: students students rbac: select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "students rbac: select" ON public.students FOR SELECT TO authenticated USING (((id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = students.institution_id) AND (g.role = ANY (ARRAY['INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role])))))));


--
-- Name: students students rbac: update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "students rbac: update" ON public.students FOR UPDATE TO authenticated USING (((id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = students.institution_id)))))) WITH CHECK (((id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = students.institution_id))))));


--
-- Name: students students: staff read own teaching departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "students: staff read own teaching departments" ON public.students FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((public.teaching_assignments ta
     JOIN public.subjects subj ON ((subj.id = ta.subject_id)))
     JOIN public.staff s ON ((s.id = ta.staff_id)))
  WHERE ((s.profile_id = auth.uid()) AND (ta.institution_id = students.institution_id) AND (subj.department_id = students.department_id)))));


--
-- Name: study_materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

--
-- Name: subjects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

--
-- Name: subjects subjects rbac: manage swimlanes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "subjects rbac: manage swimlanes" ON public.subjects TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = subjects.institution_id)))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'DEPARTMENT_HEAD'::public.user_role) AND (g.department_id = subjects.department_id)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'INST_ADMIN'::public.user_role) AND (g.tenant_id = subjects.institution_id)))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'DEPARTMENT_HEAD'::public.user_role) AND (g.department_id = subjects.department_id))))));


--
-- Name: subjects subjects rbac: select own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "subjects rbac: select own institution" ON public.subjects FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.tenant_id = subjects.institution_id)))));


--
-- Name: subjects subjects: institution members can manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "subjects: institution members can manage" ON public.subjects USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())))) WITH CHECK ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid()))));


--
-- Name: institution_subscriptions subs: institution admin reads own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "subs: institution admin reads own" ON public.institution_subscriptions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = institution_subscriptions.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))));


--
-- Name: institution_subscriptions subs: super admin manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "subs: super admin manage" ON public.institution_subscriptions TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role)))) WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))));


--
-- Name: subscription_invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: syllabus_completion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.syllabus_completion ENABLE ROW LEVEL SECURITY;

--
-- Name: syllabus_completion syllabus_completion: manage own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "syllabus_completion: manage own institution" ON public.syllabus_completion TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR (g.tenant_id = syllabus_completion.institution_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR (g.tenant_id = syllabus_completion.institution_id)))));


--
-- Name: syllabus_completion syllabus_completion: select own institution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "syllabus_completion: select own institution" ON public.syllabus_completion FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.role = 'SUPER_ADMIN'::public.user_role) OR (g.tenant_id = syllabus_completion.institution_id)))));


--
-- Name: transport_allocations talloc: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "talloc: admins manage" ON public.transport_allocations TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = transport_allocations.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = transport_allocations.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: transport_allocations talloc: student reads own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "talloc: student reads own" ON public.transport_allocations FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = transport_allocations.student_id) AND (s.email = auth.email())))));


--
-- Name: teaching_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teaching_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: teaching_assignments teaching_assignments: institution members can manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "teaching_assignments: institution members can manage" ON public.teaching_assignments USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())))) WITH CHECK ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid()))));


--
-- Name: transport_allocations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transport_allocations ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicles vehicles: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "vehicles: admins manage" ON public.vehicles TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = vehicles.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = vehicles.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: vehicles vehicles: allocated student reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "vehicles: allocated student reads" ON public.vehicles FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((public.bus_routes br
     JOIN public.transport_allocations ta ON ((ta.bus_route_id = br.id)))
     JOIN public.students s ON ((s.id = ta.student_id)))
  WHERE ((br.vehicle_id = vehicles.id) AND (s.email = auth.email())))));


--
-- Name: vendors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

--
-- Name: vendors vendors: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "vendors: admins manage" ON public.vendors TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = vendors.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = vendors.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: vendors vendors: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "vendors: members read" ON public.vendors FOR SELECT TO authenticated USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid()))));


--
-- Name: venue_bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.venue_bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: venue_bookings venue_bookings: admins delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "venue_bookings: admins delete" ON public.venue_bookings FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = venue_bookings.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: venue_bookings venue_bookings: booker or admin update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "venue_bookings: booker or admin update" ON public.venue_bookings FOR UPDATE TO authenticated USING (((booked_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = venue_bookings.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((booked_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = venue_bookings.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: venue_bookings venue_bookings: member creates own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "venue_bookings: member creates own" ON public.venue_bookings FOR INSERT TO authenticated WITH CHECK (((booked_by = auth.uid()) AND (institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid())
UNION
 SELECT students.institution_id
   FROM public.students
  WHERE (students.profile_id = auth.uid())))));


--
-- Name: venue_bookings venue_bookings: read own or admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "venue_bookings: read own or admin" ON public.venue_bookings FOR SELECT TO authenticated USING (((booked_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = venue_bookings.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: venues; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

--
-- Name: venues venues: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "venues: admins manage" ON public.venues TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = venues.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = venues.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: venues venues: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "venues: members read" ON public.venues FOR SELECT TO authenticated USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid())
UNION
 SELECT students.institution_id
   FROM public.students
  WHERE (students.profile_id = auth.uid()))));


--
-- Name: visitor_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.visitor_log ENABLE ROW LEVEL SECURITY;

--
-- Name: visitor_log visitor_log: admins manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "visitor_log: admins manage" ON public.visitor_log TO authenticated USING (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = visitor_log.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE (g.role = 'SUPER_ADMIN'::public.user_role))) OR (EXISTS ( SELECT 1
   FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
  WHERE ((g.tenant_id = visitor_log.institution_id) AND (g.role = 'INST_ADMIN'::public.user_role))))));


--
-- Name: visitor_log visitor_log: members read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "visitor_log: members read" ON public.visitor_log FOR SELECT TO authenticated USING ((institution_id IN ( SELECT institution_members.institution_id
   FROM public.institution_members
  WHERE (institution_members.profile_id = auth.uid())
UNION
 SELECT staff.institution_id
   FROM public.staff
  WHERE (staff.profile_id = auth.uid()))));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION get_user_authorizations(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.get_user_authorizations() FROM PUBLIC;
GRANT ALL ON FUNCTION private.get_user_authorizations() TO authenticated;
GRANT ALL ON FUNCTION private.get_user_authorizations() TO service_role;


--
-- Name: FUNCTION sweep_fee_due(grace_days integer); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.sweep_fee_due(grace_days integer) FROM PUBLIC;


--
-- Name: FUNCTION sweep_low_attendance(threshold integer, min_sessions integer); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.sweep_low_attendance(threshold integer, min_sessions integer) FROM PUBLIC;


--
-- Name: FUNCTION sweep_overdue_outpasses(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.sweep_overdue_outpasses() FROM PUBLIC;


--
-- Name: FUNCTION get_user_authorizations(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_user_authorizations() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_user_authorizations() TO anon;
GRANT ALL ON FUNCTION public.get_user_authorizations() TO authenticated;
GRANT ALL ON FUNCTION public.get_user_authorizations() TO service_role;


--
-- Name: FUNCTION platform_table_stats(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.platform_table_stats() FROM PUBLIC;
GRANT ALL ON FUNCTION public.platform_table_stats() TO service_role;


--
-- Name: FUNCTION review_leave_request(p_leave_id uuid, p_status text, p_note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.review_leave_request(p_leave_id uuid, p_status text, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.review_leave_request(p_leave_id uuid, p_status text, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.review_leave_request(p_leave_id uuid, p_status text, p_note text) TO service_role;


--
-- Name: FUNCTION update_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at() TO service_role;


--
-- Name: TABLE academic_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.academic_events TO anon;
GRANT ALL ON TABLE public.academic_events TO authenticated;
GRANT ALL ON TABLE public.academic_events TO service_role;


--
-- Name: TABLE academic_years; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.academic_years TO anon;
GRANT ALL ON TABLE public.academic_years TO authenticated;
GRANT ALL ON TABLE public.academic_years TO service_role;


--
-- Name: TABLE admission_enquiries; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.admission_enquiries TO anon;
GRANT ALL ON TABLE public.admission_enquiries TO authenticated;
GRANT ALL ON TABLE public.admission_enquiries TO service_role;


--
-- Name: TABLE admissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.admissions TO anon;
GRANT ALL ON TABLE public.admissions TO authenticated;
GRANT ALL ON TABLE public.admissions TO service_role;


--
-- Name: TABLE alumni; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.alumni TO anon;
GRANT ALL ON TABLE public.alumni TO authenticated;
GRANT ALL ON TABLE public.alumni TO service_role;


--
-- Name: TABLE alumni_announcements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.alumni_announcements TO anon;
GRANT ALL ON TABLE public.alumni_announcements TO authenticated;
GRANT ALL ON TABLE public.alumni_announcements TO service_role;


--
-- Name: TABLE asset_allocations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.asset_allocations TO anon;
GRANT ALL ON TABLE public.asset_allocations TO authenticated;
GRANT ALL ON TABLE public.asset_allocations TO service_role;


--
-- Name: TABLE asset_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.asset_categories TO anon;
GRANT ALL ON TABLE public.asset_categories TO authenticated;
GRANT ALL ON TABLE public.asset_categories TO service_role;


--
-- Name: TABLE asset_maintenance_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.asset_maintenance_logs TO anon;
GRANT ALL ON TABLE public.asset_maintenance_logs TO authenticated;
GRANT ALL ON TABLE public.asset_maintenance_logs TO service_role;


--
-- Name: TABLE assets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.assets TO anon;
GRANT ALL ON TABLE public.assets TO authenticated;
GRANT ALL ON TABLE public.assets TO service_role;


--
-- Name: TABLE attendance; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.attendance TO anon;
GRANT ALL ON TABLE public.attendance TO authenticated;
GRANT ALL ON TABLE public.attendance TO service_role;


--
-- Name: TABLE attendance_audit; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.attendance_audit TO anon;
GRANT ALL ON TABLE public.attendance_audit TO authenticated;
GRANT ALL ON TABLE public.attendance_audit TO service_role;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_logs TO service_role;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;


--
-- Name: TABLE budget_line_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.budget_line_items TO anon;
GRANT ALL ON TABLE public.budget_line_items TO authenticated;
GRANT ALL ON TABLE public.budget_line_items TO service_role;


--
-- Name: TABLE bus_routes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bus_routes TO anon;
GRANT ALL ON TABLE public.bus_routes TO authenticated;
GRANT ALL ON TABLE public.bus_routes TO service_role;


--
-- Name: TABLE campus_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.campus_events TO anon;
GRANT ALL ON TABLE public.campus_events TO authenticated;
GRANT ALL ON TABLE public.campus_events TO service_role;


--
-- Name: TABLE certificate_requests; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.certificate_requests TO anon;
GRANT ALL ON TABLE public.certificate_requests TO authenticated;
GRANT ALL ON TABLE public.certificate_requests TO service_role;


--
-- Name: TABLE cia_component_outcomes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cia_component_outcomes TO anon;
GRANT ALL ON TABLE public.cia_component_outcomes TO authenticated;
GRANT ALL ON TABLE public.cia_component_outcomes TO service_role;


--
-- Name: TABLE cia_components; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cia_components TO anon;
GRANT ALL ON TABLE public.cia_components TO authenticated;
GRANT ALL ON TABLE public.cia_components TO service_role;


--
-- Name: TABLE cia_marks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cia_marks TO anon;
GRANT ALL ON TABLE public.cia_marks TO authenticated;
GRANT ALL ON TABLE public.cia_marks TO service_role;


--
-- Name: TABLE cia_results; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cia_results TO anon;
GRANT ALL ON TABLE public.cia_results TO authenticated;
GRANT ALL ON TABLE public.cia_results TO service_role;


--
-- Name: TABLE class_schedules; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.class_schedules TO anon;
GRANT ALL ON TABLE public.class_schedules TO authenticated;
GRANT ALL ON TABLE public.class_schedules TO service_role;


--
-- Name: TABLE co_po_map; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.co_po_map TO anon;
GRANT ALL ON TABLE public.co_po_map TO authenticated;
GRANT ALL ON TABLE public.co_po_map TO service_role;


--
-- Name: TABLE companies; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.companies TO anon;
GRANT ALL ON TABLE public.companies TO authenticated;
GRANT ALL ON TABLE public.companies TO service_role;


--
-- Name: TABLE course_outcomes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.course_outcomes TO anon;
GRANT ALL ON TABLE public.course_outcomes TO authenticated;
GRANT ALL ON TABLE public.course_outcomes TO service_role;


--
-- Name: TABLE curriculum_units; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.curriculum_units TO anon;
GRANT ALL ON TABLE public.curriculum_units TO authenticated;
GRANT ALL ON TABLE public.curriculum_units TO service_role;


--
-- Name: TABLE data_consent_logs; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,MAINTAIN ON TABLE public.data_consent_logs TO authenticated;
GRANT ALL ON TABLE public.data_consent_logs TO service_role;


--
-- Name: COLUMN data_consent_logs.withdrawn_at; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(withdrawn_at) ON TABLE public.data_consent_logs TO authenticated;


--
-- Name: TABLE data_erasure_requests; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,MAINTAIN ON TABLE public.data_erasure_requests TO authenticated;
GRANT ALL ON TABLE public.data_erasure_requests TO service_role;


--
-- Name: COLUMN data_erasure_requests.status; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(status) ON TABLE public.data_erasure_requests TO authenticated;


--
-- Name: COLUMN data_erasure_requests.admin_notes; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(admin_notes) ON TABLE public.data_erasure_requests TO authenticated;


--
-- Name: COLUMN data_erasure_requests.resolved_at; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(resolved_at) ON TABLE public.data_erasure_requests TO authenticated;


--
-- Name: TABLE department_budgets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.department_budgets TO anon;
GRANT ALL ON TABLE public.department_budgets TO authenticated;
GRANT ALL ON TABLE public.department_budgets TO service_role;


--
-- Name: TABLE departments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.departments TO anon;
GRANT ALL ON TABLE public.departments TO authenticated;
GRANT ALL ON TABLE public.departments TO service_role;


--
-- Name: TABLE devices; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.devices TO anon;
GRANT ALL ON TABLE public.devices TO authenticated;
GRANT ALL ON TABLE public.devices TO service_role;


--
-- Name: TABLE disciplinary_actions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.disciplinary_actions TO anon;
GRANT ALL ON TABLE public.disciplinary_actions TO authenticated;
GRANT ALL ON TABLE public.disciplinary_actions TO service_role;


--
-- Name: TABLE disciplinary_incidents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.disciplinary_incidents TO anon;
GRANT ALL ON TABLE public.disciplinary_incidents TO authenticated;
GRANT ALL ON TABLE public.disciplinary_incidents TO service_role;


--
-- Name: TABLE draft_schedules; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.draft_schedules TO anon;
GRANT ALL ON TABLE public.draft_schedules TO authenticated;
GRANT ALL ON TABLE public.draft_schedules TO service_role;


--
-- Name: TABLE event_participants; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.event_participants TO anon;
GRANT ALL ON TABLE public.event_participants TO authenticated;
GRANT ALL ON TABLE public.event_participants TO service_role;


--
-- Name: TABLE exam_schedules; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.exam_schedules TO anon;
GRANT ALL ON TABLE public.exam_schedules TO authenticated;
GRANT ALL ON TABLE public.exam_schedules TO service_role;


--
-- Name: TABLE expenses; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.expenses TO anon;
GRANT ALL ON TABLE public.expenses TO authenticated;
GRANT ALL ON TABLE public.expenses TO service_role;


--
-- Name: TABLE fee_concessions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.fee_concessions TO anon;
GRANT ALL ON TABLE public.fee_concessions TO authenticated;
GRANT ALL ON TABLE public.fee_concessions TO service_role;


--
-- Name: TABLE fee_demands; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.fee_demands TO anon;
GRANT ALL ON TABLE public.fee_demands TO authenticated;
GRANT ALL ON TABLE public.fee_demands TO service_role;


--
-- Name: TABLE fee_payments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.fee_payments TO anon;
GRANT ALL ON TABLE public.fee_payments TO authenticated;
GRANT ALL ON TABLE public.fee_payments TO service_role;


--
-- Name: TABLE fee_structures; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.fee_structures TO anon;
GRANT ALL ON TABLE public.fee_structures TO authenticated;
GRANT ALL ON TABLE public.fee_structures TO service_role;


--
-- Name: TABLE feedback_forms; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.feedback_forms TO anon;
GRANT ALL ON TABLE public.feedback_forms TO authenticated;
GRANT ALL ON TABLE public.feedback_forms TO service_role;


--
-- Name: TABLE feedback_responses; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.feedback_responses TO anon;
GRANT ALL ON TABLE public.feedback_responses TO authenticated;
GRANT ALL ON TABLE public.feedback_responses TO service_role;


--
-- Name: TABLE feedback_submissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.feedback_submissions TO anon;
GRANT ALL ON TABLE public.feedback_submissions TO authenticated;
GRANT ALL ON TABLE public.feedback_submissions TO service_role;


--
-- Name: TABLE grievances; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.grievances TO anon;
GRANT ALL ON TABLE public.grievances TO authenticated;
GRANT ALL ON TABLE public.grievances TO service_role;


--
-- Name: TABLE guest_lectures; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.guest_lectures TO anon;
GRANT ALL ON TABLE public.guest_lectures TO authenticated;
GRANT ALL ON TABLE public.guest_lectures TO service_role;


--
-- Name: TABLE hostel_allocations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.hostel_allocations TO anon;
GRANT ALL ON TABLE public.hostel_allocations TO authenticated;
GRANT ALL ON TABLE public.hostel_allocations TO service_role;


--
-- Name: TABLE hostel_announcements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.hostel_announcements TO anon;
GRANT ALL ON TABLE public.hostel_announcements TO authenticated;
GRANT ALL ON TABLE public.hostel_announcements TO service_role;


--
-- Name: TABLE hostel_maintenance_requests; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.hostel_maintenance_requests TO anon;
GRANT ALL ON TABLE public.hostel_maintenance_requests TO authenticated;
GRANT ALL ON TABLE public.hostel_maintenance_requests TO service_role;


--
-- Name: TABLE hostel_rooms; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.hostel_rooms TO anon;
GRANT ALL ON TABLE public.hostel_rooms TO authenticated;
GRANT ALL ON TABLE public.hostel_rooms TO service_role;


--
-- Name: TABLE hostels; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.hostels TO anon;
GRANT ALL ON TABLE public.hostels TO authenticated;
GRANT ALL ON TABLE public.hostels TO service_role;


--
-- Name: TABLE industry_interactions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.industry_interactions TO anon;
GRANT ALL ON TABLE public.industry_interactions TO authenticated;
GRANT ALL ON TABLE public.industry_interactions TO service_role;


--
-- Name: TABLE institution_members; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.institution_members TO anon;
GRANT ALL ON TABLE public.institution_members TO authenticated;
GRANT ALL ON TABLE public.institution_members TO service_role;


--
-- Name: TABLE institution_subscriptions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.institution_subscriptions TO anon;
GRANT ALL ON TABLE public.institution_subscriptions TO authenticated;
GRANT ALL ON TABLE public.institution_subscriptions TO service_role;


--
-- Name: TABLE institutions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.institutions TO anon;
GRANT ALL ON TABLE public.institutions TO authenticated;
GRANT ALL ON TABLE public.institutions TO service_role;


--
-- Name: TABLE internships; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.internships TO anon;
GRANT ALL ON TABLE public.internships TO authenticated;
GRANT ALL ON TABLE public.internships TO service_role;


--
-- Name: TABLE iqac_action_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.iqac_action_items TO anon;
GRANT ALL ON TABLE public.iqac_action_items TO authenticated;
GRANT ALL ON TABLE public.iqac_action_items TO service_role;


--
-- Name: TABLE iqac_meetings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.iqac_meetings TO anon;
GRANT ALL ON TABLE public.iqac_meetings TO authenticated;
GRANT ALL ON TABLE public.iqac_meetings TO service_role;


--
-- Name: TABLE job_applications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.job_applications TO anon;
GRANT ALL ON TABLE public.job_applications TO authenticated;
GRANT ALL ON TABLE public.job_applications TO service_role;


--
-- Name: TABLE job_postings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.job_postings TO anon;
GRANT ALL ON TABLE public.job_postings TO authenticated;
GRANT ALL ON TABLE public.job_postings TO service_role;


--
-- Name: TABLE laboratories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.laboratories TO anon;
GRANT ALL ON TABLE public.laboratories TO authenticated;
GRANT ALL ON TABLE public.laboratories TO service_role;


--
-- Name: TABLE laboratory_attendance; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.laboratory_attendance TO anon;
GRANT ALL ON TABLE public.laboratory_attendance TO authenticated;
GRANT ALL ON TABLE public.laboratory_attendance TO service_role;


--
-- Name: TABLE laboratory_batches; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.laboratory_batches TO anon;
GRANT ALL ON TABLE public.laboratory_batches TO authenticated;
GRANT ALL ON TABLE public.laboratory_batches TO service_role;


--
-- Name: TABLE laboratory_experiments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.laboratory_experiments TO anon;
GRANT ALL ON TABLE public.laboratory_experiments TO authenticated;
GRANT ALL ON TABLE public.laboratory_experiments TO service_role;


--
-- Name: TABLE laboratory_sessions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.laboratory_sessions TO anon;
GRANT ALL ON TABLE public.laboratory_sessions TO authenticated;
GRANT ALL ON TABLE public.laboratory_sessions TO service_role;


--
-- Name: TABLE leave_requests; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.leave_requests TO anon;
GRANT ALL ON TABLE public.leave_requests TO authenticated;
GRANT ALL ON TABLE public.leave_requests TO service_role;


--
-- Name: TABLE lesson_plans; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lesson_plans TO anon;
GRANT ALL ON TABLE public.lesson_plans TO authenticated;
GRANT ALL ON TABLE public.lesson_plans TO service_role;


--
-- Name: TABLE library_books; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.library_books TO anon;
GRANT ALL ON TABLE public.library_books TO authenticated;
GRANT ALL ON TABLE public.library_books TO service_role;


--
-- Name: TABLE library_lendings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.library_lendings TO anon;
GRANT ALL ON TABLE public.library_lendings TO authenticated;
GRANT ALL ON TABLE public.library_lendings TO service_role;


--
-- Name: TABLE lms_assignments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lms_assignments TO anon;
GRANT ALL ON TABLE public.lms_assignments TO authenticated;
GRANT ALL ON TABLE public.lms_assignments TO service_role;


--
-- Name: TABLE lms_submissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lms_submissions TO anon;
GRANT ALL ON TABLE public.lms_submissions TO authenticated;
GRANT ALL ON TABLE public.lms_submissions TO service_role;


--
-- Name: TABLE medical_records; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.medical_records TO anon;
GRANT ALL ON TABLE public.medical_records TO authenticated;
GRANT ALL ON TABLE public.medical_records TO service_role;


--
-- Name: TABLE medical_visits; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.medical_visits TO anon;
GRANT ALL ON TABLE public.medical_visits TO authenticated;
GRANT ALL ON TABLE public.medical_visits TO service_role;


--
-- Name: TABLE mess_billing; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mess_billing TO anon;
GRANT ALL ON TABLE public.mess_billing TO authenticated;
GRANT ALL ON TABLE public.mess_billing TO service_role;


--
-- Name: TABLE mess_menu; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mess_menu TO anon;
GRANT ALL ON TABLE public.mess_menu TO authenticated;
GRANT ALL ON TABLE public.mess_menu TO service_role;


--
-- Name: TABLE monthly_pl; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.monthly_pl TO anon;
GRANT ALL ON TABLE public.monthly_pl TO authenticated;
GRANT ALL ON TABLE public.monthly_pl TO service_role;


--
-- Name: TABLE monthly_statutory_deductions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.monthly_statutory_deductions TO anon;
GRANT ALL ON TABLE public.monthly_statutory_deductions TO authenticated;
GRANT ALL ON TABLE public.monthly_statutory_deductions TO service_role;


--
-- Name: TABLE mou_partners; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.mou_partners TO anon;
GRANT ALL ON TABLE public.mou_partners TO authenticated;
GRANT ALL ON TABLE public.mou_partners TO service_role;


--
-- Name: TABLE notices; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notices TO anon;
GRANT ALL ON TABLE public.notices TO authenticated;
GRANT ALL ON TABLE public.notices TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- Name: TABLE online_exam_answers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.online_exam_answers TO anon;
GRANT ALL ON TABLE public.online_exam_answers TO authenticated;
GRANT ALL ON TABLE public.online_exam_answers TO service_role;


--
-- Name: TABLE online_exam_questions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.online_exam_questions TO anon;
GRANT ALL ON TABLE public.online_exam_questions TO authenticated;
GRANT ALL ON TABLE public.online_exam_questions TO service_role;


--
-- Name: TABLE online_exam_sessions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.online_exam_sessions TO anon;
GRANT ALL ON TABLE public.online_exam_sessions TO authenticated;
GRANT ALL ON TABLE public.online_exam_sessions TO service_role;


--
-- Name: TABLE online_exam_violations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.online_exam_violations TO anon;
GRANT ALL ON TABLE public.online_exam_violations TO authenticated;
GRANT ALL ON TABLE public.online_exam_violations TO service_role;


--
-- Name: TABLE online_exams; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.online_exams TO anon;
GRANT ALL ON TABLE public.online_exams TO authenticated;
GRANT ALL ON TABLE public.online_exams TO service_role;


--
-- Name: TABLE parent_student_links; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.parent_student_links TO anon;
GRANT ALL ON TABLE public.parent_student_links TO authenticated;
GRANT ALL ON TABLE public.parent_student_links TO service_role;


--
-- Name: TABLE parents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.parents TO anon;
GRANT ALL ON TABLE public.parents TO authenticated;
GRANT ALL ON TABLE public.parents TO service_role;


--
-- Name: TABLE placement_drives; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.placement_drives TO anon;
GRANT ALL ON TABLE public.placement_drives TO authenticated;
GRANT ALL ON TABLE public.placement_drives TO service_role;


--
-- Name: TABLE placement_registrations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.placement_registrations TO anon;
GRANT ALL ON TABLE public.placement_registrations TO authenticated;
GRANT ALL ON TABLE public.placement_registrations TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE program_outcomes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.program_outcomes TO anon;
GRANT ALL ON TABLE public.program_outcomes TO authenticated;
GRANT ALL ON TABLE public.program_outcomes TO service_role;


--
-- Name: TABLE promotion_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.promotion_logs TO anon;
GRANT ALL ON TABLE public.promotion_logs TO authenticated;
GRANT ALL ON TABLE public.promotion_logs TO service_role;


--
-- Name: TABLE publications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.publications TO anon;
GRANT ALL ON TABLE public.publications TO authenticated;
GRANT ALL ON TABLE public.publications TO service_role;


--
-- Name: TABLE purchase_orders; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.purchase_orders TO anon;
GRANT ALL ON TABLE public.purchase_orders TO authenticated;
GRANT ALL ON TABLE public.purchase_orders TO service_role;


--
-- Name: TABLE razorpay_webhook_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.razorpay_webhook_events TO anon;
GRANT ALL ON TABLE public.razorpay_webhook_events TO authenticated;
GRANT ALL ON TABLE public.razorpay_webhook_events TO service_role;


--
-- Name: TABLE research_projects; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.research_projects TO anon;
GRANT ALL ON TABLE public.research_projects TO authenticated;
GRANT ALL ON TABLE public.research_projects TO service_role;


--
-- Name: TABLE salary_disbursements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.salary_disbursements TO anon;
GRANT ALL ON TABLE public.salary_disbursements TO authenticated;
GRANT ALL ON TABLE public.salary_disbursements TO service_role;


--
-- Name: TABLE salary_disbursement_summary; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.salary_disbursement_summary TO anon;
GRANT ALL ON TABLE public.salary_disbursement_summary TO authenticated;
GRANT ALL ON TABLE public.salary_disbursement_summary TO service_role;


--
-- Name: TABLE salary_structures; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.salary_structures TO anon;
GRANT ALL ON TABLE public.salary_structures TO authenticated;
GRANT ALL ON TABLE public.salary_structures TO service_role;


--
-- Name: TABLE scheduler_error_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.scheduler_error_logs TO service_role;


--
-- Name: TABLE schedules; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.schedules TO anon;
GRANT ALL ON TABLE public.schedules TO authenticated;
GRANT ALL ON TABLE public.schedules TO service_role;


--
-- Name: TABLE scholarship_applications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.scholarship_applications TO anon;
GRANT ALL ON TABLE public.scholarship_applications TO authenticated;
GRANT ALL ON TABLE public.scholarship_applications TO service_role;


--
-- Name: TABLE scholarship_schemes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.scholarship_schemes TO anon;
GRANT ALL ON TABLE public.scholarship_schemes TO authenticated;
GRANT ALL ON TABLE public.scholarship_schemes TO service_role;


--
-- Name: TABLE shifts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.shifts TO anon;
GRANT ALL ON TABLE public.shifts TO authenticated;
GRANT ALL ON TABLE public.shifts TO service_role;


--
-- Name: TABLE smart_cards; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.smart_cards TO anon;
GRANT ALL ON TABLE public.smart_cards TO authenticated;
GRANT ALL ON TABLE public.smart_cards TO service_role;


--
-- Name: TABLE sports_achievements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sports_achievements TO anon;
GRANT ALL ON TABLE public.sports_achievements TO authenticated;
GRANT ALL ON TABLE public.sports_achievements TO service_role;


--
-- Name: TABLE sports_facilities; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sports_facilities TO anon;
GRANT ALL ON TABLE public.sports_facilities TO authenticated;
GRANT ALL ON TABLE public.sports_facilities TO service_role;


--
-- Name: TABLE sports_team_members; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sports_team_members TO anon;
GRANT ALL ON TABLE public.sports_team_members TO authenticated;
GRANT ALL ON TABLE public.sports_team_members TO service_role;


--
-- Name: TABLE sports_teams; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sports_teams TO anon;
GRANT ALL ON TABLE public.sports_teams TO authenticated;
GRANT ALL ON TABLE public.sports_teams TO service_role;


--
-- Name: TABLE staff; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.staff TO anon;
GRANT ALL ON TABLE public.staff TO authenticated;
GRANT ALL ON TABLE public.staff TO service_role;


--
-- Name: TABLE staff_appraisal_activities; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.staff_appraisal_activities TO anon;
GRANT ALL ON TABLE public.staff_appraisal_activities TO authenticated;
GRANT ALL ON TABLE public.staff_appraisal_activities TO service_role;


--
-- Name: TABLE staff_appraisals; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.staff_appraisals TO anon;
GRANT ALL ON TABLE public.staff_appraisals TO authenticated;
GRANT ALL ON TABLE public.staff_appraisals TO service_role;


--
-- Name: TABLE staff_attendance; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.staff_attendance TO anon;
GRANT ALL ON TABLE public.staff_attendance TO authenticated;
GRANT ALL ON TABLE public.staff_attendance TO service_role;


--
-- Name: TABLE staff_career_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.staff_career_events TO anon;
GRANT ALL ON TABLE public.staff_career_events TO authenticated;
GRANT ALL ON TABLE public.staff_career_events TO service_role;


--
-- Name: TABLE staff_tax_declarations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.staff_tax_declarations TO anon;
GRANT ALL ON TABLE public.staff_tax_declarations TO authenticated;
GRANT ALL ON TABLE public.staff_tax_declarations TO service_role;


--
-- Name: TABLE statutory_payroll_config; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.statutory_payroll_config TO anon;
GRANT ALL ON TABLE public.statutory_payroll_config TO authenticated;
GRANT ALL ON TABLE public.statutory_payroll_config TO service_role;


--
-- Name: TABLE student_fee_summary; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.student_fee_summary TO anon;
GRANT ALL ON TABLE public.student_fee_summary TO authenticated;
GRANT ALL ON TABLE public.student_fee_summary TO service_role;


--
-- Name: TABLE student_outpasses; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.student_outpasses TO anon;
GRANT ALL ON TABLE public.student_outpasses TO authenticated;
GRANT ALL ON TABLE public.student_outpasses TO service_role;


--
-- Name: TABLE students; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.students TO anon;
GRANT ALL ON TABLE public.students TO authenticated;
GRANT ALL ON TABLE public.students TO service_role;


--
-- Name: TABLE study_materials; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.study_materials TO anon;
GRANT ALL ON TABLE public.study_materials TO authenticated;
GRANT ALL ON TABLE public.study_materials TO service_role;


--
-- Name: TABLE subjects; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.subjects TO anon;
GRANT ALL ON TABLE public.subjects TO authenticated;
GRANT ALL ON TABLE public.subjects TO service_role;


--
-- Name: TABLE subscription_invoices; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.subscription_invoices TO anon;
GRANT ALL ON TABLE public.subscription_invoices TO authenticated;
GRANT ALL ON TABLE public.subscription_invoices TO service_role;


--
-- Name: TABLE subscription_plans; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.subscription_plans TO anon;
GRANT ALL ON TABLE public.subscription_plans TO authenticated;
GRANT ALL ON TABLE public.subscription_plans TO service_role;


--
-- Name: TABLE syllabus_completion; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.syllabus_completion TO anon;
GRANT ALL ON TABLE public.syllabus_completion TO authenticated;
GRANT ALL ON TABLE public.syllabus_completion TO service_role;


--
-- Name: TABLE teaching_assignments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.teaching_assignments TO anon;
GRANT ALL ON TABLE public.teaching_assignments TO authenticated;
GRANT ALL ON TABLE public.teaching_assignments TO service_role;


--
-- Name: TABLE transport_allocations; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.transport_allocations TO anon;
GRANT ALL ON TABLE public.transport_allocations TO authenticated;
GRANT ALL ON TABLE public.transport_allocations TO service_role;


--
-- Name: TABLE vehicles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.vehicles TO anon;
GRANT ALL ON TABLE public.vehicles TO authenticated;
GRANT ALL ON TABLE public.vehicles TO service_role;


--
-- Name: TABLE vendors; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.vendors TO anon;
GRANT ALL ON TABLE public.vendors TO authenticated;
GRANT ALL ON TABLE public.vendors TO service_role;


--
-- Name: TABLE venue_bookings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.venue_bookings TO anon;
GRANT ALL ON TABLE public.venue_bookings TO authenticated;
GRANT ALL ON TABLE public.venue_bookings TO service_role;


--
-- Name: TABLE venues; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.venues TO anon;
GRANT ALL ON TABLE public.venues TO authenticated;
GRANT ALL ON TABLE public.venues TO service_role;


--
-- Name: TABLE visitor_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.visitor_log TO anon;
GRANT ALL ON TABLE public.visitor_log TO authenticated;
GRANT ALL ON TABLE public.visitor_log TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--


