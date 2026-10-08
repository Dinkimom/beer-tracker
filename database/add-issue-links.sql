-- Кэш связей задач Tracker/Jira (write-through из API приложения).
-- Для уже существующей БД без этой таблицы (init.sql применялся раньше):
--   psql -v ON_ERROR_STOP=1 ... -f database/add-issue-links.sql
-- Docker entrypoint init.sql сам том не обновляет.

CREATE TABLE IF NOT EXISTS beer_tracker.issue_links (
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    issue_key TEXT NOT NULL,
    tracker_link_id TEXT NOT NULL,
    linked_issue_key TEXT NOT NULL,
    relationship TEXT NOT NULL
        CHECK (relationship IN (
            'relates',
            'blocks',
            'blocked_by',
            'duplicates',
            'duplicated_by'
        )),
    direction TEXT NOT NULL
        CHECK (direction IN ('outward', 'inward')),
    linked_summary TEXT,
    linked_status TEXT,
    synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, issue_key, tracker_link_id)
);

CREATE INDEX IF NOT EXISTS idx_issue_links_org_linked
    ON beer_tracker.issue_links (organization_id, linked_issue_key);

CREATE INDEX IF NOT EXISTS idx_issue_links_org_issue_rel
    ON beer_tracker.issue_links (organization_id, issue_key, relationship);

COMMENT ON TABLE beer_tracker.issue_links IS
    'Кэш связей issue из Tracker (write-through; источник правды — Tracker API)';
