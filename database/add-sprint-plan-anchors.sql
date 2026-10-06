-- Якорь плана на момент перехода задачи в работу.
-- Для уже существующей БД (init.sql применялся раньше).
-- Чистая БД: таблица есть в database/init.sql.

CREATE TABLE IF NOT EXISTS beer_tracker.sprint_plan_captures (
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('draft', 'anchor')),
    anchored_at TIMESTAMP WITH TIME ZONE,
    assignee_id VARCHAR(255) NOT NULL,
    start_day INTEGER NOT NULL CHECK (start_day >= 0 AND start_day < 400),
    start_part INTEGER NOT NULL CHECK (start_part >= 0 AND start_part < 4),
    duration INTEGER NOT NULL CHECK (duration > 0),
    segments JSONB,
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id, task_id, kind),
    CONSTRAINT sprint_plan_captures_anchor_time CHECK (kind = 'draft' OR anchored_at IS NOT NULL)
);

COMMENT ON TABLE beer_tracker.sprint_plan_captures IS 'Черновик плана до рабочего статуса и якорь на момент перехода в работу';
