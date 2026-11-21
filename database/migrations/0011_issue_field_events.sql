-- События задач трекера по полям плана: спринт, исполнитель, сроки, статус, оценки.
-- Источник — кеш changelog issue_changelog_events (одна строка JSONB на задачу, его же читает
-- строка факта). Одна строка представления — одно изменённое поле в одной записи changelog.
-- Нужна для истории изменений спринта: кто добавил или снял задачу, сдвинул сроки, сменил
-- исполнителя. Обновляется REFRESH MATERIALIZED VIEW CONCURRENTLY после синка changelog.
--
-- Значения полей в changelog разной формы (Yandex и нормализованный Jira): строка (даты),
-- объект { id, key, display } (статус, исполнитель), массив объектов (спринты), число (оценки).
-- *_ids — идентификаторы значения (id спринтов, исполнителя, дата строкой), *_text — подпись.

CREATE FUNCTION changelog_value_ids(v jsonb) RETURNS text[]
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT CASE jsonb_typeof(v)
        WHEN 'array' THEN ARRAY(
            SELECT COALESCE(x ->> 'id', x ->> 'key', x #>> '{}')
            FROM jsonb_array_elements(v) AS x
            WHERE jsonb_typeof(x) <> 'null'
        )
        WHEN 'object' THEN ARRAY_REMOVE(ARRAY[COALESCE(v ->> 'id', v ->> 'key', v ->> 'display')], NULL)
        WHEN 'string' THEN ARRAY[v #>> '{}']
        WHEN 'number' THEN ARRAY[v #>> '{}']
        ELSE '{}'::text[]
    END
$$;

CREATE FUNCTION changelog_value_text(v jsonb) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT CASE jsonb_typeof(v)
        WHEN 'array' THEN (
            SELECT string_agg(COALESCE(x ->> 'display', x ->> 'key', x ->> 'id', x #>> '{}'), ', ')
            FROM jsonb_array_elements(v) AS x
            WHERE jsonb_typeof(x) <> 'null'
        )
        WHEN 'object' THEN COALESCE(v ->> 'display', v ->> 'key', v ->> 'id')
        WHEN 'null' THEN NULL
        ELSE v #>> '{}'
    END
$$;

-- Кривая дата в одной записи не должна ронять REFRESH всего представления.
CREATE FUNCTION changelog_timestamptz(raw text) RETURNS timestamptz
LANGUAGE plpgsql STABLE PARALLEL SAFE AS $$
BEGIN
    RETURN raw::timestamptz;
EXCEPTION WHEN others THEN
    RETURN NULL;
END
$$;

CREATE MATERIALIZED VIEW issue_field_events AS
SELECT
    c.organization_id,
    c.issue_key,
    entry.ord::integer AS entry_ord,
    field.ord::integer AS field_ord,
    entry.value ->> 'id' AS entry_id,
    changelog_timestamptz(entry.value ->> 'updatedAt') AS changed_at,
    NULLIF(entry.value -> 'createdBy' ->> 'id', '') AS author_id,
    NULLIF(entry.value -> 'createdBy' ->> 'display', '') AS author_display,
    field.value -> 'field' ->> 'id' AS field,
    field.value -> 'from' AS from_value,
    field.value -> 'to' AS to_value,
    changelog_value_ids(field.value -> 'from') AS from_ids,
    changelog_value_ids(field.value -> 'to') AS to_ids,
    changelog_value_text(field.value -> 'from') AS from_text,
    changelog_value_text(field.value -> 'to') AS to_text
FROM issue_changelog_events AS c
CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(c.changelog) = 'array' THEN c.changelog ELSE '[]'::jsonb END
) WITH ORDINALITY AS entry (value, ord)
CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(entry.value -> 'fields') = 'array' THEN entry.value -> 'fields' ELSE '[]'::jsonb END
) WITH ORDINALITY AS field (value, ord)
WHERE field.value -> 'field' ->> 'id' IN (
    'assignee', 'deadline', 'sprint', 'start', 'status', 'storyPoints', 'testPoints'
)
  AND changelog_timestamptz(entry.value ->> 'updatedAt') IS NOT NULL;

-- Уникальный индекс обязателен для REFRESH ... CONCURRENTLY.
CREATE UNIQUE INDEX idx_issue_field_events_key
    ON issue_field_events (organization_id, issue_key, entry_ord, field_ord);

CREATE INDEX idx_issue_field_events_org_time
    ON issue_field_events (organization_id, changed_at DESC);

-- «Задачу добавили в спринт / сняли со спринта»: поиск по id спринта в from/to.
CREATE INDEX idx_issue_field_events_sprint_ids
    ON issue_field_events USING gin ((from_ids || to_ids))
    WHERE field = 'sprint';

COMMENT ON MATERIALIZED VIEW issue_field_events IS
    'События задач по полям плана из кеша changelog (спринт, исполнитель, сроки, статус, оценки); REFRESH CONCURRENTLY после синка';
