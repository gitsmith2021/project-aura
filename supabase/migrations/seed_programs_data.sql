-- ============================================================
-- AURA Seed: 5 Departments, 20 Staff, 20 Students/Dept, Schedules
-- Run this in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  v_tenant  UUID;
  v_d1 UUID; v_d2 UUID; v_d3 UUID; v_d4 UUID; v_d5 UUID;
  s1  UUID; s2  UUID; s3  UUID; s4  UUID;
  s5  UUID; s6  UUID; s7  UUID; s8  UUID;
  s9  UUID; s10 UUID; s11 UUID; s12 UUID;
  s13 UUID; s14 UUID; s15 UUID; s16 UUID;
  s17 UUID; s18 UUID; s19 UUID; s20 UUID;
BEGIN
  -- ── Tenant ────────────────────────────────────────────────
  SELECT id INTO v_tenant FROM tenants LIMIT 1;

  -- ── Departments ───────────────────────────────────────────
  SELECT id INTO v_d1 FROM departments WHERE name = 'Community Health Nursing' LIMIT 1;
  SELECT id INTO v_d2 FROM departments WHERE name = 'Medical Surgery' LIMIT 1;
  SELECT id INTO v_d3 FROM departments WHERE name = 'Psychiatry' LIMIT 1;

  INSERT INTO departments (name, tenant_id) VALUES ('Anatomy', v_tenant)
    ON CONFLICT DO NOTHING;
  SELECT id INTO v_d4 FROM departments WHERE name = 'Anatomy' LIMIT 1;

  INSERT INTO departments (name, tenant_id) VALUES ('Pharmacology', v_tenant)
    ON CONFLICT DO NOTHING;
  SELECT id INTO v_d5 FROM departments WHERE name = 'Pharmacology' LIMIT 1;

  -- ── 20 Staff ──────────────────────────────────────────────
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Anitha Menon',    'STAFF', v_tenant, v_d1) RETURNING id INTO s1;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Priya Sharma',    'STAFF', v_tenant, v_d1) RETURNING id INTO s2;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Sunita Rao',      'STAFF', v_tenant, v_d1) RETURNING id INTO s3;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Kavitha Nair',    'STAFF', v_tenant, v_d1) RETURNING id INTO s4;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Rajesh Kumar',    'STAFF', v_tenant, v_d2) RETURNING id INTO s5;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Venkat Raman',    'STAFF', v_tenant, v_d2) RETURNING id INTO s6;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Suresh Pillai',   'STAFF', v_tenant, v_d2) RETURNING id INTO s7;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Arun Mehta',      'STAFF', v_tenant, v_d2) RETURNING id INTO s8;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Deepa Krishnan',  'STAFF', v_tenant, v_d3) RETURNING id INTO s9;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Mohan Das',       'STAFF', v_tenant, v_d3) RETURNING id INTO s10;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Rekha Iyer',      'STAFF', v_tenant, v_d3) RETURNING id INTO s11;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Sanjay Patel',    'STAFF', v_tenant, v_d3) RETURNING id INTO s12;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Lakshmi Narayan', 'STAFF', v_tenant, v_d4) RETURNING id INTO s13;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Arjun Reddy',     'STAFF', v_tenant, v_d4) RETURNING id INTO s14;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Meena Gupta',     'STAFF', v_tenant, v_d4) RETURNING id INTO s15;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Ramesh Babu',     'STAFF', v_tenant, v_d4) RETURNING id INTO s16;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Pooja Singh',     'STAFF', v_tenant, v_d5) RETURNING id INTO s17;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Kiran Kumar',     'STAFF', v_tenant, v_d5) RETURNING id INTO s18;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Nalini Devi',     'STAFF', v_tenant, v_d5) RETURNING id INTO s19;
  INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Dr. Sunil Joshi',     'STAFF', v_tenant, v_d5) RETURNING id INTO s20;

  -- ── 20 Students per department (100 total) ────────────────
  FOR i IN 1..20 LOOP
    INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('CHN Student '  || i, 'STUDENT', v_tenant, v_d1);
    INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('MedSurg Student ' || i, 'STUDENT', v_tenant, v_d2);
    INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Psych Student ' || i, 'STUDENT', v_tenant, v_d3);
    INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Anatomy Student ' || i, 'STUDENT', v_tenant, v_d4);
    INSERT INTO profiles (full_name, role, tenant_id, department_id) VALUES ('Pharma Student ' || i, 'STUDENT', v_tenant, v_d5);
  END LOOP;

  -- ── Schedules — Community Health Nursing (v_d1) ───────────
  INSERT INTO schedules (department_id, tenant_id, subject_name, staff_id, day_of_week, start_time, end_time) VALUES
    (v_d1, v_tenant, 'Community Health',       s1,  'Monday',    '08:00', '09:00'),
    (v_d1, v_tenant, 'Community Health',       s1,  'Wednesday', '08:00', '09:00'),
    (v_d1, v_tenant, 'Community Health',       s1,  'Friday',    '08:00', '09:00'),
    (v_d1, v_tenant, 'Epidemiology',           s2,  'Monday',    '09:00', '10:00'),
    (v_d1, v_tenant, 'Epidemiology',           s2,  'Thursday',  '09:00', '10:00'),
    (v_d1, v_tenant, 'Public Health Nursing',  s3,  'Tuesday',   '10:00', '12:00'),
    (v_d1, v_tenant, 'Public Health Nursing',  s3,  'Friday',    '10:00', '12:00'),
    (v_d1, v_tenant, 'Family Health',          s4,  'Monday',    '13:00', '14:00'),
    (v_d1, v_tenant, 'Family Health',          s4,  'Wednesday', '13:00', '14:00'),
    (v_d1, v_tenant, 'Family Health',          s4,  'Saturday',  '09:00', '10:00'),
    (v_d1, v_tenant, 'Biostatistics',          s1,  'Tuesday',   '14:00', '15:00'),
    (v_d1, v_tenant, 'Biostatistics',          s1,  'Thursday',  '14:00', '15:00');

  -- ── Schedules — Medical Surgery (v_d2) ────────────────────
  INSERT INTO schedules (department_id, tenant_id, subject_name, staff_id, day_of_week, start_time, end_time) VALUES
    (v_d2, v_tenant, 'Medical-Surgical Nursing', s5,  'Monday',    '08:00', '10:00'),
    (v_d2, v_tenant, 'Medical-Surgical Nursing', s5,  'Thursday',  '08:00', '10:00'),
    (v_d2, v_tenant, 'Anatomy',                  s6,  'Monday',    '10:00', '11:00'),
    (v_d2, v_tenant, 'Anatomy',                  s6,  'Wednesday', '10:00', '11:00'),
    (v_d2, v_tenant, 'Anatomy',                  s6,  'Friday',    '10:00', '11:00'),
    (v_d2, v_tenant, 'Pharmacology',             s7,  'Tuesday',   '08:00', '09:00'),
    (v_d2, v_tenant, 'Pharmacology',             s7,  'Thursday',  '11:00', '12:00'),
    (v_d2, v_tenant, 'Pathology',                s8,  'Monday',    '13:00', '15:00'),
    (v_d2, v_tenant, 'Pathology',                s8,  'Wednesday', '13:00', '14:00'),
    (v_d2, v_tenant, 'Critical Care',            s5,  'Tuesday',   '14:00', '16:00'),
    (v_d2, v_tenant, 'Critical Care',            s5,  'Friday',    '13:00', '15:00'),
    (v_d2, v_tenant, 'Wound Management',         s6,  'Saturday',  '08:00', '10:00');

  -- ── Schedules — Psychiatry (v_d3) ────────────────────────
  INSERT INTO schedules (department_id, tenant_id, subject_name, staff_id, day_of_week, start_time, end_time) VALUES
    (v_d3, v_tenant, 'Mental Health Nursing',  s9,  'Monday',    '08:00', '09:00'),
    (v_d3, v_tenant, 'Mental Health Nursing',  s9,  'Wednesday', '08:00', '09:00'),
    (v_d3, v_tenant, 'Mental Health Nursing',  s9,  'Friday',    '08:00', '09:00'),
    (v_d3, v_tenant, 'Psychology',             s10, 'Monday',    '10:00', '11:00'),
    (v_d3, v_tenant, 'Psychology',             s10, 'Thursday',  '10:00', '11:00'),
    (v_d3, v_tenant, 'Psychiatric Disorders',  s11, 'Tuesday',   '09:00', '11:00'),
    (v_d3, v_tenant, 'Psychiatric Disorders',  s11, 'Friday',    '09:00', '10:00'),
    (v_d3, v_tenant, 'Behavioral Science',     s12, 'Wednesday', '13:00', '14:00'),
    (v_d3, v_tenant, 'Behavioral Science',     s12, 'Saturday',  '09:00', '11:00'),
    (v_d3, v_tenant, 'Counselling Skills',     s9,  'Tuesday',   '13:00', '14:00'),
    (v_d3, v_tenant, 'Counselling Skills',     s9,  'Thursday',  '14:00', '15:00');

  -- ── Schedules — Anatomy (v_d4) ───────────────────────────
  INSERT INTO schedules (department_id, tenant_id, subject_name, staff_id, day_of_week, start_time, end_time) VALUES
    (v_d4, v_tenant, 'Gross Anatomy',   s13, 'Monday',    '08:00', '10:00'),
    (v_d4, v_tenant, 'Gross Anatomy',   s13, 'Wednesday', '08:00', '10:00'),
    (v_d4, v_tenant, 'Gross Anatomy',   s13, 'Friday',    '08:00', '09:00'),
    (v_d4, v_tenant, 'Histology',       s14, 'Monday',    '11:00', '12:00'),
    (v_d4, v_tenant, 'Histology',       s14, 'Thursday',  '10:00', '11:00'),
    (v_d4, v_tenant, 'Embryology',      s15, 'Tuesday',   '08:00', '10:00'),
    (v_d4, v_tenant, 'Embryology',      s15, 'Friday',    '10:00', '11:00'),
    (v_d4, v_tenant, 'Neuroanatomy',    s16, 'Wednesday', '13:00', '15:00'),
    (v_d4, v_tenant, 'Neuroanatomy',    s16, 'Saturday',  '09:00', '11:00'),
    (v_d4, v_tenant, 'Lab Dissection',  s13, 'Tuesday',   '13:00', '16:00'),
    (v_d4, v_tenant, 'Lab Dissection',  s13, 'Thursday',  '13:00', '16:00');

  -- ── Schedules — Pharmacology (v_d5) ──────────────────────
  INSERT INTO schedules (department_id, tenant_id, subject_name, staff_id, day_of_week, start_time, end_time) VALUES
    (v_d5, v_tenant, 'Drug Therapy',         s17, 'Monday',    '08:00', '09:00'),
    (v_d5, v_tenant, 'Drug Therapy',         s17, 'Wednesday', '08:00', '09:00'),
    (v_d5, v_tenant, 'Drug Therapy',         s17, 'Friday',    '08:00', '09:00'),
    (v_d5, v_tenant, 'Clinical Pharmacology',s18, 'Monday',    '10:00', '12:00'),
    (v_d5, v_tenant, 'Clinical Pharmacology',s18, 'Thursday',  '10:00', '12:00'),
    (v_d5, v_tenant, 'Toxicology',           s19, 'Tuesday',   '09:00', '10:00'),
    (v_d5, v_tenant, 'Toxicology',           s19, 'Thursday',  '09:00', '10:00'),
    (v_d5, v_tenant, 'Pharmacokinetics',     s20, 'Wednesday', '13:00', '14:00'),
    (v_d5, v_tenant, 'Pharmacokinetics',     s20, 'Friday',    '13:00', '14:00'),
    (v_d5, v_tenant, 'Drug Interactions',    s17, 'Tuesday',   '13:00', '15:00'),
    (v_d5, v_tenant, 'Drug Interactions',    s17, 'Saturday',  '08:00', '10:00'),
    (v_d5, v_tenant, 'Dispensing Practice',  s18, 'Friday',    '14:00', '16:00');

END $$;
