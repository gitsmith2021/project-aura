-- ============================================================
-- AURA Seed: Update Colleges & Generate Massive Sample Data
-- Run this in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  v_thorp UUID;
  v_heber UUID;
  v_nursing UUID;
  v_dept UUID;
  i INT;
  j INT;
  dept_array UUID[];
BEGIN
  -- ── 1. Rename existing colleges if they exist ───────────────────────────
  UPDATE tenants SET name = 'Bishop Thorp College', subdomain = 'thorp' WHERE name = 'DND College';
  UPDATE tenants SET name = 'Bishops College of Nursing', subdomain = 'bishopsnursing' WHERE name ILIKE '%Bishops Nursing%';
  UPDATE tenants SET name = 'Bishop Heber College', subdomain = 'heber' WHERE name = 'DND College of Nursing';

  -- ── 2. Create them if they didn't exist ───────────────────────────
  INSERT INTO tenants (name, subdomain, college_type) VALUES ('Bishop Thorp College', 'thorp', 'Arts') ON CONFLICT DO NOTHING;
  INSERT INTO tenants (name, subdomain, college_type) VALUES ('Bishops College of Nursing', 'bishopsnursing', 'Health') ON CONFLICT DO NOTHING;
  INSERT INTO tenants (name, subdomain, college_type) VALUES ('Bishop Heber College', 'heber', 'Arts') ON CONFLICT DO NOTHING;

  -- Get their IDs
  SELECT id INTO v_thorp FROM tenants WHERE name = 'Bishop Thorp College' LIMIT 1;
  SELECT id INTO v_nursing FROM tenants WHERE name = 'Bishops College of Nursing' LIMIT 1;
  SELECT id INTO v_heber FROM tenants WHERE name = 'Bishop Heber College' LIMIT 1;

  -- ── 3. Clean up old data for these colleges to ensure exact counts ─────────
  DELETE FROM schedules WHERE tenant_id IN (v_thorp, v_nursing, v_heber) AND tenant_id IS NOT NULL;
  DELETE FROM profiles WHERE tenant_id IN (v_thorp, v_nursing, v_heber) AND tenant_id IS NOT NULL;
  DELETE FROM departments WHERE tenant_id IN (v_thorp, v_nursing, v_heber) AND tenant_id IS NOT NULL;

  -- =========================================================================
  -- A. BISHOP THORP COLLEGE (7 Depts, 20 Staff, 400 Students)
  -- =========================================================================
  dept_array := ARRAY[]::UUID[];
  FOR i IN 1..7 LOOP
    INSERT INTO departments (name, tenant_id) VALUES ('Thorp Department ' || i, v_thorp) RETURNING id INTO v_dept;
    dept_array := array_append(dept_array, v_dept);
  END LOOP;
  
  -- Insert 20 Staff
  FOR i IN 1..20 LOOP
    INSERT INTO profiles (full_name, role, tenant_id, department_id) 
    VALUES ('Thorp Staff ' || i, 'STAFF', v_thorp, dept_array[1 + (i % 7)]);
  END LOOP;
  
  -- Insert 400 Students
  FOR i IN 1..400 LOOP
    INSERT INTO profiles (full_name, role, tenant_id, department_id) 
    VALUES ('Thorp Student ' || i, 'STUDENT', v_thorp, dept_array[1 + (i % 7)]);
  END LOOP;

  -- =========================================================================
  -- B. BISHOP HEBER COLLEGE (16 Depts, 100 Staff, 4500 Students)
  -- =========================================================================
  dept_array := ARRAY[]::UUID[];
  FOR i IN 1..16 LOOP
    INSERT INTO departments (name, tenant_id) VALUES ('Heber Department ' || i, v_heber) RETURNING id INTO v_dept;
    dept_array := array_append(dept_array, v_dept);
  END LOOP;
  
  -- Insert 100 Staff
  FOR i IN 1..100 LOOP
    INSERT INTO profiles (full_name, role, tenant_id, department_id) 
    VALUES ('Heber Staff ' || i, 'STAFF', v_heber, dept_array[1 + (i % 16)]);
  END LOOP;
  
  -- Insert 4500 Students
  FOR i IN 1..4500 LOOP
    INSERT INTO profiles (full_name, role, tenant_id, department_id) 
    VALUES ('Heber Student ' || i, 'STUDENT', v_heber, dept_array[1 + (i % 16)]);
  END LOOP;

  -- =========================================================================
  -- C. BISHOPS COLLEGE OF NURSING (10 Depts, 20 Staff, 600 Students)
  -- =========================================================================
  dept_array := ARRAY[]::UUID[];
  FOR i IN 1..10 LOOP
    INSERT INTO departments (name, tenant_id) VALUES ('Nursing Speciality ' || i, v_nursing) RETURNING id INTO v_dept;
    dept_array := array_append(dept_array, v_dept);
  END LOOP;
  
  -- Insert 20 Staff
  FOR i IN 1..20 LOOP
    INSERT INTO profiles (full_name, role, tenant_id, department_id) 
    VALUES ('Nursing Staff ' || i, 'STAFF', v_nursing, dept_array[1 + (i % 10)]);
  END LOOP;
  
  -- Insert 600 Students
  FOR i IN 1..600 LOOP
    INSERT INTO profiles (full_name, role, tenant_id, department_id) 
    VALUES ('Nursing Student ' || i, 'STUDENT', v_nursing, dept_array[1 + (i % 10)]);
  END LOOP;

END $$;
