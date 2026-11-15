-- Техспринты убраны из продукта: события доступности теперь только отпуск, больничный и дежурство
-- (docs/BUSINESS_RULES.md, A2; docs/QUARTERLY_PLAN_RULES.md, QV1).
--
-- Старые техспринты удаляются: показать их больше нечем, а превращать их в отпуск — значит выдумать
-- отсутствие, которого не было.
DELETE FROM board_availability_events WHERE event_type = 'tech_sprint';

-- CHECK-и, которые знают про техспринт: список видов события, список подвидов и связка «подвид есть
-- только у техспринта». В baseline имён у них нет, поэтому сначала по именам, которые даёт Postgres,
-- а потом всё, что осталось под другим именем, — по тексту условия.
ALTER TABLE board_availability_events
    DROP CONSTRAINT IF EXISTS board_availability_events_event_type_check,
    DROP CONSTRAINT IF EXISTS board_availability_events_tech_sprint_type_check,
    DROP CONSTRAINT IF EXISTS board_availability_events_check1;

DO $$
DECLARE
    stale_constraint TEXT;
BEGIN
    FOR stale_constraint IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'board_availability_events'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ~ '(tech_sprint|event_type)'
    LOOP
        EXECUTE format('ALTER TABLE board_availability_events DROP CONSTRAINT %I', stale_constraint);
    END LOOP;
END $$;

ALTER TABLE board_availability_events DROP COLUMN IF EXISTS tech_sprint_type;

ALTER TABLE board_availability_events
    ADD CONSTRAINT board_availability_events_event_type_check
    CHECK (event_type IN ('vacation', 'sick_leave', 'duty'));

COMMENT ON TABLE board_availability_events IS 'События доступности участников доски (отпуск, больничный, дежурство)';
