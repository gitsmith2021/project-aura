-- Phase 5B — Staff Recruitment Module
-- job_postings: open roles published by admins
-- job_applications: candidates in the hiring pipeline

CREATE TABLE public.job_postings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  department_id    UUID REFERENCES departments(id),
  employment_type  TEXT NOT NULL DEFAULT 'full_time'
                   CHECK (employment_type IN ('full_time','part_time','contract','visiting')),
  experience_years INTEGER,
  qualifications   TEXT,
  description      TEXT,
  deadline         DATE,
  vacancies        INTEGER NOT NULL DEFAULT 1,
  status           TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','closed','on_hold')),
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_postings: super admin full access"
  ON public.job_postings
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "job_postings: institution members can manage"
  ON public.job_postings
  USING (
    institution_id IN (
      SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
    )
  );

CREATE INDEX idx_job_postings_institution ON public.job_postings(institution_id, status);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.job_applications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  job_posting_id      UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  applicant_name      TEXT NOT NULL,
  applicant_email     TEXT NOT NULL,
  applicant_phone     TEXT,
  current_employer    TEXT,
  experience_years    NUMERIC(4,1),
  qualifications      TEXT,
  cv_url              TEXT,
  status              TEXT NOT NULL DEFAULT 'applied'
                      CHECK (status IN ('applied','screened','interview','offer','joined','rejected')),
  interview_date      TIMESTAMPTZ,
  interview_notes     TEXT,
  offer_date          DATE,
  offer_details       TEXT,
  admin_notes         TEXT,
  converted_staff_id  UUID REFERENCES staff(id),
  applied_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_applications: super admin full access"
  ON public.job_applications
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "job_applications: institution members can manage"
  ON public.job_applications
  USING (
    institution_id IN (
      SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
    )
  );

CREATE INDEX idx_job_applications_posting      ON public.job_applications(job_posting_id, status);
CREATE INDEX idx_job_applications_institution  ON public.job_applications(institution_id, status);
