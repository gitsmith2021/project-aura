-- Phase 4I — Health & Medical Records (Infirmary)
-- Tables: medical_records (student health profile) + medical_visits (visit log)

-- ── medical_records ───────────────────────────────────────────────────────────
-- One row per student; stores static health profile data (blood group, allergies,
-- emergency contact). Upserted by admin; read by admin/staff and the student themselves.

CREATE TABLE medical_records (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id          UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id              UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  blood_group             TEXT,
  known_allergies         TEXT,
  chronic_conditions      TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  insurance_policy        TEXT,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- Admin / staff / HOD can read all records for their institution
CREATE POLICY "medical_records: staff admin read all"
  ON medical_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM institution_members
      WHERE institution_id = medical_records.institution_id
        AND profile_id = auth.uid()
        AND role != 'STUDENT'
    )
  );

-- Students can read their own record only
CREATE POLICY "medical_records: student reads own"
  ON medical_records FOR SELECT
  USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Only admins / principals can insert new records
CREATE POLICY "medical_records: admin insert"
  ON medical_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM institution_members
      WHERE institution_id = medical_records.institution_id
        AND profile_id = auth.uid()
        AND role IN ('ADMIN', 'PRINCIPAL')
    )
  );

-- Only admins / principals can update records
CREATE POLICY "medical_records: admin update"
  ON medical_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM institution_members
      WHERE institution_id = medical_records.institution_id
        AND profile_id = auth.uid()
        AND role IN ('ADMIN', 'PRINCIPAL')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM institution_members
      WHERE institution_id = medical_records.institution_id
        AND profile_id = auth.uid()
        AND role IN ('ADMIN', 'PRINCIPAL')
    )
  );

CREATE INDEX idx_medical_records_institution ON medical_records(institution_id);
CREATE INDEX idx_medical_records_student     ON medical_records(student_id);

-- ── medical_visits ────────────────────────────────────────────────────────────
-- Every infirmary visit — patient (student or staff), symptoms, diagnosis,
-- medicines dispensed, referral to external hospital, follow-up date.

CREATE TABLE medical_visits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL REFERENCES auth.users(id),
  patient_type        TEXT NOT NULL CHECK (patient_type IN ('student', 'staff')),
  visit_date          TIMESTAMPTZ NOT NULL DEFAULT now(),
  symptoms            TEXT NOT NULL,
  diagnosis           TEXT,
  treatment_given     TEXT,
  medicines_dispensed JSONB,        -- Array of { name, dosage, quantity }
  referred_to         TEXT,         -- External hospital / doctor name if referred
  follow_up_date      DATE,
  attended_by         TEXT,         -- Doctor / nurse name
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE medical_visits ENABLE ROW LEVEL SECURITY;

-- Admin / staff / HOD can read all visits for their institution
CREATE POLICY "medical_visits: staff admin read all"
  ON medical_visits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM institution_members
      WHERE institution_id = medical_visits.institution_id
        AND profile_id = auth.uid()
        AND role != 'STUDENT'
    )
  );

-- Patient (student or staff) can read their own visits
CREATE POLICY "medical_visits: patient reads own"
  ON medical_visits FOR SELECT
  USING (patient_id = auth.uid());

-- Admin / staff can log visits (INSERT); students cannot log visits for themselves
CREATE POLICY "medical_visits: staff admin insert"
  ON medical_visits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM institution_members
      WHERE institution_id = medical_visits.institution_id
        AND profile_id = auth.uid()
        AND role != 'STUDENT'
    )
  );

CREATE INDEX idx_medical_visits_institution ON medical_visits(institution_id);
CREATE INDEX idx_medical_visits_patient     ON medical_visits(patient_id);
CREATE INDEX idx_medical_visits_date        ON medical_visits(visit_date DESC);
CREATE INDEX idx_medical_visits_followup    ON medical_visits(follow_up_date) WHERE follow_up_date IS NOT NULL;
