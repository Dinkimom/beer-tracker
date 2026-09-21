-- Черновые строки фич планера (не тикеты Трекера) + порядок/видимость доски «по фичам».
CREATE TABLE IF NOT EXISTS beer_tracker.sprint_feature_lanes (
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    draft_rows JSONB NOT NULL DEFAULT '[]',
    order_ids JSONB NOT NULL DEFAULT '[]',
    hidden_ids JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id)
);

DROP TRIGGER IF EXISTS update_sprint_feature_lanes_updated_at ON beer_tracker.sprint_feature_lanes;
CREATE TRIGGER update_sprint_feature_lanes_updated_at
    BEFORE UPDATE ON beer_tracker.sprint_feature_lanes
    FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

COMMENT ON TABLE beer_tracker.sprint_feature_lanes IS 'Черновые строки фич и порядок/видимость доски «по фичам»';
