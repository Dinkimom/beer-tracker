-- История версий квартального плана (docs/QUARTERLY_PLAN_RULES.md, раздел «История версий»).
-- Каждое сохранение плана оставляет снимок содержимого; правки одного человека подряд склеиваются
-- в одну версию. content — как в org_quarterly_plans (люди по staff_id), plan_version — номер
-- версии плана после этого сохранения. baseline — план, каким он был до начала истории.
CREATE TABLE org_quarterly_plan_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    quarter SMALLINT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    plan_version INTEGER NOT NULL CHECK (plan_version >= 0),
    content JSONB NOT NULL,
    author_id VARCHAR(255),
    source TEXT NOT NULL CHECK (source IN ('agent', 'baseline', 'restore', 'user')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_org_quarterly_plan_versions_plan
    ON org_quarterly_plan_versions (organization_id, year, quarter, created_at DESC);
