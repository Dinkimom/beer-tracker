-- Каталог команд и сотрудников в beer_tracker (для уже существующей БД).
-- Чистая БД: таблицы уже есть в database/init.sql — этот файл идемпотентен.
--
--   psql -v ON_ERROR_STOP=1 -h localhost -p 5433 -U postgres -d beer_tracker -f database/add-staff-teams.sql
--
-- Docker (порт БД на хосте 5433):
--   PGPASSWORD=... psql -h localhost -p 5433 -U postgres -d beer_tracker -v ON_ERROR_STOP=1 -f database/add-staff-teams.sql
--
-- Делает:
--   1) beer_tracker.staff, teams, team_members, system_roles, org_roles (если ещё нет)
--   2) если есть overseer.teams / public.registry_employees и в beer_tracker уже есть
--      организация — один раз копирует каталог в самую старую организацию
--      (id сотрудников = registry uuid, id команд = overseer.teams.uid)

CREATE OR REPLACE FUNCTION beer_tracker.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS beer_tracker.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    tracker_user_id TEXT,
    display_name TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    manual_override_flags JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_organization ON beer_tracker.staff (organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_org_tracker_user
    ON beer_tracker.staff (organization_id, tracker_user_id)
    WHERE tracker_user_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_staff_updated_at ON beer_tracker.staff;
CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON beer_tracker.staff
    FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

ALTER TABLE beer_tracker.staff
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON TABLE beer_tracker.staff IS 'Сотрудники организации; связь с трекером через tracker_user_id';
COMMENT ON COLUMN beer_tracker.staff.avatar_url IS 'URL изображения аватара сотрудника';

CREATE TABLE IF NOT EXISTS beer_tracker.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    tracker_queue_key TEXT NOT NULL,
    tracker_board_id BIGINT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, tracker_board_id)
);

CREATE INDEX IF NOT EXISTS idx_teams_organization ON beer_tracker.teams (organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_org_board ON beer_tracker.teams (organization_id, tracker_board_id);

DROP TRIGGER IF EXISTS update_teams_updated_at ON beer_tracker.teams;
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON beer_tracker.teams
    FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

COMMENT ON TABLE beer_tracker.teams IS 'Команда с привязкой к очереди и доске трекера (резолв по boardId)';

CREATE TABLE IF NOT EXISTS beer_tracker.team_members (
    team_id UUID NOT NULL REFERENCES beer_tracker.teams (id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES beer_tracker.staff (id) ON DELETE CASCADE,
    role_slug TEXT,
    PRIMARY KEY (team_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_staff ON beer_tracker.team_members (staff_id);

COMMENT ON TABLE beer_tracker.team_members IS 'Состав команды: staff_id → beer_tracker.staff';

CREATE TABLE IF NOT EXISTS beer_tracker.system_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    domain_role TEXT NOT NULL DEFAULT 'other',
    platforms JSONB NOT NULL DEFAULT '[]',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_system_roles_slug UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_system_roles_sort ON beer_tracker.system_roles (sort_order);

DROP TRIGGER IF EXISTS update_system_roles_updated_at ON beer_tracker.system_roles;
CREATE TRIGGER update_system_roles_updated_at
    BEFORE UPDATE ON beer_tracker.system_roles
    FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

COMMENT ON TABLE beer_tracker.system_roles IS 'Глобальные системные роли (сид при инициализации); не удалять через org_admin UI';

INSERT INTO beer_tracker.system_roles (slug, title, domain_role, platforms, sort_order) VALUES
    ('frontend', 'Фронтенд', 'developer', '["web"]', 10),
    ('backend', 'Бэкенд', 'developer', '["back"]', 20),
    ('qa', 'QA', 'tester', '[]', 30),
    ('teamlead', 'Тимлид', 'developer', '["web","back"]', 40)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS beer_tracker.org_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    domain_role TEXT NOT NULL DEFAULT 'other',
    platforms JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_org_roles_org ON beer_tracker.org_roles (organization_id);

DROP TRIGGER IF EXISTS update_org_roles_updated_at ON beer_tracker.org_roles;
CREATE TRIGGER update_org_roles_updated_at
    BEFORE UPDATE ON beer_tracker.org_roles
    FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

COMMENT ON TABLE beer_tracker.org_roles IS 'Пользовательские роли организации';

DO $$
DECLARE
  target_org_id uuid;
BEGIN
  IF to_regclass('overseer.teams') IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO target_org_id
    FROM beer_tracker.organizations
   ORDER BY created_at ASC
   LIMIT 1;

  IF target_org_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM beer_tracker.teams) THEN
    INSERT INTO beer_tracker.teams (
      id, organization_id, slug, title, tracker_queue_key, tracker_board_id, active
    )
    SELECT
      ot.uid,
      target_org_id,
      COALESCE(NULLIF(TRIM(ot.slug), ''), NULLIF(TRIM(ot.queue), ''), ot.uid::text),
      COALESCE(NULLIF(TRIM(ot.title), ''), NULLIF(TRIM(ot.slug), ''), ot.uid::text),
      COALESCE(NULLIF(TRIM(ot.queue), ''), 'QUEUE'),
      ot.board,
      COALESCE(ot.active, TRUE)
    FROM overseer.teams ot
    WHERE ot.uid IS NOT NULL
      AND ot.board IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;

  IF to_regclass('public.registry_employees') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM beer_tracker.staff) THEN
    INSERT INTO beer_tracker.staff (
      id, organization_id, tracker_user_id, display_name, email, avatar_url
    )
    SELECT DISTINCT ON (re.uuid)
      re.uuid,
      target_org_id,
      NULLIF(TRIM(re.tracker_id::text), ''),
      COALESCE(
        NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(re.name), ''), NULLIF(TRIM(re.surname), ''))), ''),
        NULLIF(TRIM(re.fullname), ''),
        NULLIF(TRIM(re.email), ''),
        re.uuid::text
      ),
      NULLIF(LOWER(TRIM(re.email)), ''),
      NULLIF(TRIM(re.avatar_link), '')
    FROM public.registry_employees re
    WHERE re.uuid IS NOT NULL
    ORDER BY re.uuid
    ON CONFLICT DO NOTHING;
  END IF;

  IF to_regclass('overseer.staff_teams') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM beer_tracker.team_members) THEN
    IF to_regclass('overseer.staff_roles') IS NOT NULL
       AND to_regclass('overseer.roles') IS NOT NULL THEN
      INSERT INTO beer_tracker.team_members (team_id, staff_id, role_slug)
      SELECT
        st.team_uid,
        st.staff_uid,
        role_pick.slug
      FROM overseer.staff_teams st
      INNER JOIN beer_tracker.teams t ON t.id = st.team_uid
      INNER JOIN beer_tracker.staff s ON s.id = st.staff_uid
      LEFT JOIN LATERAL (
        SELECT r.slug
        FROM overseer.staff_roles sr
        INNER JOIN overseer.roles r ON r.uid = sr.role_uid
        WHERE sr.staff_uid = st.staff_uid
          AND COALESCE(r.active, TRUE) = TRUE
        ORDER BY r.slug ASC
        LIMIT 1
      ) role_pick ON TRUE
      ON CONFLICT (team_id, staff_id) DO NOTHING;
    ELSE
      INSERT INTO beer_tracker.team_members (team_id, staff_id, role_slug)
      SELECT st.team_uid, st.staff_uid, NULL
      FROM overseer.staff_teams st
      INNER JOIN beer_tracker.teams t ON t.id = st.team_uid
      INNER JOIN beer_tracker.staff s ON s.id = st.staff_uid
      ON CONFLICT (team_id, staff_id) DO NOTHING;
    END IF;
  END IF;
END $$;

-- Дозаполнить avatar_url из реестра, если staff уже был без колонки/ссылок.
DO $$
BEGIN
  IF to_regclass('public.registry_employees') IS NULL THEN
    RETURN;
  END IF;

  UPDATE beer_tracker.staff s
  SET avatar_url = NULLIF(TRIM(re.avatar_link), '')
  FROM public.registry_employees re
  WHERE re.uuid = s.id
    AND s.avatar_url IS NULL
    AND NULLIF(TRIM(re.avatar_link), '') IS NOT NULL;

  UPDATE beer_tracker.staff s
  SET avatar_url = NULLIF(TRIM(re.avatar_link), '')
  FROM public.registry_employees re
  WHERE s.avatar_url IS NULL
    AND s.email IS NOT NULL
    AND re.email IS NOT NULL
    AND LOWER(TRIM(s.email)) = LOWER(TRIM(re.email))
    AND NULLIF(TRIM(re.avatar_link), '') IS NOT NULL;
END $$;
