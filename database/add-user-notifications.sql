-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- In-app уведомления пользователей (assignee, availability, sprint lifecycle).
-- Для уже существующей БД: psql ... -f database/add-user-notifications.sql

CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL,
    actor_user_id UUID,
    kind TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_notifications_kind_check CHECK (
        kind IN (
            'assignee_changed',
            'availability_changed',
            'comment_mention',
            'sprint_started',
            'sprint_finished'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient_created
    ON user_notifications (organization_id, recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient_unread
    ON user_notifications (organization_id, recipient_user_id, created_at DESC)
    WHERE read_at IS NULL;

COMMENT ON TABLE user_notifications IS 'In-app уведомления: assignee, availability, sprint start/finish';
COMMENT ON COLUMN user_notifications.recipient_user_id IS 'uuid из public.registry_employees (получатель)';
COMMENT ON COLUMN user_notifications.actor_user_id IS 'uuid инициатора; NULL — системное';
COMMENT ON COLUMN user_notifications.kind IS 'assignee_changed | availability_changed | comment_mention | sprint_started | sprint_finished';
COMMENT ON COLUMN user_notifications.payload IS 'Контекст для i18n на клиенте (taskId, sprintName, …)';
