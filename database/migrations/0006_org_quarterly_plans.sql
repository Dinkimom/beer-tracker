-- Квартальный план организации (docs/QUARTERLY_PLAN_RULES.md): один документ на организацию и квартал.
-- content — направления, эпики, назначения, связи и заметки (QuarterlyPlanContent), люди в нём — по staff_id.
-- version растёт на каждое сохранение: запись идёт с ожидаемой версией, чужая правка → конфликт (QS5).
-- Имя не quarterly_plans: так называлась таблица прежнего плана, удалённая в 0005.
CREATE TABLE org_quarterly_plans (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    quarter SMALLINT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    content JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, year, quarter)
);
