-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Ручная раскладка свимлейна: слой карточки (задачи или заметки `comment:<id>`) в строке.
-- Таблица также создаётся автоматически при первом обращении.
CREATE TABLE IF NOT EXISTS swimlane_card_layers (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    card_id VARCHAR(255) NOT NULL,
    layer INTEGER NOT NULL CHECK (layer >= 0 AND layer < 50),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id, card_id)
);

COMMENT ON TABLE swimlane_card_layers IS 'Слой карточки в строке свимлейна, заданный вручную';
