-- Phase 4K — Annual Day & Large Campus Event Management
-- Tables: campus_events · event_participants

-- ── campus_events ─────────────────────────────────────────────────────────────
CREATE TABLE campus_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id       UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  academic_year_id     UUID REFERENCES academic_years(id) ON DELETE SET NULL,
  title                TEXT NOT NULL,
  event_type           TEXT NOT NULL CHECK (event_type IN (
                         'annual_day','sports_day','cultural_fest','tech_fest',
                         'convocation','orientation','open_day','seminar_day','other')),
  event_date           DATE NOT NULL,
  venue                TEXT,
  organizing_committee JSONB NOT NULL DEFAULT '[]',  -- Array<{staff_id, name, role}>
  budget_allocated     NUMERIC(10,2),
  actual_spend         NUMERIC(10,2) NOT NULL DEFAULT 0,
  attendees_count      INTEGER,
  photo_urls           JSONB NOT NULL DEFAULT '[]',  -- Array<string>
  description          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE campus_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campus_events: institution members read"
  ON campus_events FOR SELECT
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));

CREATE POLICY "campus_events: admin write"
  ON campus_events FOR ALL
  USING (institution_id IN (
    SELECT institution_id FROM institution_members
    WHERE profile_id = auth.uid() AND role IN ('ADMIN', 'PRINCIPAL')
  ))
  WITH CHECK (institution_id IN (
    SELECT institution_id FROM institution_members
    WHERE profile_id = auth.uid() AND role IN ('ADMIN', 'PRINCIPAL')
  ));

CREATE INDEX idx_campus_events_institution   ON campus_events(institution_id);
CREATE INDEX idx_campus_events_academic_year ON campus_events(academic_year_id);
CREATE INDEX idx_campus_events_date          ON campus_events(event_date DESC);
CREATE INDEX idx_campus_events_type          ON campus_events(event_type);

-- ── event_participants ────────────────────────────────────────────────────────
CREATE TABLE event_participants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES campus_events(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'participant'
             CHECK (role IN ('participant','organizer','performer','volunteer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, student_id)
);

ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_participants: institution members read"
  ON event_participants FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM campus_events
      WHERE institution_id IN (
        SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "event_participants: admin write"
  ON event_participants FOR ALL
  USING (
    event_id IN (
      SELECT id FROM campus_events
      WHERE institution_id IN (
        SELECT institution_id FROM institution_members
        WHERE profile_id = auth.uid() AND role IN ('ADMIN', 'PRINCIPAL')
      )
    )
  )
  WITH CHECK (
    event_id IN (
      SELECT id FROM campus_events
      WHERE institution_id IN (
        SELECT institution_id FROM institution_members
        WHERE profile_id = auth.uid() AND role IN ('ADMIN', 'PRINCIPAL')
      )
    )
  );

CREATE POLICY "event_participants: student self-register"
  ON event_participants FOR INSERT
  WITH CHECK (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
    AND role = 'participant'
  );

CREATE POLICY "event_participants: student read own"
  ON event_participants FOR SELECT
  USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

CREATE INDEX idx_event_participants_event   ON event_participants(event_id);
CREATE INDEX idx_event_participants_student ON event_participants(student_id);
