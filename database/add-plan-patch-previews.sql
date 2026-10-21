-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Превью propose_plan_patch до apply.
-- Для уже существующей БД (init.sql применялся раньше).
-- Чистая БД: таблицы есть в database/init.sql.

CREATE TABLE IF NOT EXISTS plan_patch_position_previews (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    proposal_id VARCHAR(64) NOT NULL,
    assignee_id VARCHAR(255) NOT NULL,
    start_day INTEGER NOT NULL CHECK (start_day >= 0 AND start_day < 400),
    start_part INTEGER NOT NULL CHECK (start_part >= 0 AND start_part < 4),
    duration INTEGER NOT NULL CHECK (duration > 0),
    remove BOOLEAN NOT NULL DEFAULT FALSE,
    changes TEXT NOT NULL DEFAULT '',
    client_brand VARCHAR(16) NOT NULL DEFAULT '',
    segments JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (organization_id, sprint_id, task_id)
);

ALTER TABLE plan_patch_position_previews
    ADD COLUMN IF NOT EXISTS segments JSONB;

ALTER TABLE plan_patch_position_previews
    ADD COLUMN IF NOT EXISTS sync_to_tracker BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_plan_patch_position_previews_sprint
    ON plan_patch_position_previews (organization_id, sprint_id);

COMMENT ON TABLE plan_patch_position_previews IS 'Полупрозрачные карточки propose_plan_patch до apply';

CREATE TABLE IF NOT EXISTS plan_patch_goal_previews (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    goal_id UUID NOT NULL,
    proposal_id VARCHAR(64) NOT NULL,
    goal_type VARCHAR(16) NOT NULL CHECK (goal_type IN ('delivery', 'discovery')),
    action VARCHAR(16) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    text TEXT NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    client_brand VARCHAR(16) NOT NULL DEFAULT '',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (organization_id, sprint_id, goal_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_patch_goal_previews_sprint
    ON plan_patch_goal_previews (organization_id, sprint_id);

COMMENT ON TABLE plan_patch_goal_previews IS 'Предложения propose_plan_patch по целям спринта до apply';

-- Brand on draft sticky notes from createNote (same propose).
ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS client_brand VARCHAR(16) NOT NULL DEFAULT '';
