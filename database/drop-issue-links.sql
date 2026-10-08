-- Отказ от кэша issue_links: связи трекера не храним в BT (live overlay).
--   psql -v ON_ERROR_STOP=1 ... -f database/drop-issue-links.sql

DROP TABLE IF EXISTS beer_tracker.issue_links;
