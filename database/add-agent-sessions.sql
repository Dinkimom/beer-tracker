-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Сессии работы с агентом и приватные драфты. Для уже существующей БД.
-- Чистая БД: всё есть в database/init.sql. Приложение также делает это само при первом обращении.

-- Приватные драфты: превью propose_plan_patch принадлежат пользователю.
-- Старые строки без владельца никому не показываются и уходят по TTL (30 мин).
ALTER TABLE plan_patch_position_previews ADD COLUMN IF NOT EXISTS owner_id VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE plan_patch_position_previews DROP CONSTRAINT IF EXISTS plan_patch_position_previews_pkey;
ALTER TABLE plan_patch_position_previews ADD PRIMARY KEY (organization_id, sprint_id, owner_id, task_id);

ALTER TABLE plan_patch_goal_previews ADD COLUMN IF NOT EXISTS owner_id VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE plan_patch_goal_previews DROP CONSTRAINT IF EXISTS plan_patch_goal_previews_pkey;
ALTER TABLE plan_patch_goal_previews ADD PRIMARY KEY (organization_id, sprint_id, owner_id, goal_id);

CREATE TABLE IF NOT EXISTS agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    owner_id VARCHAR(255) NOT NULL,
    task_id VARCHAR(255),
    title TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    origin VARCHAR(16) NOT NULL CHECK (origin IN ('planner', 'agent')),
    status VARCHAR(16) NOT NULL CHECK (status IN ('waiting_agent', 'waiting_user', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_owner ON agent_sessions (organization_id, owner_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_sprint ON agent_sessions (organization_id, sprint_id);

COMMENT ON TABLE agent_sessions IS 'Сессии работы с агентом: просьба из планера или чата, драфты и переписка; приватны владельцу';

CREATE TABLE IF NOT EXISTS agent_session_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions (id) ON DELETE CASCADE,
    author_kind VARCHAR(8) NOT NULL CHECK (author_kind IN ('user', 'agent')),
    author_id VARCHAR(255),
    kind VARCHAR(16) NOT NULL CHECK (kind IN ('request', 'comment', 'redo', 'message', 'draft', 'reply')),
    text TEXT NOT NULL,
    target_kind VARCHAR(16) CHECK (target_kind IN ('position', 'goal', 'note')),
    target_id VARCHAR(255),
    target_label TEXT,
    proposal_id VARCHAR(64),
    reply_to UUID REFERENCES agent_session_messages (id) ON DELETE CASCADE,
    resolution VARCHAR(16) CHECK (resolution IN ('addressed', 'declined')),
    mentions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_session_messages_session ON agent_session_messages (session_id, created_at);
