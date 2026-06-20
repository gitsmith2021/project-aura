-- ============================================================
-- AURA Seed: DND College & Live Sessions
-- Run this in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  v_tenant  UUID;
  v_dept    UUID;
  s1  UUID; s2  UUID; s3  UUID; s4  UUID; s5  UUID;
BEGIN
  -- ── 1. Create or Find DND College ───────────────────────────
  INSERT INTO tenants (name, subdomain) VALUES ('DND College', 'dndcollege')
    ON CONFLICT DO NOTHING;
  SELECT id INTO v_tenant FROM tenants WHERE name = 'DND College' LIMIT 1;

  -- ── 2. Create or Find Department ────────────────────────────
  INSERT INTO departments (name, tenant_id) VALUES ('Information Technology', v_tenant)
    ON CONFLICT DO NOTHING;
  SELECT id INTO v_dept FROM departments WHERE name = 'Information Technology' AND tenant_id = v_tenant LIMIT 1;

  -- ── 3. Create 5 Staff Members ───────────────────────────────
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Prof. Alan Turing',   'STAFF', v_tenant, v_dept) RETURNING id INTO s1;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Prof. Ada Lovelace',  'STAFF', v_tenant, v_dept) RETURNING id INTO s2;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Prof. Grace Hopper',  'STAFF', v_tenant, v_dept) RETURNING id INTO s3;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Prof. John von Neumann','STAFF', v_tenant, v_dept) RETURNING id INTO s4;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Prof. Tim Berners-Lee', 'STAFF', v_tenant, v_dept) RETURNING id INTO s5;

  -- ── 4. Create 10 Students ───────────────────────────────────
  FOR i IN 1..10 LOOP
    INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('IT Student ' || i, 'STUDENT', v_tenant, v_dept);
  END LOOP;

  -- ── 5. Create 5 LIVE Schedules for Wednesday ────────────────
  -- Time format is HH:MM. Ensure these overlap the current time (around 11:46 AM)
  -- so they show up as "Live Now". 
  INSERT INTO schedules (department_id, tenant_id, subject_name, staff_id, day_of_week, start_time, end_time) VALUES
    (v_dept, v_tenant, 'Data Structures',           s1, 'Wednesday', '11:00', '13:00'),
    (v_dept, v_tenant, 'Algorithms Design',         s2, 'Wednesday', '10:30', '12:30'),
    (v_dept, v_tenant, 'Operating Systems',         s3, 'Wednesday', '11:15', '12:15'),
    (v_dept, v_tenant, 'Database Management',       s4, 'Wednesday', '11:30', '14:00'),
    (v_dept, v_tenant, 'Artificial Intelligence',   s5, 'Wednesday', '10:00', '13:30');

END $$;
