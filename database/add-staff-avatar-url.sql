-- URL аватара в beer_tracker.staff (колонка avatar_url).
-- Для уже существующей БД:
--   psql -v ON_ERROR_STOP=1 -f database/add-staff-avatar-url.sql
--
-- Чистая БД: колонка есть в database/init.sql.
-- Если есть public.registry_employees — копирует avatar_link в staff
-- (по uuid, затем по email), не затирая уже заполненные значения.

ALTER TABLE beer_tracker.staff
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN beer_tracker.staff.avatar_url IS
    'URL изображения аватара сотрудника (копия registry_employees.avatar_link или сохранённый адрес)';

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
