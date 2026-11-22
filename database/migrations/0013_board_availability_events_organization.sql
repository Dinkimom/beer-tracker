-- События отсутствия (отпуск, больничный, дежурство) принадлежат организации.
--
-- Номер доски трекера уникален только внутри организации (teams: UNIQUE (organization_id,
-- tracker_board_id)), а таблица хранила только board_id: события двух организаций с досками
-- одного номера смешивались, и роут отдавал и удалял их без проверки организации.
--
-- Существующие строки получают организацию по команде с той же доской, если такая
-- организация одна. Строки доски, которая числится у нескольких организаций или ни у одной,
-- остаются без организации и больше не видны: отдать их всем — та же утечка.

ALTER TABLE board_availability_events
    ADD COLUMN organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE;

UPDATE board_availability_events e
   SET organization_id = owner.organization_id
  FROM (
        SELECT tracker_board_id, MIN(organization_id::text)::uuid AS organization_id
          FROM teams
         GROUP BY tracker_board_id
        HAVING COUNT(DISTINCT organization_id) = 1
       ) owner
 WHERE owner.tracker_board_id = e.board_id
   AND e.organization_id IS NULL;

DROP INDEX IF EXISTS idx_board_availability_events_board;
CREATE INDEX idx_board_availability_events_org_board
    ON board_availability_events (organization_id, board_id);
