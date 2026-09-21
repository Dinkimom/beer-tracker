-- In-app уведомления пользователей (assignee, availability, sprint lifecycle).
-- Для уже существующей БД: psql ... -f database/add-user-notifications.sql

CREATE TABLE IF NOT EXISTS beer_tracker.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
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
    ON beer_tracker.user_notifications (organization_id, recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient_unread
    ON beer_tracker.user_notifications (organization_id, recipient_user_id, created_at DESC)
    WHERE read_at IS NULL;

COMMENT ON TABLE beer_tracker.user_notifications IS 'In-app уведомления: assignee, availability, sprint start/finish';
COMMENT ON COLUMN beer_tracker.user_notifications.recipient_user_id IS 'uuid из public.registry_employees (получатель)';
COMMENT ON COLUMN beer_tracker.user_notifications.actor_user_id IS 'uuid инициатора; NULL — системное';
COMMENT ON COLUMN beer_tracker.user_notifications.kind IS 'assignee_changed | availability_changed | comment_mention | sprint_started | sprint_finished';
COMMENT ON COLUMN beer_tracker.user_notifications.payload IS 'Контекст для i18n на клиенте (taskId, sprintName, …)';
