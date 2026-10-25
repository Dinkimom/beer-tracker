-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Применённые токены apply_plan_patch: токен одноразовый.
-- Для уже существующей БД (init.sql применялся раньше). Приложение также создаёт таблицу само.
-- Чистая БД: таблица есть в database/init.sql.

CREATE TABLE IF NOT EXISTS plan_patch_applied_tokens (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL,
    sprint_id INTEGER NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (organization_id, token_hash)
);

COMMENT ON TABLE plan_patch_applied_tokens IS 'Применённые токены apply_plan_patch (sha256 токена); строки старше expires_at удаляются при следующем применении';
