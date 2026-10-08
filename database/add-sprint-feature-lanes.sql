-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Черновые строки фич планера (не тикеты Трекера) + порядок/видимость доски «по фичам».
CREATE TABLE IF NOT EXISTS sprint_feature_lanes (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    draft_rows JSONB NOT NULL DEFAULT '[]',
    order_ids JSONB NOT NULL DEFAULT '[]',
    hidden_ids JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id)
);

DROP TRIGGER IF EXISTS update_sprint_feature_lanes_updated_at ON sprint_feature_lanes;
CREATE TRIGGER update_sprint_feature_lanes_updated_at
    BEFORE UPDATE ON sprint_feature_lanes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE sprint_feature_lanes IS 'Черновые строки фич и порядок/видимость доски «по фичам»';
