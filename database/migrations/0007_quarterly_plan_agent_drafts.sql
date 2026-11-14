-- Предложения агента для квартального плана (docs/QUARTERLY_PLAN_RULES.md, раздел 11).
--
-- Сессия агента теперь бывает про спринт или про квартал: ровно одно из двух.
ALTER TABLE agent_sessions
    ALTER COLUMN sprint_id DROP NOT NULL;

ALTER TABLE agent_sessions
    ADD COLUMN plan_year INTEGER,
    ADD COLUMN plan_quarter SMALLINT CHECK (plan_quarter BETWEEN 1 AND 4);

ALTER TABLE agent_sessions
    ADD CONSTRAINT agent_sessions_scope_check CHECK (
        (sprint_id IS NOT NULL AND plan_year IS NULL AND plan_quarter IS NULL)
        OR (sprint_id IS NULL AND plan_year IS NOT NULL AND plan_quarter IS NOT NULL)
    );

CREATE INDEX idx_agent_sessions_quarter
    ON agent_sessions (organization_id, plan_year, plan_quarter)
    WHERE sprint_id IS NULL;

-- Черновик агента для квартального плана: один на человека и квартал, как черновик спринта.
-- Хранится пакет операций и версия плана, на которой агент его собрал; при принятии операции
-- применяются к текущему плану.
CREATE TABLE org_quarterly_plan_drafts (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    quarter SMALLINT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    owner_id VARCHAR(255) NOT NULL,
    proposal_id VARCHAR(32) NOT NULL,
    base_version INTEGER NOT NULL CHECK (base_version >= 0),
    ops JSONB NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, year, quarter, owner_id)
);
