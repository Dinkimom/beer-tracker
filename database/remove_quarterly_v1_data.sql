BEGIN;

-- Remove legacy quarterly planning v1 data structures.
DROP TABLE IF EXISTS beer_tracker.quarterly_plan_participants;
DROP TABLE IF EXISTS beer_tracker.vacation_entries;
DROP TABLE IF EXISTS beer_tracker.tech_sprint_entries;
DROP TABLE IF EXISTS beer_tracker.draft_tasks;
DROP TABLE IF EXISTS beer_tracker.planned_items;

COMMIT;
