-- Phase 4J — Sports & Physical Education
-- Tables: sports_facilities · sports_teams · sports_team_members · sports_achievements

-- ── sports_facilities ─────────────────────────────────────────────────────────
CREATE TABLE sports_facilities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  sport_type     TEXT NOT NULL,
  capacity       INTEGER,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sports_facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sports_facilities: institution members read"
  ON sports_facilities FOR SELECT
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));

CREATE POLICY "sports_facilities: admin write"
  ON sports_facilities FOR ALL
  USING (institution_id IN (
    SELECT institution_id FROM institution_members
    WHERE profile_id = auth.uid() AND role IN ('ADMIN', 'PRINCIPAL')
  ))
  WITH CHECK (institution_id IN (
    SELECT institution_id FROM institution_members
    WHERE profile_id = auth.uid() AND role IN ('ADMIN', 'PRINCIPAL')
  ));

CREATE INDEX idx_sports_facilities_institution ON sports_facilities(institution_id);

-- ── sports_teams ──────────────────────────────────────────────────────────────
CREATE TABLE sports_teams (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  sport_name       TEXT NOT NULL,
  team_category    TEXT NOT NULL CHECK (team_category IN ('men', 'women', 'mixed')),
  coach_id         UUID REFERENCES staff(id) ON DELETE SET NULL,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sports_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sports_teams: institution members read"
  ON sports_teams FOR SELECT
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));

CREATE POLICY "sports_teams: admin write"
  ON sports_teams FOR ALL
  USING (institution_id IN (
    SELECT institution_id FROM institution_members
    WHERE profile_id = auth.uid() AND role IN ('ADMIN', 'PRINCIPAL')
  ))
  WITH CHECK (institution_id IN (
    SELECT institution_id FROM institution_members
    WHERE profile_id = auth.uid() AND role IN ('ADMIN', 'PRINCIPAL')
  ));

CREATE INDEX idx_sports_teams_institution    ON sports_teams(institution_id);
CREATE INDEX idx_sports_teams_academic_year  ON sports_teams(academic_year_id);

-- ── sports_team_members ───────────────────────────────────────────────────────
CREATE TABLE sports_team_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES sports_teams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  position   TEXT,
  joined_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(team_id, student_id)
);

ALTER TABLE sports_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sports_team_members: institution members read"
  ON sports_team_members FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM sports_teams
      WHERE institution_id IN (
        SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "sports_team_members: admin write"
  ON sports_team_members FOR ALL
  USING (
    team_id IN (
      SELECT id FROM sports_teams
      WHERE institution_id IN (
        SELECT institution_id FROM institution_members
        WHERE profile_id = auth.uid() AND role IN ('ADMIN', 'PRINCIPAL')
      )
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT id FROM sports_teams
      WHERE institution_id IN (
        SELECT institution_id FROM institution_members
        WHERE profile_id = auth.uid() AND role IN ('ADMIN', 'PRINCIPAL')
      )
    )
  );

CREATE INDEX idx_sports_team_members_team    ON sports_team_members(team_id);
CREATE INDEX idx_sports_team_members_student ON sports_team_members(student_id);

-- ── sports_achievements ───────────────────────────────────────────────────────
CREATE TABLE sports_achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  team_id         UUID REFERENCES sports_teams(id) ON DELETE SET NULL,
  student_id      UUID REFERENCES students(id) ON DELETE SET NULL,
  event_name      TEXT NOT NULL,
  level           TEXT NOT NULL CHECK (level IN (
                    'inter_class', 'inter_college', 'district',
                    'state', 'national', 'international')),
  position        TEXT NOT NULL,   -- Gold, Silver, Bronze, Participant, Runner-up, etc.
  event_date      DATE NOT NULL,
  certificate_url TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sports_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sports_achievements: institution members read"
  ON sports_achievements FOR SELECT
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));

CREATE POLICY "sports_achievements: admin write"
  ON sports_achievements FOR ALL
  USING (institution_id IN (
    SELECT institution_id FROM institution_members
    WHERE profile_id = auth.uid() AND role IN ('ADMIN', 'PRINCIPAL')
  ))
  WITH CHECK (institution_id IN (
    SELECT institution_id FROM institution_members
    WHERE profile_id = auth.uid() AND role IN ('ADMIN', 'PRINCIPAL')
  ));

CREATE INDEX idx_sports_achievements_institution ON sports_achievements(institution_id);
CREATE INDEX idx_sports_achievements_student     ON sports_achievements(student_id);
CREATE INDEX idx_sports_achievements_team        ON sports_achievements(team_id);
CREATE INDEX idx_sports_achievements_level       ON sports_achievements(level);
CREATE INDEX idx_sports_achievements_date        ON sports_achievements(event_date DESC);
