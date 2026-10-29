-- Сессии разработки: человек отдаёт задачу агенту в работу прямо с планера. Агент пишет код у себя
-- и присылает результат — ветку, коммиты, тесты (сообщение kind = 'result', данные в result).
ALTER TABLE agent_sessions
    ADD COLUMN kind VARCHAR(8) NOT NULL DEFAULT 'plan' CHECK (kind IN ('plan', 'dev'));

ALTER TABLE agent_session_messages
    DROP CONSTRAINT IF EXISTS agent_session_messages_kind_check;

ALTER TABLE agent_session_messages
    ADD CONSTRAINT agent_session_messages_kind_check
        CHECK (kind IN ('request', 'comment', 'redo', 'message', 'draft', 'reply', 'result'));

ALTER TABLE agent_session_messages
    ADD COLUMN result JSONB;
