-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Расширение CHECK для упоминаний в заметках.
ALTER TABLE user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_kind_check;

ALTER TABLE user_notifications
  ADD CONSTRAINT user_notifications_kind_check CHECK (
    kind IN (
      'assignee_changed',
      'availability_changed',
      'comment_mention',
      'sprint_started',
      'sprint_finished'
    )
  );
