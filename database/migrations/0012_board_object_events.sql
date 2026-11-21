-- Журнал изменений объектов доски, которых нет в трекере: заметки (comments), цели спринта
-- (sprint_goals) и стрелки (task_links). Задачи, сроки и спринты — в issue_field_events
-- (из changelog трекера), здесь их нет.
--
-- Пишут триггеры, поэтому событие появляется при любом пути записи. Кто и откуда правил,
-- триггер берёт из настроек транзакции (lib/boardHistory/boardEventActor.ts):
--   beer_tracker.actor_id      — id пользователя продукта;
--   beer_tracker.actor_channel — ui | agent | system;
--   beer_tracker.actor_brand   — клиент агента (claude, cursor…);
--   beer_tracker.board_events  — 'off' отключает запись (служебные пересчёты сетки).
-- Без настроек у заметок автор берётся из created_by / updated_by / deleted_by строки
-- (client_brand заметки — признак агента только при её создании), у целей и стрелок
-- автор остаётся пустым.
--
-- Шум схлопывается: события одного объекта в одной транзакции (пакетная перезапись
-- «удалить + вставить») и правки одного автора подряд в пределах 2 минут — одно событие.
-- before / after — только то, что видно на доске (без размеров, координат и версий).

CREATE TABLE board_object_events (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    object_kind TEXT NOT NULL CHECK (object_kind IN ('goal', 'link', 'note')),
    object_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('create', 'delete', 'update')),
    actor_id TEXT,
    channel TEXT CHECK (channel IN ('agent', 'system', 'ui')),
    client_brand VARCHAR(16) NOT NULL DEFAULT '',
    before JSONB,
    after JSONB,
    tx_id BIGINT NOT NULL DEFAULT txid_current(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_board_object_events_sprint
    ON board_object_events (organization_id, sprint_id, created_at DESC);

CREATE INDEX idx_board_object_events_object
    ON board_object_events (organization_id, object_kind, object_id, id DESC);

COMMENT ON TABLE board_object_events IS
    'История заметок, целей и стрелок доски (пишут триггеры; автор — из настроек транзакции beer_tracker.actor_*)';

-- Действие после склейки двух событий одного объекта; NULL — событий не осталось
-- (создали и тут же удалили).
CREATE FUNCTION board_event_merged_action(prev_action text, next_action text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT CASE
        WHEN prev_action = 'create' AND next_action = 'delete' THEN NULL
        WHEN prev_action = 'create' THEN 'create'
        WHEN next_action = 'delete' THEN 'delete'
        ELSE 'update'
    END
$$;

CREATE FUNCTION record_board_object_event(
    p_organization_id uuid,
    p_sprint_id integer,
    p_kind text,
    p_object_id text,
    p_action text,
    p_before jsonb,
    p_after jsonb,
    p_fallback_actor text,
    p_fallback_brand text
) RETURNS void
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
    v_actor text := COALESCE(NULLIF(current_setting('beer_tracker.actor_id', true), ''), p_fallback_actor);
    v_channel text := NULLIF(current_setting('beer_tracker.actor_channel', true), '');
    v_brand text := COALESCE(
        NULLIF(current_setting('beer_tracker.actor_brand', true), ''),
        NULLIF(p_fallback_brand, ''),
        ''
    );
    v_prev board_object_events%ROWTYPE;
    v_action text;
BEGIN
    IF current_setting('beer_tracker.board_events', true) = 'off' THEN
        RETURN;
    END IF;
    IF v_channel IS NULL AND v_brand <> '' THEN
        v_channel := 'agent';
    END IF;

    SELECT * INTO v_prev
    FROM board_object_events
    WHERE organization_id = p_organization_id
      AND sprint_id = p_sprint_id
      AND object_kind = p_kind
      AND object_id = p_object_id
      AND (
          tx_id = txid_current()
          OR (
              p_action = 'update'
              AND action IN ('create', 'update')
              AND actor_id IS NOT DISTINCT FROM v_actor
              AND channel IS NOT DISTINCT FROM v_channel
              AND created_at > CURRENT_TIMESTAMP - INTERVAL '2 minutes'
          )
      )
    ORDER BY id DESC
    LIMIT 1;

    IF NOT FOUND THEN
        IF p_action = 'update' AND p_before IS NOT DISTINCT FROM p_after THEN
            RETURN;
        END IF;
        INSERT INTO board_object_events (
            organization_id, sprint_id, object_kind, object_id, action,
            actor_id, channel, client_brand, before, after
        ) VALUES (
            p_organization_id, p_sprint_id, p_kind, p_object_id, p_action,
            v_actor, v_channel, v_brand, p_before, p_after
        );
        RETURN;
    END IF;

    v_action := board_event_merged_action(v_prev.action, p_action);
    IF v_action IS NULL
       OR (v_action = 'update' AND v_prev.before IS NOT DISTINCT FROM p_after) THEN
        DELETE FROM board_object_events WHERE id = v_prev.id;
        RETURN;
    END IF;
    UPDATE board_object_events
    SET action = v_action,
        after = p_after,
        actor_id = COALESCE(v_actor, actor_id),
        channel = COALESCE(v_channel, channel),
        client_brand = CASE WHEN v_brand <> '' THEN v_brand ELSE client_brand END,
        created_at = CURRENT_TIMESTAMP
    WHERE id = v_prev.id;
END
$$;

-- Заметка: видна на доске, когда подтверждена и не удалена. Черновик агента появляется
-- в истории в момент подтверждения; перенос в другой спринт — удаление здесь, создание там.
CREATE FUNCTION board_note_snapshot(c comments) RETURNS jsonb
LANGUAGE sql STABLE AS $$
    SELECT jsonb_build_object(
        'assigneeId', c.assignee_id,
        'color', c.color,
        'day', c.day,
        'kind', c.kind,
        'parent', c.parent,
        'part', c.part,
        'text', c.text
    )
$$;

CREATE FUNCTION comments_board_event() RETURNS trigger
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
    v_old_live boolean := false;
    v_new_live boolean := false;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        v_old_live := NOT OLD.pending_approval AND OLD.deleted_at IS NULL;
    END IF;
    IF TG_OP <> 'DELETE' THEN
        v_new_live := NOT NEW.pending_approval AND NEW.deleted_at IS NULL;
    END IF;

    IF v_old_live AND v_new_live AND OLD.sprint_id = NEW.sprint_id THEN
        PERFORM record_board_object_event(
            NEW.organization_id, NEW.sprint_id, 'note', NEW.id::text, 'update',
            board_note_snapshot(OLD), board_note_snapshot(NEW), NEW.updated_by::text, NULL
        );
        RETURN NULL;
    END IF;
    IF v_old_live THEN
        PERFORM record_board_object_event(
            OLD.organization_id, OLD.sprint_id, 'note', OLD.id::text, 'delete',
            board_note_snapshot(OLD), NULL,
            CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(NEW.deleted_by, NEW.updated_by)::text END,
            NULL
        );
    END IF;
    IF v_new_live THEN
        PERFORM record_board_object_event(
            NEW.organization_id, NEW.sprint_id, 'note', NEW.id::text, 'create',
            NULL, board_note_snapshot(NEW), NEW.created_by::text, NEW.client_brand
        );
    END IF;
    RETURN NULL;
END
$$;

CREATE TRIGGER comments_board_event
    AFTER INSERT OR UPDATE OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION comments_board_event();

CREATE FUNCTION board_goal_snapshot(g sprint_goals) RETURNS jsonb
LANGUAGE sql STABLE AS $$
    SELECT jsonb_build_object(
        'done', g.done,
        'goalType', g.goal_type,
        'planQuarter', g.plan_quarter,
        'planRowId', g.plan_row_id,
        'planYear', g.plan_year,
        'team', g.team,
        'text', g.text
    )
$$;

CREATE FUNCTION sprint_goals_board_event() RETURNS trigger
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM record_board_object_event(
            OLD.organization_id, OLD.sprint_id, 'goal', OLD.id::text, 'delete',
            board_goal_snapshot(OLD), NULL, NULL, NULL
        );
    ELSIF TG_OP = 'INSERT' THEN
        PERFORM record_board_object_event(
            NEW.organization_id, NEW.sprint_id, 'goal', NEW.id::text, 'create',
            NULL, board_goal_snapshot(NEW), NULL, NULL
        );
    ELSE
        PERFORM record_board_object_event(
            NEW.organization_id, NEW.sprint_id, 'goal', NEW.id::text, 'update',
            board_goal_snapshot(OLD), board_goal_snapshot(NEW), NULL, NULL
        );
    END IF;
    RETURN NULL;
END
$$;

CREATE TRIGGER sprint_goals_board_event
    AFTER INSERT OR UPDATE OR DELETE ON sprint_goals
    FOR EACH ROW EXECUTE FUNCTION sprint_goals_board_event();

-- Стрелка: важны только концы; смена якоря (сторона карточки) в историю не идёт.
CREATE FUNCTION task_links_board_event() RETURNS trigger
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM record_board_object_event(
            OLD.organization_id, OLD.sprint_id, 'link', OLD.id, 'delete',
            jsonb_build_object('fromTaskId', OLD.from_task_id, 'toTaskId', OLD.to_task_id), NULL, NULL, NULL
        );
    ELSIF TG_OP = 'INSERT' THEN
        PERFORM record_board_object_event(
            NEW.organization_id, NEW.sprint_id, 'link', NEW.id, 'create',
            NULL, jsonb_build_object('fromTaskId', NEW.from_task_id, 'toTaskId', NEW.to_task_id), NULL, NULL
        );
    ELSE
        PERFORM record_board_object_event(
            NEW.organization_id, NEW.sprint_id, 'link', NEW.id, 'update',
            jsonb_build_object('fromTaskId', OLD.from_task_id, 'toTaskId', OLD.to_task_id),
            jsonb_build_object('fromTaskId', NEW.from_task_id, 'toTaskId', NEW.to_task_id), NULL, NULL
        );
    END IF;
    RETURN NULL;
END
$$;

CREATE TRIGGER task_links_board_event
    AFTER INSERT OR UPDATE OR DELETE ON task_links
    FOR EACH ROW EXECUTE FUNCTION task_links_board_event();
