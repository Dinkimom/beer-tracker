-- Расширение CHECK для упоминаний в заметках.
ALTER TABLE beer_tracker.user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_kind_check;

ALTER TABLE beer_tracker.user_notifications
  ADD CONSTRAINT user_notifications_kind_check CHECK (
    kind IN (
      'assignee_changed',
      'availability_changed',
      'comment_mention',
      'sprint_started',
      'sprint_finished'
    )
  );
