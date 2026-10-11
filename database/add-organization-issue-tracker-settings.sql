-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Тип трекера и URL API переехали из env (ISSUE_TRACKER_PROVIDER, TRACKER_API_URL)
-- в organizations.settings.issueTracker (provider, apiUrl).
-- Для уже существующей БД передайте прежние значения env:
--   ./scripts/db/psql-with-schema.sh -d beer_tracker \
--     -v provider=jira-onprem -v api_url=https://jira.example.com/rest/api/2 \
--     -f database/add-organization-issue-tracker-settings.sql
--
-- provider: tracker | yandex-tracker | jira-cloud | jira-onprem | jira (по умолчанию tracker).
-- api_url: обязателен для Jira; для Яндекс Трекера можно не задавать.
-- Идемпотентно: заполняет только пустые provider/apiUrl, сохранённое в админке не трогает.
-- Алиасы в уже сохранённых настройках приводятся к каноничным значениям.
-- Чистая БД: не нужна, трекер выбирается на /register.

\if :{?provider}
\else
\set provider tracker
\endif
\if :{?api_url}
\else
\set api_url ''
\endif

\o /dev/null
SELECT set_config('beer_tracker.migration_provider', :'provider', false),
       set_config('beer_tracker.migration_api_url', :'api_url', false);
\o

DO $$
DECLARE
  raw_provider TEXT := lower(trim(current_setting('beer_tracker.migration_provider')));
  env_api_url TEXT := regexp_replace(trim(current_setting('beer_tracker.migration_api_url')), '/+$', '');
  env_provider TEXT;
  filled_provider INT;
  filled_api_url INT;
  normalized INT;
BEGIN
  env_provider := CASE
    WHEN raw_provider IN ('tracker', 'yandex-tracker') THEN 'tracker'
    WHEN raw_provider IN ('jira-cloud', 'jira-onprem') THEN raw_provider
    WHEN raw_provider = 'jira' AND env_api_url ~* '^(https?://)?([^/]+\.)?atlassian\.(net|com)(/|$)'
      THEN 'jira-cloud'
    WHEN raw_provider = 'jira' THEN 'jira-onprem'
  END;
  IF env_provider IS NULL THEN
    RAISE EXCEPTION 'Unknown provider "%": expected tracker, jira-cloud or jira-onprem', raw_provider;
  END IF;
  IF env_provider <> 'tracker' AND env_api_url = '' THEN
    RAISE EXCEPTION 'api_url is required for %', env_provider;
  END IF;

  UPDATE organizations o
  SET settings = jsonb_set(
        COALESCE(o.settings, '{}'::jsonb),
        '{issueTracker}',
        COALESCE(o.settings -> 'issueTracker', '{}'::jsonb)
          || jsonb_build_object(
               'provider',
               CASE
                 WHEN lower(o.settings #>> '{issueTracker,provider}') = 'yandex-tracker' THEN 'tracker'
                 WHEN (o.settings #>> '{issueTracker,apiUrl}') ~* '^(https?://)?([^/]+\.)?atlassian\.(net|com)(/|$)'
                   THEN 'jira-cloud'
                 ELSE 'jira-onprem'
               END
             )
      ),
      updated_at = CURRENT_TIMESTAMP
  WHERE lower(o.settings #>> '{issueTracker,provider}') IN ('yandex-tracker', 'jira');
  GET DIAGNOSTICS normalized = ROW_COUNT;

  UPDATE organizations o
  SET settings = jsonb_set(
        COALESCE(o.settings, '{}'::jsonb),
        '{issueTracker}',
        COALESCE(o.settings -> 'issueTracker', '{}'::jsonb) || jsonb_build_object('provider', env_provider)
      ),
      updated_at = CURRENT_TIMESTAMP
  WHERE COALESCE(trim(o.settings #>> '{issueTracker,provider}'), '') = '';
  GET DIAGNOSTICS filled_provider = ROW_COUNT;

  IF env_api_url <> '' THEN
    UPDATE organizations o
    SET settings = jsonb_set(o.settings, '{issueTracker,apiUrl}', to_jsonb(env_api_url)),
        updated_at = CURRENT_TIMESTAMP
    WHERE o.settings #>> '{issueTracker,provider}' = env_provider
      AND COALESCE(trim(o.settings #>> '{issueTracker,apiUrl}'), '') = '';
    GET DIAGNOSTICS filled_api_url = ROW_COUNT;
  ELSE
    filled_api_url := 0;
  END IF;

  RAISE NOTICE 'issueTracker: provider filled for % org(s), apiUrl filled for % org(s), aliases normalized for % org(s)',
    filled_provider, filled_api_url, normalized;
END $$;
